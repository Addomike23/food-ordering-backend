const orderModel = require("../model/orderModel");
const { orderValidator } = require("../middleware/validator");
const transporter = require("../middleware/nodemailer");
const crypto = require("crypto");
const connectDB = require('../utils/connectDB')

const createOrder = async (req, res) => {
  try {
    await connectDB();

    // 1. Validate request body
    const { error, value } = orderValidator.validate(req.body, {
      abortEarly: false
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details.map(d => d.message)
      });
    }

    // 2. Generate order number
    const orderNumber = `ORD-${crypto
      .randomBytes(4)
      .toString("hex")
      .toUpperCase()}`;

    // 3. Save order
    const order = await orderModel.create({
      orderNumber,
      ...value
    });

    // ===============================
    // RECEIPT CALCULATIONS
    // ===============================
    const subtotal = order.items.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    );

    // ===============================
    // ITEMS TABLE
    // ===============================
    const itemsHtml = order.items
      .map(
        item => `
      <tr>
        <td>${item.name}</td>
        <td>${item.quantity}</td>
        <td>₵${item.price}</td>
        <td>₵${item.totalPrice}</td>
      </tr>
    `
      )
      .join("");

    // ===============================
    // CUSTOMER RECEIPT EMAIL
    // ===============================
    const receiptHtml = `
      <div style="font-family:Arial;max-width:600px;margin:auto">
        <h2 style="text-align:center">Naya Axis Foods</h2>
        <p style="text-align:center">Order Receipt</p>

        <hr/>

        <p><strong>Order Number:</strong> ${order.orderNumber}</p>
        <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>

        <h3>Customer Details</h3>
        <p>
          ${order.customerInfo.name}<br/>
          ${order.customerInfo.phone}<br/>
          ${order.customerInfo.email || ""}
        </p>

        <h3>Order Summary</h3>
        <table width="100%" border="1" cellpadding="8" cellspacing="0">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <h3 style="text-align:right">Grand Total: ₵${subtotal}</h3>

        <p>
          Delivery Type: ${order.customerInfo.deliveryType}<br/>
          Payment Method: ${order.customerInfo.paymentMethod}
        </p>

        <hr/>
        <p style="text-align:center">
          Thank you for ordering from Naya Axis Foods.
        </p>
      </div>
    `;

    // ===============================
    // ADMIN EMAIL
    // ===============================
    const adminHtml = `
      <h2>New Order Received</h2>
      <p><strong>Order:</strong> ${order.orderNumber}</p>
      <p><strong>Customer:</strong> ${order.customerInfo.name}</p>
      <p><strong>Phone:</strong> ${order.customerInfo.phone}</p>
      <p><strong>Total:</strong> ₵${subtotal}</p>
    `;

    // ===============================
    // SEND EMAILS
    // ===============================

    // Admin notification
    await transporter.sendMail({
      from: `"Website Orders" <${process.env.EMAIL}>`,
      to: process.env.EMAIL,
      subject: `New Order - ${order.orderNumber}`,
      html: adminHtml
    });

    // Customer receipt (only if email exists)
    if (order.customerInfo.email) {
      await transporter.sendMail({
        from: `"Naya Axis Foods" <${process.env.EMAIL}>`,
        to: order.customerInfo.email,
        subject: `Your Receipt - ${order.orderNumber}`,
        html: receiptHtml
      });
    }

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again."
    });
  }
};

const getOrders = async (req, res) => {
  try {
    await connectDB();

    const orders = await orderModel
      .find({})
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message
    });
  }
};


module.exports = {createOrder, getOrders}