const orderModel = require("../model/orderModel");
const { orderValidator } = require("../middleware/validator");
const transporter = require("../middleware/nodemailer");
const crypto = require("crypto");
const connectDB = require('../utils/connectDB')




const MAX_ATTACHMENTS = 5;
const MAX_TOTAL_MB = 5;
const CLOUDINARY_MAX_WIDTH = 400;

const createOrder = async (req, res) => {
  try {
    await connectDB();

    // ===============================
    // 1. VALIDATION
    // ===============================
    const { error, value } = orderValidator.validate(req.body, {
      abortEarly: false,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details.map(d => d.message),
      });
    }

    // ===============================
    // 2. ORDER NUMBER
    // ===============================
    const orderNumber = `ORD-${crypto
      .randomBytes(4)
      .toString("hex")
      .toUpperCase()}`;

    // ===============================
    // 3. SAVE ORDER
    // ===============================
    const order = await orderModel.create({
      orderNumber,
      ...value,
    });

    // ===============================
    // 4. SUBTOTAL
    // ===============================
    const subtotal = order.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // ===============================
    // 5. IMAGE NORMALIZER
    // ===============================
    const normalizeImage = (image) => {
      if (!image || !image.includes("res.cloudinary.com")) {
        return "https://res.cloudinary.com/demo/image/upload/w_400,q_auto/placeholder.png";
      }

      return image.replace(
        "/upload/",
        `/upload/w_${CLOUDINARY_MAX_WIDTH},q_auto/`
      );
    };

    // ===============================
    // 6. BUILD ADMIN ATTACHMENTS
    // ===============================
    let totalEstimatedMb = 0;
    const attachments = [];

    for (let i = 0; i < order.items.length; i++) {
      if (attachments.length >= MAX_ATTACHMENTS) break;

      const estimatedMb = 0.15;
      if (totalEstimatedMb + estimatedMb > MAX_TOTAL_MB) break;

      attachments.push({
        filename: `${order.items[i].name.replace(/\s+/g, "_")}-${i + 1}.jpg`,
        path: normalizeImage(order.items[i].image),
      });

      totalEstimatedMb += estimatedMb;
    }

    // ===============================
    // 7. ADMIN ITEMS TABLE (TEXT)
    // ===============================
    const adminItemsHtml = order.items
      .map(
        item => `
        <tr>
          <td>${item.name}</td>
          <td align="center">${item.quantity}</td>
          <td align="right">₵${(item.price * item.quantity).toFixed(2)}</td>
        </tr>
      `
      )
      .join("");

    // ===============================
    // 8. ADMIN EMAIL
    // ===============================
    const adminHtml = `
      <h2>New Order Received</h2>

      <p><strong>Order Number:</strong> ${order.orderNumber}</p>
      <p><strong>Customer:</strong> ${order.customerInfo.name}</p>
      <p><strong>Phone:</strong> ${order.customerInfo.phone}</p>
      <p><strong>Email:</strong> ${order.customerInfo.email || "N/A"}</p>

      <table border="1" cellpadding="6" cellspacing="0" width="100%">
        <thead>
          <tr>
            <th>Product</th>
            <th>Qty</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${adminItemsHtml}
        </tbody>
      </table>

      <h3>Order Total: ₵${subtotal.toFixed(2)}</h3>
      <p><em>Product images are attached.</em></p>
    `;

    // ===============================
    // 9. SEND ADMIN EMAIL (WITH ATTACHMENTS)
    // ===============================
    await transporter.sendMail({
      from: `"Website Orders" <${process.env.EMAIL}>`,
      to: process.env.EMAIL,
      subject: `New Order - ${order.orderNumber}`,
      html: adminHtml,
      attachments,
    });

    // ===============================
    // 10. CUSTOMER EMAIL (NO ATTACHMENTS)
    // ===============================
    if (order.customerInfo.email) {
      await transporter.sendMail({
        from: `"Naya Axis Foods" <${process.env.EMAIL}>`,
        to: order.customerInfo.email,
        subject: `Your Receipt - ${order.orderNumber}`,
        html: `
          <p>Thank you for your order.</p>
          <p><strong>Order Number:</strong> ${order.orderNumber}</p>
          <p><strong>Total:</strong> ₵${subtotal.toFixed(2)}</p>
        `,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order,
    });

  } catch (err) {
    console.error("CREATE ORDER ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
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