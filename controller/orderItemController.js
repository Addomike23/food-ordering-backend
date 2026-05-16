const orderModel = require("../model/orderModel");
const productModel = require("../model/productModel");
const { orderValidator } = require("../middleware/validator");
const transporter = require("../middleware/nodemailer");
const crypto = require("crypto");
const connectDB = require('../utils/connectDB');
const recommendationEngine = require('../services/recommendationEngine');


// ForksUp Website URL
const FORKSUP_URL = 'https://foodorderio.vercel.app/';

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
    // 4. PREPARE ORDER DATA WITH PAYSTACK SUPPORT
    // ===============================
    const orderData = {
      orderNumber,
      ...value,
      items: normalizedItems
    };

    // Add Paystack payment fields if payment was made
    if (value.paymentStatus === 'paid' && value.paymentReference) {
      orderData.paymentStatus = value.paymentStatus;
      orderData.paymentReference = value.paymentReference;
      orderData.paidAt = value.paidAt || new Date();
      orderData.paymentGateway = 'paystack';
      
      if (value.paymentDetails) {
        orderData.paymentDetails = value.paymentDetails;
      }
    }

    // ===============================
    // 5. SAVE ORDER
    // ===============================
    const order = await orderModel.create(orderData);

    // ===============================
    // 6. UPDATE PRODUCT POPULARITY
    // ===============================
    for (const item of normalizedItems) {
      if (item.productId) {
        await recommendationEngine.updateProductPopularity(item.productId);
      } else {
        const product = await productModel.findOne({ name: item.name });
        if (product) {
          await recommendationEngine.updateProductPopularity(product._id);
        }
      }
    }
    console.log(`📊 Updated popularity for ${normalizedItems.length} products`);

    // ===============================
    // 7. CALCULATE TOTALS (GHS CURRENCY)
    // ===============================
    const subtotal = order.items.reduce((sum, item) => sum + item.totalPrice, 0);
    const deliveryFee = order.customerInfo.deliveryType === 'delivery' ? 15 : 0;
    const tax = subtotal * 0.025;
    const totalAmount = subtotal + deliveryFee + tax;

    // ===============================
    // 8. BUILD ADMIN ITEMS TABLE HTML
    // ===============================
    const adminItemsHtml = order.items.map(item => `
      <tr style="border-bottom:1px solid #ddd">
        <td style="padding:12px;vertical-align:middle">
          ${item.images.map(img => `<img src="${img}" width="50" height="50" style="object-fit:cover;margin-right:6px;vertical-align:middle;border-radius:8px"/>`).join('')}
          <strong>${item.name}</strong><br/>
          <span style="color:#666;font-size:12px">${item.category || 'Food Item'}</span>
        </td>
        <td style="padding:12px;text-align:center">${item.quantity}</td>
        <td style="padding:12px;text-align:right">GH₵${(item.price).toFixed(2)}</td>
        <td style="padding:12px;text-align:right"><strong>GH₵${(item.totalPrice).toFixed(2)}</strong></td>
      </tr>
    `).join("");

    // ===============================
    // 9. ADMIN EMAIL HTML (UNCHANGED)
    // ===============================
    const adminHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Order - ${order.orderNumber}</title>
      </head>
      <body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f0f2f5;">
        <div style="max-width:700px;margin:40px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.08)">
          <div style="background:linear-gradient(135deg,#ff6b35 0%,#ff8c42 100%);padding:35px 30px;text-align:center">
            <div style="font-size:48px;margin-bottom:10px;">🍽️</div>
            <h1 style="margin:0;color:#fff;font-size:28px">ForksUp - New Order!</h1>
            <p style="margin:10px 0 0;color:#fff3e0;font-size:16px">Order #${order.orderNumber}</p>
          </div>
          <div style="padding:30px">
            <div style="background:#f8faf8;padding:20px;border-radius:16px;margin-bottom:25px">
              <h2 style="margin:0 0 15px 0;color:#ff6b35;font-size:18px">👤 Customer Information</h2>
              <table style="width:100%">
                <tr><td style="padding:6px 0"><strong>Name:</strong></td><td>${order.customerInfo.name}</td></tr>
                <tr><td style="padding:6px 0"><strong>Phone:</strong></td><td>${order.customerInfo.phone}</td></tr>
                ${order.customerInfo.email ? `<tr><td style="padding:6px 0"><strong>Email:</strong></td><td>${order.customerInfo.email}</td></tr>` : ''}
                <tr><td style="padding:6px 0"><strong>Delivery:</strong></td><td>${order.customerInfo.deliveryType === 'delivery' ? '🚚 Home Delivery' : '🏪 Store Pickup'}</td></tr>
                ${order.customerInfo.address ? `<tr><td style="padding:6px 0"><strong>Address:</strong></td><td>${order.customerInfo.address}</td></tr>` : ''}
                <tr><td style="padding:6px 0"><strong>Payment:</strong></td>
                  <td style="padding:6px 0">
                    ${order.customerInfo.paymentMethod === 'cash' ? '💰 Cash on Delivery' : 
                      order.paymentStatus === 'paid' ? '💳 Card Payment (Paid)' : '💳 Card Payment'}
                  </td>
                </tr>
                ${order.paymentReference ? `
                <tr>
                  <td style="padding:6px 0"><strong>Payment Ref:</strong></td>
                  <td style="padding:6px 0;font-size:12px">${order.paymentReference}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            <h2 style="margin:0 0 15px 0;color:#ff6b35;font-size:18px">📦 Order Items</h2>
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
              <thead><tr style="background:#f0f2f0"><th style="padding:12px;text-align:left">Product</th><th style="padding:12px;text-align:center">Qty</th><th style="padding:12px;text-align:right">Price</th><th style="padding:12px;text-align:right">Total</th></tr></thead>
              <tbody>${adminItemsHtml}</tbody>
              <tfoot>
                <tr style="background:#f8faf8"><td colspan="3" style="padding:12px;text-align:right"><strong>Subtotal:</strong></td><td style="padding:12px;text-align:right">GH₵${subtotal.toFixed(2)}</td></tr>
                <tr style="background:#f8faf8"><td colspan="3" style="padding:12px;text-align:right"><strong>Delivery Fee:</strong></td><td style="padding:12px;text-align:right">GH₵${deliveryFee.toFixed(2)}</td></tr>
                <tr style="background:#f8faf8"><td colspan="3" style="padding:12px;text-align:right"><strong>Tax (2.5%):</strong></td><td style="padding:12px;text-align:right">GH₵${tax.toFixed(2)}</td></tr>
                <tr style="background:linear-gradient(135deg,#ff6b35 0%,#ff8c42 100%);color:#fff"><td colspan="3" style="padding:15px;text-align:right"><strong>TOTAL:</strong></td><td style="padding:15px;text-align:right"><strong>GH₵${totalAmount.toFixed(2)}</strong></td></tr>
              </tfoot>
            20cean
            <div style="text-align:center;margin-top:25px">
              <a href="${FORKSUP_URL}/admin/orders" style="background:#ff6b35;color:#fff;padding:12px 30px;text-decoration:none;border-radius:30px;display:inline-block">📊 View Dashboard →</a>
            </div>
          </div>
          <div style="background:#f8faf8;padding:20px;text-align:center;border-top:1px solid #e0e5e0">
            <p style="margin:0;color:#666;font-size:12px">🍔 ForksUp - Delicious Meals, Happy Customers</p>
            <p style="margin:10px 0 0;color:#999;font-size:12px">© ${new Date().getFullYear()} ForksUp. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // ===============================
    // 10. SEND ADMIN EMAIL (Skip if payment failed)
    // ===============================
    if (order.paymentStatus !== 'failed') {
      await transporter.sendMail({
        from: `"ForksUp Orders" <${process.env.EMAIL}>`,
        to: process.env.EMAIL,
        subject: `🍽️ NEW ORDER - ${order.orderNumber} - ForksUp`,
        html: adminHtml
      });
    }

    // ===============================
    // 11. CUSTOMER EMAIL HTML (UNCHANGED)
    // ===============================
    if (order.customerInfo.email && order.paymentStatus !== 'failed') {
      const customerItemsHtml = order.items.map(item => `
        <tr style="border-bottom:1px solid #ddd">
          <td style="padding:12px;vertical-align:middle">
            ${item.images.map(img => `<img src="${img}" width="50" height="50" style="object-fit:cover;margin-right:6px;vertical-align:middle;border-radius:8px"/>`).join('')}
            <strong>${item.name}</strong>
          </td>
          <td style="padding:12px;text-align:center">${item.quantity}</td>
          <td style="padding:12px;text-align:right">GH₵${(item.price).toFixed(2)}</td>
          <td style="padding:12px;text-align:right"><strong>GH₵${(item.totalPrice).toFixed(2)}</strong></td>
        </tr>
      `).join("");

      const customerHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Confirmation - ${order.orderNumber}</title>
        </head>
        <body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f0f2f5;">
          <div style="max-width:700px;margin:40px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.08)">
            <div style="background:linear-gradient(135deg,#ff6b35 0%,#ff8c42 100%);padding:35px 30px;text-align:center">
              <div style="font-size:56px;margin-bottom:10px;">🎉</div>
              <h1 style="margin:0;color:#fff;font-size:28px">Thank You for Your Order!</h1>
              <p style="margin:10px 0 0;color:#fff3e0;font-size:16px">Order #${order.orderNumber}</p>
            </div>
            <div style="padding:30px">
              <p>Dear <strong>${order.customerInfo.name}</strong>,</p>
              <p>Thank you for choosing <strong style="color:#ff6b35;">ForksUp</strong>! Your order has been received and is being processed.</p>
              
              <div style="background:#f8faf8;padding:20px;border-radius:16px;margin:20px 0">
                <h3 style="margin:0 0 15px 0;color:#ff6b35">📋 Order Summary</h3>
                <table style="width:100%">
                  <tr><td style="padding:6px 0"><strong>Order Number:</strong><\/td><td>${order.orderNumber}<\/td><\/tr>
                  <tr><td style="padding:6px 0"><strong>Order Date:</strong><\/td><td>${new Date(order.createdAt).toLocaleString()}<\/td><\/tr>
                  <tr><td style="padding:6px 0"><strong>Delivery:</strong><\/td><td>${order.customerInfo.deliveryType === 'delivery' ? '🚚 Home Delivery' : '🏪 Store Pickup'}<\/td><\/tr>
                  ${order.paymentStatus === 'paid' ? `<tr><td style="padding:6px 0"><strong>Payment:</strong><\/td><td>✅ Paid via Card<\/td><\/tr>` : ''}
                20cean
              </div>
              
              <h3 style="margin:0 0 15px 0;color:#ff6b35">🛒 Your Items</h3>
              <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
                <thead><tr style="background:#f0f2f0"><th style="padding:12px;text-align:left">Product</th><th style="padding:12px;text-align:center">Qty</th><th style="padding:12px;text-align:right">Price</th><th style="padding:12px;text-align:right">Total</th></tr></thead>
                <tbody>${customerItemsHtml}</tbody>
                <tfoot>
                  <tr style="background:#f8faf8"><td colspan="3" style="padding:12px;text-align:right"><strong>Subtotal:</strong><\/td><td style="padding:12px;text-align:right">GH₵${subtotal.toFixed(2)}<\/strong><\/td><\/tr>
                  <tr style="background:#f8faf8"><td colspan="3" style="padding:12px;text-align:right"><strong>Delivery:</strong><\/td><td style="padding:12px;text-align:right">GH₵${deliveryFee.toFixed(2)}<\/strong><\/td><\/tr>
                  <tr style="background:#f8faf8"><td colspan="3" style="padding:12px;text-align:right"><strong>Tax (2.5%):</strong><\/td><td style="padding:12px;text-align:right">GH₵${tax.toFixed(2)}<\/strong><\/td><\/tr>
                  <tr style="background:linear-gradient(135deg,#ff6b35 0%,#ff8c42 100%);color:#fff"><td colspan="3" style="padding:15px;text-align:right"><strong>TOTAL:</strong><\/td><td style="padding:15px;text-align:right"><strong>GH₵${totalAmount.toFixed(2)}<\/strong><\/td><\/tr>
                </tfoot>
              20cean
              
              <div style="text-align:center;margin:30px 0">
                <a href="${FORKSUP_URL}/track-order/${order.orderNumber}" style="background:#ff6b35;color:#fff;padding:14px 35px;text-decoration:none;border-radius:30px;display:inline-block;font-weight:bold">🚀 Track Your Order Live</a>
              </div>
              
              <div style="background:#fff9f0;padding:15px;border-radius:12px;margin:20px 0;text-align:center">
                <p style="margin:0;color:#ff6b35;font-size:14px">💡 <strong>ForksUp Rewards</strong></p>
                <p style="margin:5px 0 0;color:#555;font-size:13px">Eat more, save more! Earn points on every order.</p>
              </div>
              
              <div style="background:#f0f2f0;padding:15px;border-radius:12px;text-align:center">
                <p style="margin:0;color:#555;font-size:13px">📞 Need help? Contact us at ${process.env.SUPPORT_PHONE || '+233 XXX XXX XXXX'}</p>
                <p style="margin:5px 0 0;color:#555;font-size:13px">🌐 Visit us: <a href="${FORKSUP_URL}" style="color:#ff6b35;">${FORKSUP_URL}</a></p>
              </div>
            </div>
            <div style="background:#f8faf8;padding:20px;text-align:center;border-top:1px solid #e0e5e0">
              <p style="margin:0;color:#666;font-size:12px">🍔 ForksUp - Delicious Meals, Happy Customers</p>
              <p style="margin:10px 0 0;color:#999;font-size:12px">© ${new Date().getFullYear()} ForksUp. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await transporter.sendMail({
        from: `"ForksUp" <${process.env.EMAIL}>`,
        to: order.customerInfo.email,
        subject: `✅ Order Confirmed - ${order.orderNumber} - ForksUp`,
        html: customerHtml
      });
    }

    // ===============================
    // 12. SOCKET.IO REAL-TIME NOTIFICATION
    // ===============================
    const socketService = req.app.get('socketService');
    if (socketService && order.paymentStatus !== 'failed') {
      socketService.emitNewOrder(order);
      if (order.customerInfo.phone) {
        socketService.notifyUser(order.customerInfo.phone, 'order-confirmation', {
          orderNumber: order.orderNumber,
          status: order.status,
          message: `Your ForksUp order ${order.orderNumber} has been placed successfully!`,
          items: order.items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            totalPrice: item.totalPrice,
            images: item.images
          })),
          subtotal, deliveryFee, tax, totalAmount
        });
      }
      console.log(`🔔 Socket notification sent for order: ${order.orderNumber}`);
    }

    // ===============================
    // 13. GET RECOMMENDATIONS
    // ===============================
    let recommendations = [];
    try {
      recommendations = await recommendationEngine.getPersonalizedRecommendations(
        { phone: order.customerInfo.phone }, 5
      );
    } catch (recError) {
      console.error("Failed to fetch recommendations:", recError);
    }

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentReference: order.paymentReference,
        paidAt: order.paidAt,
        customerInfo: order.customerInfo,
        items: order.items,
        subtotal, deliveryFee, tax, totalAmount,
        createdAt: order.createdAt
      },
      recommendations
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

// GET ALL ORDERS
const getOrders = async (req, res) => {
  try {
    await connectDB();
    const orders = await orderModel.find({}).sort({ createdAt: -1 }).lean();
    res.status(200).json({ success: true, count: orders.length, orders });
  } catch (error) {
    console.error("Get orders error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch orders", error: error.message });
  }
};

// GET ORDER BY ORDER NUMBER
const getOrderByNumber = async (req, res) => {
  try {
    await connectDB();
    const { orderNumber } = req.params;
    const order = await orderModel.findOne({ orderNumber }).lean();
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error("Get order by number error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch order", error: error.message });
  }
};

// DELETE ALL ORDERS
const deleteAllOrders = async (req, res) => {
  try {
    await connectDB();
    const result = await orderModel.deleteMany({});
    res.status(200).json({ success: true, message: "All orders deleted successfully", deletedCount: result.deletedCount });
  } catch (error) {
    console.error("Delete all orders error:", error);
    res.status(500).json({ success: false, message: "Failed to delete all orders", error: error.message });
  }
};

module.exports = { createOrder, getOrders, getOrderByNumber, deleteAllOrders };