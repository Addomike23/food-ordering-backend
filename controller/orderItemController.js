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
    // 4. SUBTOTAL (SERVER TRUST)
    // ===============================
    const subtotal = order.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // ===============================
    // 5. IMAGE NORMALIZER (17 DEC FIX)
    // ===============================
    const normalizeImage = (image) => {
      if (!image) {
        return "https://res.cloudinary.com/demo/image/upload/v1690000000/placeholder.png";
      }

      if (image.startsWith("https://")) return image;
      if (image.startsWith("res.cloudinary.com")) return `https://${image}`;

      return "https://res.cloudinary.com/demo/image/upload/v1690000000/placeholder.png";
    };

    // ===============================
    // 6. BUILD ATTACHMENTS (NO AXIOS)
    // ===============================
    const attachments = order.items.map((item, index) => ({
      filename: `${item.name.replace(/\s+/g, "_")}-${index + 1}.jpg`,
      path: normalizeImage(item.image), // 🔑 nodemailer fetches it
    }));

    // ===============================
    // 7. ADMIN ITEMS TABLE (TEXT ONLY)
    // ===============================
    const adminItemsHtml = order.items
      .map(
        item => `
        <tr>
          <td style="border:1px solid #ddd;padding:6px;">
            ${item.name}
          </td>
          <td align="center" style="border:1px solid #ddd;padding:6px;">
            ${item.quantity}
          </td>
          <td align="right" style="border:1px solid #ddd;padding:6px;">
            ₵${(item.price * item.quantity).toFixed(2)}
          </td>
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

      <h3>Ordered Items</h3>

      <table width="100%" cellpadding="8" cellspacing="0"
        style="border-collapse:collapse;border:1px solid #ddd;">
        <thead>
          <tr style="background:#f5f5f5;">
            <th>Product</th>
            <th>Qty</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${adminItemsHtml}
        </tbody>
      </table>

      <h3 style="margin-top:15px;">
        Order Total: ₵${subtotal.toFixed(2)}
      </h3>

      <p>
        <em>Product images are attached to this email.</em>
      </p>
    `;

    // ===============================
    // 9. SEND ADMIN MAIL (WITH IMAGES)
    // ===============================
    await transporter.sendMail({
      from: `"Website Orders" <${process.env.EMAIL}>`,
      to: process.env.EMAIL,
      subject: `New Order - ${order.orderNumber}`,
      html: adminHtml,
      attachments, // ✅ 17 DEC WORKING METHOD
    });

    // ===============================
    // 10. CUSTOMER RECEIPT (NO IMAGES)
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