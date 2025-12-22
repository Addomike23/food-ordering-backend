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

    
// ENHANCED CUSTOMER RECEIPT EMAIL
// ===============================
 const receiptHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Order Receipt</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f9fafb;
        }
        
        .receipt-container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 8px 30px rgba(0,0,0,0.08);
        }
        
        .receipt-header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        
        .logo {
            font-size: 36px;
            font-weight: 700;
            margin-bottom: 8px;
            letter-spacing: 1px;
        }
        
        .logo-subtitle {
            opacity: 0.9;
            font-size: 16px;
            margin-bottom: 20px;
        }
        
        .receipt-title {
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 8px;
        }
        
        .order-number {
            background: rgba(255,255,255,0.15);
            display: inline-block;
            padding: 10px 24px;
            border-radius: 50px;
            font-weight: 500;
            font-size: 15px;
            margin-top: 12px;
        }
        
        .receipt-body {
            padding: 40px;
        }
        
        .info-section {
            margin-bottom: 32px;
            padding: 24px;
            background: #f8fafc;
            border-radius: 12px;
            border-left: 4px solid #10b981;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }
        
        .info-item {
            margin-bottom: 12px;
        }
        
        .info-label {
            font-size: 13px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
        }
        
        .info-value {
            font-size: 16px;
            font-weight: 500;
            color: #1e293b;
        }
        
        .items-section {
            margin-bottom: 32px;
        }
        
        .section-title {
            font-size: 18px;
            font-weight: 600;
            color: #475569;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 2px solid #e2e8f0;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .items-table th {
            background: #f1f5f9;
            padding: 16px 12px;
            text-align: left;
            font-weight: 600;
            color: #475569;
            font-size: 14px;
            border-bottom: 2px solid #e2e8f0;
        }
        
        .items-table td {
            padding: 20px 12px;
            border-bottom: 1px solid #f1f5f9;
        }
        
        .item-name {
            font-weight: 500;
            color: #1e293b;
        }
        
        .item-quantity {
            color: #64748b;
        }
        
        .item-price {
            text-align: right;
            font-weight: 600;
            color: #1e293b;
        }
        
        .item-total {
            text-align: right;
            font-weight: 700;
            color: #10b981;
        }
        
        .total-section {
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            padding: 30px;
            border-radius: 12px;
            margin-top: 32px;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            padding-bottom: 16px;
            border-bottom: 1px dashed #cbd5e1;
        }
        
        .total-label {
            color: #64748b;
            font-size: 16px;
        }
        
        .total-value {
            font-weight: 500;
            color: #1e293b;
            font-size: 16px;
        }
        
        .grand-total {
            font-size: 28px;
            font-weight: 700;
            color: #059669;
            border-bottom: none !important;
            padding-top: 16px;
            margin-top: 16px;
            border-top: 2px dashed #cbd5e1;
        }
        
        .payment-method {
            background: #f0fdf4;
            padding: 20px;
            border-radius: 10px;
            margin-top: 24px;
            border: 1px solid #bbf7d0;
        }
        
        .payment-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        
        .status-badge {
            display: inline-flex;
            align-items: center;
            padding: 6px 16px;
            background: #dcfce7;
            color: #166534;
            border-radius: 50px;
            font-size: 14px;
            font-weight: 500;
            margin-top: 8px;
        }
        
        .footer {
            text-align: center;
            padding: 30px;
            color: #64748b;
            font-size: 14px;
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
        }
        
        .contact-info {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin-top: 20px;
            flex-wrap: wrap;
        }
        
        .contact-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        @media (max-width: 600px) {
            .receipt-body {
                padding: 20px;
            }
            
            .info-grid {
                grid-template-columns: 1fr;
            }
            
            .items-table {
                display: block;
                overflow-x: auto;
            }
            
            .contact-info {
                flex-direction: column;
                gap: 12px;
                align-items: center;
            }
        }
    </style>
</head>
<body>
    <div class="receipt-container">
        <div class="receipt-header">
            <div class="logo">Naya Axis Foods</div>
            <div class="logo-subtitle">Delicious Meals, Delivered Fresh</div>
            <div class="receipt-title">Order Confirmed! 🎉</div>
            <div class="order-number">${order.orderNumber}</div>
        </div>
        
        <div class="receipt-body">
            <!-- Order Status & Info -->
            <div class="info-section">
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Order Status</div>
                        <div class="info-value">
                            Confirmed
                            <span class="status-badge">✅ Processing</span>
                        </div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Order Date & Time</div>
                        <div class="info-value">${new Date(order.createdAt).toLocaleString('en-GH', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Estimated Delivery</div>
                        <div class="info-value">
                            ${(() => {
                                const deliveryTime = new Date(order.createdAt);
                                deliveryTime.setMinutes(deliveryTime.getMinutes() + 45);
                                return deliveryTime.toLocaleTimeString('en-GH', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                });
                            })()}
                            (45-60 minutes)
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Customer Information -->
            <div class="items-section">
                <div class="section-title">Customer Information</div>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Full Name</div>
                        <div class="info-value">${order.customerInfo.name}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Contact Phone</div>
                        <div class="info-value">${order.customerInfo.phone}</div>
                    </div>
                    ${order.customerInfo.email ? `
                    <div class="info-item">
                        <div class="info-label">Email Address</div>
                        <div class="info-value">${order.customerInfo.email}</div>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            <!-- Order Items -->
            <div class="items-section">
                <div class="section-title">Order Details</div>
                <table class="items-table">
                    <thead>
                        <tr>
                            <th style="width: 40%;">Item</th>
                            <th style="width: 20%;">Quantity</th>
                            <th style="width: 20%;">Unit Price</th>
                            <th style="width: 20%;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.items.map(item => `
                            <tr>
                                <td>
                                    <div class="item-name">${item.name}</div>
                                    ${item.notes ? `<div style="font-size:13px;color:#64748b;margin-top:4px;">${item.notes}</div>` : ''}
                                </td>
                                <td class="item-quantity">${item.quantity}</td>
                                <td class="item-price">₵${item.price.toFixed(2)}</td>
                                <td class="item-total">₵${(item.price * item.quantity).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <!-- Order Summary -->
            <div class="total-section">
                <div class="section-title">Order Summary</div>
                
                <div class="total-row">
                    <span class="total-label">Subtotal</span>
                    <span class="total-value">₵${subtotal.toFixed(2)}</span>
                </div>
                
                ${order.deliveryFee ? `
                <div class="total-row">
                    <span class="total-label">Delivery Fee</span>
                    <span class="total-value">₵${order.deliveryFee.toFixed(2)}</span>
                </div>
                ` : ''}
                
                ${order.discount ? `
                <div class="total-row">
                    <span class="total-label">Discount</span>
                    <span class="total-value" style="color:#10b981;">-₵${order.discount.toFixed(2)}</span>
                </div>
                ` : ''}
                
                <div class="total-row grand-total">
                    <span>Grand Total</span>
                    <span>₵${(subtotal + (order.deliveryFee || 0) - (order.discount || 0)).toFixed(2)}</span>
                </div>
            </div>
            
            <!-- Payment & Delivery Info -->
            <div class="payment-method">
                <div class="payment-row">
                    <span><strong>Payment Method:</strong></span>
                    <span>${order.customerInfo.paymentMethod}</span>
                </div>
                <div class="payment-row">
                    <span><strong>Delivery Type:</strong></span>
                    <span>${order.customerInfo.deliveryType}</span>
                </div>
                ${order.customerInfo.deliveryAddress ? `
                <div style="margin-top: 12px;">
                    <div class="info-label">Delivery Address</div>
                    <div class="info-value">${order.customerInfo.deliveryAddress}</div>
                </div>
                ` : ''}
                ${order.customerInfo.specialInstructions ? `
                <div style="margin-top: 12px;">
                    <div class="info-label">Special Instructions</div>
                    <div class="info-value">${order.customerInfo.specialInstructions}</div>
                </div>
                ` : ''}
            </div>
            
            <!-- Order Notes -->
            <div style="margin-top: 24px; padding: 20px; background: #fef3c7; border-radius: 8px; border: 1px solid #fcd34d;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                    <div style="font-size: 20px;">ℹ️</div>
                    <div style="font-weight: 600; color: #92400e;">Important Information</div>
                </div>
                <p style="color: #92400e; font-size: 14px;">
                    • Please keep this receipt for reference<br>
                    • You will receive updates about your order via SMS<br>
                    • Contact us if you don't receive your order within 60 minutes<br>
                    • Payment verification may take 2-3 minutes
                </p>
            </div>
        </div>
        
        <div class="footer">
            <p>Thank you for choosing Naya Axis Foods!</p>
            <p style="margin-top: 8px; font-size: 15px;">We're preparing your order with care and love ❤️</p>
            
            <div class="contact-info">
                <div class="contact-item">
                    <span>📞</span>
                    <span>+233 12 345 6789</span>
                </div>
                <div class="contact-item">
                    <span>📧</span>
                    <span>hello@nayaaxisfoods.com</span>
                </div>
                <div class="contact-item">
                    <span>📍</span>
                    <span>Accra, Ghana</span>
                </div>
            </div>
            
            <p style="margin-top: 20px; font-size: 12px; opacity: 0.7;">
                This is an automated receipt. Please do not reply to this email.
            </p>
        </div>
    </div>
</body>
</html>
`;

 // ===============================
// ENHANCED ADMIN EMAIL WITH BEAUTIFUL DESIGN
// ===============================
const adminHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Order Notification</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8f9fa;
        }
        
        .container {
            max-width: 700px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 40px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 8px;
        }
        
        .header .order-number {
            background: rgba(255,255,255,0.15);
            display: inline-block;
            padding: 8px 20px;
            border-radius: 50px;
            font-weight: 500;
            margin-top: 10px;
            font-size: 16px;
        }
        
        .content {
            padding: 40px;
        }
        
        .section {
            margin-bottom: 32px;
        }
        
        .section-title {
            color: #4a5568;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e2e8f0;
        }
        
        .customer-info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
        }
        
        .info-item {
            margin-bottom: 12px;
        }
        
        .info-label {
            font-size: 13px;
            color: #718096;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }
        
        .info-value {
            font-size: 16px;
            font-weight: 500;
            color: #2d3748;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        
        .items-table th {
            background: #f7fafc;
            padding: 16px;
            text-align: left;
            font-weight: 600;
            color: #4a5568;
            border-bottom: 2px solid #e2e8f0;
        }
        
        .items-table td {
            padding: 20px 16px;
            border-bottom: 1px solid #edf2f7;
            vertical-align: top;
        }
        
        .product-cell {
            display: flex;
            align-items: center;
            gap: 16px;
        }
        
        .product-image {
            width: 60px;
            height: 60px;
            object-fit: cover;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }
        
        .product-info {
            flex: 1;
        }
        
        .product-name {
            font-weight: 500;
            margin-bottom: 4px;
            color: #2d3748;
        }
        
        .product-variant {
            font-size: 14px;
            color: #718096;
        }
        
        .quantity-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: #edf2f7;
            color: #4a5568;
            width: 32px;
            height: 32px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 14px;
        }
        
        .price-cell {
            font-weight: 600;
            color: #2d3748;
            font-size: 16px;
        }
        
        .summary-box {
            background: linear-gradient(135deg, #f6f9ff 0%, #f1f5ff 100%);
            padding: 24px;
            border-radius: 12px;
            border-left: 4px solid #667eea;
        }
        
        .summary-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }
        
        .summary-label {
            color: #4a5568;
        }
        
        .summary-value {
            font-weight: 600;
            color: #2d3748;
        }
        
        .grand-total {
            font-size: 24px;
            color: #2d3748;
            margin-top: 16px;
            padding-top: 16px;
            border-top: 2px dashed #cbd5e0;
        }
        
        .delivery-info {
            display: flex;
            gap: 24px;
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            margin-top: 24px;
        }
        
        .delivery-item {
            flex: 1;
        }
        
        .footer {
            text-align: center;
            padding: 24px;
            color: #718096;
            font-size: 14px;
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
        }
        
        @media (max-width: 600px) {
            .content {
                padding: 20px;
            }
            
            .customer-info-grid {
                grid-template-columns: 1fr;
            }
            
            .product-cell {
                flex-direction: column;
                align-items: flex-start;
                gap: 8px;
            }
            
            .delivery-info {
                flex-direction: column;
                gap: 16px;
            }
            
            .items-table {
                display: block;
                overflow-x: auto;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 New Order Received!</h1>
            <p style="opacity: 0.9;">A customer has just placed an order</p>
            <div class="order-number">${order.orderNumber}</div>
        </div>
        
        <div class="content">
            <!-- Customer Information -->
            <div class="section">
                <div class="section-title">Customer Information</div>
                <div class="customer-info-grid">
                    <div class="info-item">
                        <div class="info-label">Customer Name</div>
                        <div class="info-value">${order.customerInfo.name}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Phone Number</div>
                        <div class="info-value">${order.customerInfo.phone}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Email Address</div>
                        <div class="info-value">${order.customerInfo.email || 'Not provided'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Order Date</div>
                        <div class="info-value">${new Date(order.createdAt).toLocaleString('en-GH', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                        })}</div>
                    </div>
                </div>
            </div>
            
            <!-- Order Items -->
            <div class="section">
                <div class="section-title">Order Items</div>
                <table class="items-table">
                    <thead>
                        <tr>
                            <th style="width: 50%;">Product</th>
                            <th style="width: 15%;">Quantity</th>
                            <th style="width: 35%;">Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.items.map(item => `
                            <tr>
                                <td>
                                    <div class="product-cell">
                                        <img src="${item.image || 'https://via.placeholder.com/60x60/667eea/ffffff?text=Product'}" 
                                             alt="${item.name}" 
                                             class="product-image">
                                        <div class="product-info">
                                            <div class="product-name">${item.name}</div>
                                            ${item.variant ? `<div class="product-variant">${item.variant}</div>` : ''}
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div class="quantity-badge">${item.quantity}</div>
                                </td>
                                <td class="price-cell">
                                    ₵${item.price.toFixed(2)} × ${item.quantity} = <strong>₵${(item.price * item.quantity).toFixed(2)}</strong>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <!-- Order Summary -->
            <div class="section">
                <div class="section-title">Order Summary</div>
                <div class="summary-box">
                    <div class="summary-row">
                        <span class="summary-label">Subtotal</span>
                        <span class="summary-value">₵${subtotal.toFixed(2)}</span>
                    </div>
                    <div class="summary-row">
                        <span class="summary-label">Delivery Fee</span>
                        <span class="summary-value">₵${(order.deliveryFee || 0).toFixed(2)}</span>
                    </div>
                    ${order.discount ? `
                    <div class="summary-row">
                        <span class="summary-label">Discount</span>
                        <span class="summary-value" style="color:#48bb78;">-₵${order.discount.toFixed(2)}</span>
                    </div>
                    ` : ''}
                    <div class="summary-row grand-total">
                        <span>Grand Total</span>
                        <span>₵${(subtotal + (order.deliveryFee || 0) - (order.discount || 0)).toFixed(2)}</span>
                    </div>
                </div>
                
                <!-- Delivery & Payment Info -->
                <div class="delivery-info">
                    <div class="delivery-item">
                        <div class="info-label">Delivery Type</div>
                        <div class="info-value">${order.customerInfo.deliveryType}</div>
                    </div>
                    <div class="delivery-item">
                        <div class="info-label">Payment Method</div>
                        <div class="info-value">${order.customerInfo.paymentMethod}</div>
                    </div>
                    ${order.customerInfo.deliveryAddress ? `
                    <div class="delivery-item">
                        <div class="info-label">Delivery Address</div>
                        <div class="info-value">${order.customerInfo.deliveryAddress}</div>
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p>Order ID: ${order._id} • Received at ${new Date().toLocaleTimeString('en-GH')}</p>
            <p style="margin-top: 8px;">Please process this order promptly.</p>
        </div>
    </div>
</body>
</html>
`;


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