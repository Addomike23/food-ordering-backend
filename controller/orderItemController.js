const orderModel = require("../model/orderModel");
const { orderValidator } = require("../middleware/validator");
const transporter = require("../middleware/nodemailer");
const crypto = require("crypto");
const connectDB = require('../utils/connectDB')



// CREATE ORDER
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
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:700px;margin:auto;">
    <h2 style="margin-bottom:10px;">New Order Received</h2>

    <table width="100%" cellpadding="6" cellspacing="0"
      style="border-collapse:collapse;margin-bottom:15px;">
      <tr>
        <td><strong>Order Number:</strong></td>
        <td>${order.orderNumber}</td>
      </tr>
      <tr>
        <td><strong>Customer:</strong></td>
        <td>${order.customerInfo.name}</td>
      </tr>
      <tr>
        <td><strong>Phone:</strong></td>
        <td>${order.customerInfo.phone}</td>
      </tr>
      <tr>
        <td><strong>Email:</strong></td>
        <td>${order.customerInfo.email || "N/A"}</td>
      </tr>
    </table>

    <h3 style="margin:10px 0;">Ordered Items</h3>

    <table width="100%" cellpadding="8" cellspacing="0"
      style="border-collapse:collapse;border:1px solid #ddd;">

      <thead>
        <tr style="background:#f5f5f5;">
          <th align="left" style="border:1px solid #ddd;">Image</th>
          <th align="left" style="border:1px solid #ddd;">Product</th>
          <th align="center" style="border:1px solid #ddd;">Qty</th>
          <th align="right" style="border:1px solid #ddd;">Price</th>
        </tr>
      </thead>

      <tbody>
        ${order.items.map(item => `
          <tr>
            <td style="border:1px solid #ddd;padding:4px;">
              <img
                src="${item.image}"
                alt="${item.name}"
                width="60"
                height="60"
                style="display:block;border-radius:4px;"
              />
            </td>
            <td style="border:1px solid #ddd;">${item.name}</td>
            <td align="center" style="border:1px solid #ddd;">
              ${item.quantity}
            </td>
            <td align="right" style="border:1px solid #ddd;">
              ₵${item.price * item.quantity}
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <h3 style="margin-top:15px;text-align:right;">
      Order Total: ₵${subtotal}
    </h3>
  </div>
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


// GET ALL
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

const deleteAllOrders = async (req, res) => {
  try {
    await connectDB();

    const result = await orderModel.deleteMany({});

    res.status(200).json({
      success: true,
      message: "All orders deleted successfully",
      deletedCount: result.deletedCount
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete all orders",
      error: error.message
    });
  }
};


module.exports = {createOrder, getOrders, deleteAllOrders}