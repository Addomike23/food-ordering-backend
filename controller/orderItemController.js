const orderModel = require("../model/orderModel");
const { orderValidator } = require("../middleware/validator");
const transporter = require("../middleware/nodemailer");
const crypto = require("crypto");
const connectDB = require('../utils/connectDB')


const createOrder = async (req, res) => {
  try {
    await connectDB();

    // ===============================
    // 1. VALIDATION
    // ===============================
    const { error, value } = orderValidator.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details.map(d => d.message),
      });
    }

    // ===============================
    // 2. ORDER NUMBER
    // ===============================
    const orderNumber = `ORD-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    // ===============================
    // 3. NORMALIZE ITEMS
    // ===============================
    const normalizedItems = value.items.map(item => ({
      ...item,
      totalPrice: item.price * item.quantity,
      images: item.images && item.images.length
        ? item.images
        : ["https://res.cloudinary.com/demo/image/upload/w_400,q_auto/placeholder.png"]
    }));

    // ===============================
    // 4. SAVE ORDER
    // ===============================
    const order = await orderModel.create({
      orderNumber,
      ...value,
      items: normalizedItems
    });

    // ===============================
    // 5. CALCULATE SUBTOTAL
    // ===============================
    const subtotal = order.items.reduce((sum, item) => sum + item.totalPrice, 0);

    // ===============================
    // 6. BUILD ADMIN ITEMS TABLE HTML
    // ===============================
    const adminItemsHtml = order.items.map(item => `
      <tr style="border-bottom:1px solid #ddd">
        <td style="padding:8px;vertical-align:middle">
          ${item.images.map(img => `<img src="${img}" width="50" height="50" style="object-fit:cover;margin-right:6px;vertical-align:middle"/>`).join('')}
          ${item.name}
        </td>
        <td style="padding:8px;text-align:center">${item.quantity}</td>
       
      </tr>
    `).join("");

    // ===============================
    // 7. ADMIN EMAIL HTML (MOBILE-FRIENDLY)
    // ===============================
    const adminHtml = `
      <div style="max-width:640px;margin:auto;background:#fff;font-family:Arial,sans-serif;border-radius:10px;overflow:hidden">
        <div style="padding:16px;background:#1b5e20;color:#fff;text-align:center">
          <h2 style="margin:0;font-size:24px">New Order Received</h2>
        </div>
        <div style="padding:16px;color:#333;font-size:14px;line-height:1.4">
          <p><strong>Order Number:</strong> ${order.orderNumber}</p>
          <p><strong>Customer:</strong> ${order.customerInfo.name}</p>
          <p><strong>Phone:</strong> ${order.customerInfo.phone}</p>
          <p><strong>Email:</strong> ${order.customerInfo.email || "N/A"}</p>

          <table style="width:100%;border-collapse:collapse;margin-top:12px">
            <thead>
              <tr style="background:#f2f2f2">
                <th style="padding:8px;text-align:left">Product</th>
                <th style="padding:8px;text-align:center">Qty</th>
            
              </tr>
            </thead>
            <tbody>
              ${adminItemsHtml}
            </tbody>
          </table>


        </div>
      </div>
    `;

    // ===============================
    // 8. SEND ADMIN EMAIL
    // ===============================
    await transporter.sendMail({
      from: `"Website Orders" <${process.env.EMAIL}>`,
      to: process.env.EMAIL,
      subject: `New Order - ${order.orderNumber}`,
      html: adminHtml
    });

    // ===============================
    // 9. CUSTOMER EMAIL HTML (MOBILE-FRIENDLY)
    // ===============================
    if (order.customerInfo.email) {
      const customerItemsHtml = order.items.map(item => `
        <tr style="border-bottom:1px solid #ddd">
          <td style="padding:8px;vertical-align:middle">
            ${item.images.map(img => `<img src="${img}" width="50" height="50" style="object-fit:cover;margin-right:6px;vertical-align:middle"/>`).join('')}
            ${item.name}
          </td>
          <td style="padding:8px;text-align:center">${item.quantity}</td>
         
        </tr>
      `).join("");

      const customerHtml = `
        <div style="max-width:640px;margin:auto;background:#fff;font-family:Arial,sans-serif;border-radius:10px;overflow:hidden">
          <div style="padding:16px;background:#1b5e20;color:#fff;text-align:center">
            <h2 style="margin:0;font-size:22px">Thank you for your order!</h2>
          </div>
          <div style="padding:16px;color:#333;font-size:14px;line-height:1.4">
            <p>Hi ${order.customerInfo.name},</p>
            <p>We have received your order <strong>${order.orderNumber}</strong>.</p>

            <table style="width:100%;border-collapse:collapse;margin-top:12px">
              <thead>
                <tr style="background:#f2f2f2">
                  <th style="padding:8px;text-align:left">Product</th>
                  <th style="padding:8px;text-align:center">Qty</th>
                 
                </tr>
              </thead>
              <tbody>
                ${customerItemsHtml}
              </tbody>
            </table>


          </div>
        </div>
      `;

      await transporter.sendMail({
        from: `"Naya Axis Foods" <${process.env.EMAIL}>`,
        to: order.customerInfo.email,
        subject: `Your Receipt - ${order.orderNumber}`,
        html: customerHtml
      });
    }

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order
    });

  } catch (err) {
    console.error("CREATE ORDER ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
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