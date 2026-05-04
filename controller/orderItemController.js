const orderModel = require("../model/orderModel");
const productModel = require("../model/productModel"); // ✅ ADD THIS - was missing!
const { orderValidator } = require("../middleware/validator");
const transporter = require("../middleware/nodemailer");
const crypto = require("crypto");
const connectDB = require('../utils/connectDB');
const recommendationEngine = require('../services/recommendationEngine');

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
    // 4.5 UPDATE PRODUCT POPULARITY
    // ===============================
    for (const item of normalizedItems) {
      if (item.productId) {
        await recommendationEngine.updateProductPopularity(item.productId);
      } else {
        // If productId not provided, try to find by name
        const product = await productModel.findOne({ name: item.name });
        if (product) {
          await recommendationEngine.updateProductPopularity(product._id);
        }
      }
    }
    console.log(`📊 Updated popularity for ${normalizedItems.length} products`);

    // ===============================
    // 5. CALCULATE TOTALS (GHS CURRENCY)
    // ===============================
    const subtotal = order.items.reduce((sum, item) => sum + item.totalPrice, 0);
    const deliveryFee = order.customerInfo.deliveryType === 'delivery' ? 15 : 0; // GHS 15
    const tax = subtotal * 0.025; // 2.5% tax
    const totalAmount = subtotal + deliveryFee + tax;

    // ===============================
    // 6. BUILD ADMIN EMAIL WITH FULL DETAILS
    // ===============================
    const adminItemsHtml = order.items.map(item => `
      <tr style="border-bottom: 1px solid #e0e0e0;">
        <td style="padding: 12px; vertical-align: middle; width: 80px;">
          ${item.images.map(img => `<img src="${img}" width="60" height="60" style="object-fit: cover; border-radius: 8px;" />`).join('')}
        </td>
        <td style="padding: 12px; vertical-align: middle;">
          <strong>${item.name}</strong><br/>
          <span style="color: #666; font-size: 12px;">${item.category || 'Food Item'}</span>
        </td>
        <td style="padding: 12px; vertical-align: middle; text-align: center;">
          ${item.quantity}
        </td>
        <td style="padding: 12px; vertical-align: middle; text-align: right;">
          GH₵${(item.price).toFixed(2)}
        </td>
        <td style="padding: 12px; vertical-align: middle; text-align: right;">
          <strong>GH₵${(item.totalPrice).toFixed(2)}</strong>
        </td>
      </tr>
    `).join("");

    // Admin Email HTML
    const adminHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Order - ${order.orderNumber}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5;">
        <div style="max-width: 800px; margin: 20px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1b5e20 0%, #2d6a4f 100%); padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 28px;">🛍️ New Order Received</h1>
            <p style="margin: 10px 0 0; color: #e8f5e9; font-size: 16px;">Order #${order.orderNumber}</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px;">
            <!-- Customer Information Section -->
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <h2 style="margin: 0 0 15px 0; color: #1b5e20; font-size: 18px;">👤 Customer Information</h2>
              <table style="width: 100%;">
                <tr>
                  <td style="padding: 5px 0;"><strong>Name:</strong></td>
                  <td>${order.customerInfo.name}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0;"><strong>Phone:</strong></td>
                  <td>${order.customerInfo.phone}</td>
                </tr>
                ${order.customerInfo.email ? `
                <tr>
                  <td style="padding: 5px 0;"><strong>Email:</strong></td>
                  <td>${order.customerInfo.email}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 5px 0;"><strong>Delivery Type:</strong></td>
                  <td>${order.customerInfo.deliveryType === 'delivery' ? '🚚 Delivery' : '🏪 Pickup'}</td>
                </tr>
                ${order.customerInfo.address ? `
                <tr>
                  <td style="padding: 5px 0;"><strong>Delivery Address:</strong></td>
                  <td>${order.customerInfo.address}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 5px 0;"><strong>Payment Method:</strong></td>
                  <td>${order.customerInfo.paymentMethod === 'cash' ? '💵 Cash on Delivery' : '💳 Card Payment'}</td>
                </tr>
              20cean
            </div>
            
            <!-- Order Items Section -->
            <h2 style="margin: 0 0 15px 0; color: #1b5e20; font-size: 18px;">📦 Order Items</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
              <thead>
                <tr style="background: #f0f0f0;">
                  <th style="padding: 12px; text-align: left;">Item</th>
                  <th style="padding: 12px; text-align: left;">Product</th>
                  <th style="padding: 12px; text-align: center;">Qty</th>
                  <th style="padding: 12px; text-align: right;">Price</th>
                  <th style="padding: 12px; text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${adminItemsHtml}
              </tbody>
              <tfoot>
                <tr style="background: #f8f9fa;">
                  <td colspan="4" style="padding: 12px; text-align: right;"><strong>Subtotal:</strong></td>
                  <td style="padding: 12px; text-align: right;">GH₵${subtotal.toFixed(2)}</strong></td>
                </tr>
                <tr style="background: #f8f9fa;">
                  <td colspan="4" style="padding: 12px; text-align: right;"><strong>Delivery Fee:</strong></td>
                  <td style="padding: 12px; text-align: right;">GH₵${deliveryFee.toFixed(2)}</strong></td>
                </tr>
                <tr style="background: #f8f9fa;">
                  <td colspan="4" style="padding: 12px; text-align: right;"><strong>Tax (2.5%):</strong></td>
                  <td style="padding: 12px; text-align: right;">GH₵${tax.toFixed(2)}</strong></td>
                </tr>
                <tr style="background: linear-gradient(135deg, #1b5e20 0%, #2d6a4f 100%); color: #ffffff;">
                  <td colspan="4" style="padding: 15px; text-align: right;"><strong style="font-size: 16px;">TOTAL:</strong></td>
                  <td style="padding: 15px; text-align: right;"><strong style="font-size: 18px;">GH₵${totalAmount.toFixed(2)}</strong></td>
                </tr>
              </tfoot>
            20cean
            
            <!-- Action Button -->
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.ADMIN_PANEL_URL || 'http://localhost:3000/admin/orders'}" 
                 style="background: #1b5e20; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Order in Dashboard
              </a>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #f5f5f5; padding: 20px; text-align: center; color: #666; font-size: 12px;">
            <p>This is an automated notification from your Food Ordering System.</p>
            <p>© ${new Date().getFullYear()} All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // ===============================
    // 7. SEND ADMIN EMAIL
    // ===============================
    await transporter.sendMail({
      from: `"Food Ordering System" <${process.env.EMAIL}>`,
      to: process.env.ADMIN_EMAIL || process.env.EMAIL,
      subject: `🛍️ NEW ORDER - ${order.orderNumber}`,
      html: adminHtml
    });

    // ===============================
    // 8. CUSTOMER EMAIL HTML WITH FULL DETAILS
    // ===============================
    if (order.customerInfo.email) {
      const customerItemsHtml = order.items.map(item => `
        <tr style="border-bottom: 1px solid #e0e0e0;">
          <td style="padding: 12px; vertical-align: middle; width: 80px;">
            ${item.images.map(img => `<img src="${img}" width="60" height="60" style="object-fit: cover; border-radius: 8px;" />`).join('')}
          </tr>
          <td style="padding: 12px; vertical-align: middle;">
            <strong>${item.name}</strong><br/>
            <span style="color: #666; font-size: 12px;">${item.category || 'Food Item'}</span>
          </td>
          <td style="padding: 12px; vertical-align: middle; text-align: center;">
            ${item.quantity}
          </td>
          <td style="padding: 12px; vertical-align: middle; text-align: right;">
            GH₵${(item.price).toFixed(2)}
          </td>
          <td style="padding: 12px; vertical-align: middle; text-align: right;">
            <strong>GH₵${(item.totalPrice).toFixed(2)}</strong>
          </td>
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
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5;">
          <div style="max-width: 800px; margin: 20px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%); padding: 30px 20px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px;">🎉 Thank You for Your Order!</h1>
              <p style="margin: 10px 0 0; color: #fff3e0; font-size: 16px;">Order #${order.orderNumber}</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px;">
              <!-- Greeting -->
              <p style="font-size: 16px; color: #333;">Dear <strong>${order.customerInfo.name}</strong>,</p>
              <p style="font-size: 14px; color: #666;">Thank you for choosing us! Your order has been received and is being processed.</p>
              
              <!-- Order Summary Section -->
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="margin: 0 0 15px 0; color: #ff6b35; font-size: 18px;">📋 Order Summary</h2>
                <table style="width: 100%;">
                  <tr>
                    <td style="padding: 5px 0;"><strong>Order Number:</strong></td>
                    <td>${order.orderNumber}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0;"><strong>Order Date:</strong></td>
                    <td>${new Date(order.createdAt).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0;"><strong>Status:</strong></td>
                    <td><span style="background: #ff6b35; color: #fff; padding: 3px 10px; border-radius: 20px; font-size: 12px;">${order.status.toUpperCase()}</span></td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0;"><strong>Delivery Type:</strong></td>
                    <td>${order.customerInfo.deliveryType === 'delivery' ? '🚚 Home Delivery' : '🏪 Store Pickup'}</td>
                  </tr>
                  ${order.customerInfo.address ? `
                  <tr>
                    <td style="padding: 5px 0;"><strong>Delivery Address:</strong></td>
                    <td>${order.customerInfo.address}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>
              
              <!-- Order Items Section -->
              <h2 style="margin: 0 0 15px 0; color: #ff6b35; font-size: 18px;">🛒 Your Items</h2>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
                <thead>
                  <tr style="background: #f0f0f0;">
                    <th style="padding: 12px; text-align: left;">Item</th>
                    <th style="padding: 12px; text-align: left;">Product</th>
                    <th style="padding: 12px; text-align: center;">Qty</th>
                    <th style="padding: 12px; text-align: right;">Price</th>
                    <th style="padding: 12px; text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${customerItemsHtml}
                </tbody>
                <tfoot>
                  <tr style="background: #f8f9fa;">
                    <td colspan="4" style="padding: 12px; text-align: right;"><strong>Subtotal:</strong></td>
                    <td style="padding: 12px; text-align: right;">GH₵${subtotal.toFixed(2)}</strong></td>
                  </tr>
                  <tr style="background: #f8f9fa;">
                    <td colspan="4" style="padding: 12px; text-align: right;"><strong>Delivery Fee:</strong></td>
                    <td style="padding: 12px; text-align: right;">GH₵${deliveryFee.toFixed(2)}</strong></td>
                  </tr>
                  <tr style="background: #f8f9fa;">
                    <td colspan="4" style="padding: 12px; text-align: right;"><strong>Tax (2.5%):</strong></td>
                    <td style="padding: 12px; text-align: right;">GH₵${tax.toFixed(2)}</strong></td>
                  </tr>
                  <tr style="background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%); color: #ffffff;">
                    <td colspan="4" style="padding: 15px; text-align: right;"><strong style="font-size: 16px;">TOTAL AMOUNT:</strong></td>
                    <td style="padding: 15px; text-align: right;"><strong style="font-size: 20px;">GH₵${totalAmount.toFixed(2)}</strong></td>
                  </tr>
                </tfoot>
              20cean
              
              <!-- Payment Information -->
              <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #2e7d32;">
                  <strong>💳 Payment Method:</strong> ${order.customerInfo.paymentMethod === 'cash' ? 'Cash on Delivery' : 'Card Payment'}<br/>
                  <strong>💰 Payment Status:</strong> ${order.paymentStatus === 'paid' ? 'Paid ✓' : 'Pending - Pay on delivery'}
                </p>
              </div>
              
              <!-- Track Order Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/track-order/${order.orderNumber}" 
                   style="background: #ff6b35; color: #ffffff; padding: 14px 35px; text-decoration: none; border-radius: 30px; display: inline-block; font-weight: bold;">
                  🚀 Track Your Order Live
                </a>
              </div>
              
              <!-- Estimated Delivery -->
              <div style="text-align: center; margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 8px;">
                <p style="margin: 0; color: #666; font-size: 14px;">
                  ⏰ <strong>Estimated Processing Time:</strong> 30-45 minutes<br/>
                  📞 <strong>Need help?</strong> Contact us at ${process.env.SUPPORT_PHONE || '+233 XXX XXX XXXX'}
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background: #f5f5f5; padding: 20px; text-align: center; color: #666; font-size: 12px;">
              <p>Thank you for shopping with us!</p>
              <p>© ${new Date().getFullYear()} Food Ordering System. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await transporter.sendMail({
        from: `"Food Ordering System" <${process.env.EMAIL}>`,
        to: order.customerInfo.email,
        subject: `✅ Order Confirmed - ${order.orderNumber}`,
        html: customerHtml
      });
    }

    // ===============================
    // 9. SOCKET.IO REAL-TIME NOTIFICATION
    // ===============================
    const socketService = req.app.get('socketService');
    if (socketService) {
      socketService.emitNewOrder(order);

      if (order.customerInfo.phone) {
        socketService.notifyUser(order.customerInfo.phone, 'order-confirmation', {
          orderNumber: order.orderNumber,
          status: order.status,
          message: `Your order ${order.orderNumber} has been placed successfully!`,
          items: order.items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            totalPrice: item.totalPrice,
            images: item.images
          })),
          subtotal: subtotal,
          deliveryFee: deliveryFee,
          tax: tax,
          totalAmount: totalAmount
        });
      }

      console.log(`🔔 Socket notification sent for order: ${order.orderNumber}`);
    }

    // ===============================
    // 10. RETURN RESPONSE WITH RECOMMENDATIONS
    // ===============================
    let recommendations = [];
    try {
      recommendations = await recommendationEngine.getPersonalizedRecommendations(
        { phone: order.customerInfo.phone },
        5
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
        customerInfo: order.customerInfo,
        items: order.items,
        subtotal: subtotal,
        deliveryFee: deliveryFee,
        tax: tax,
        totalAmount: totalAmount,
        createdAt: order.createdAt
      },
      recommendations: recommendations
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

// ===============================
// GET ALL ORDERS
// ===============================
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
    console.error("Get orders error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message
    });
  }
};

// ===============================
// GET SINGLE ORDER BY ORDER NUMBER
// ===============================
const getOrderByNumber = async (req, res) => {
  try {
    await connectDB();
    
    const { orderNumber } = req.params;
    
    const order = await orderModel.findOne({ orderNumber }).lean();
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }
    
    res.status(200).json({
      success: true,
      order
    });
    
  } catch (error) {
    console.error("Get order by number error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order",
      error: error.message
    });
  }
};

// ===============================
// DELETE ALL ORDERS
// ===============================
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
    console.error("Delete all orders error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete all orders",
      error: error.message
    });
  }
};

module.exports = { 
  createOrder, 
  getOrders, 
  getOrderByNumber,
  deleteAllOrders 
};