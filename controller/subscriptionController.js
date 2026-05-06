const connectDB = require("../utils/connectDB");
const transporter = require("../middleware/nodemailer");
const { subscriberMail } = require("../middleware/validator");
const Subscription = require("../model/subscription");

/* =========================
   EMAIL TEMPLATE - FOODIE BRANDING
========================= */
const subscriptionTemplate = (name = "Food Lover") => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Foodie</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
  </style>
</head>
<body style="margin: 0; padding: 0; background: #f5f5f5;">
  <div style="max-width: 550px; margin: 40px auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.08);">
    
    <!-- Header with Foodie Brand -->
    <div style="background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%); padding: 35px 25px; text-align: center;">
      <div style="font-size: 56px; margin-bottom: 10px;">🍔</div>
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Welcome to Foodie!</h1>
      <p style="margin: 10px 0 0; color: #fff3e0; font-size: 15px;">Delicious meals delivered to your doorstep</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 30px;">
      <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Dear <strong>${name}</strong>,</p>
      
      <p style="font-size: 14px; color: #555; line-height: 1.6;">Thank you for subscribing to <strong style="color: #ff6b35;">Foodie</strong>! You're now part of our food-loving community.</p>
      
      <div style="background: #fff9f0; padding: 20px; border-radius: 16px; margin: 25px 0; text-align: center;">
        <div style="font-size: 32px; margin-bottom: 10px;">🎁</div>
        <h3 style="color: #ff6b35; margin: 0 0 8px;">Welcome Gift!</h3>
        <p style="color: #555; margin: 0 0 15px;">Use code: <strong style="font-size: 20px; color: #ff6b35;">FOODIE15</strong> for 15% off your first order</p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/menu" 
           style="background: #ff6b35; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 30px; display: inline-block; font-weight: 500;">
          Order Now →
        </a>
      </div>
      
      <h3 style="color: #1a472a; font-size: 16px; margin: 20px 0 10px;">What You'll Get:</h3>
      <ul style="color: #555; line-height: 1.8; padding-left: 20px;">
        <li>🔥 Exclusive deals and discounts</li>
        <li>🍕 New menu item announcements</li>
        <li>🚀 Special birthday rewards</li>
        <li>📝 Cooking tips and recipes</li>
      </ul>
      
      <div style="background: #f8faf8; padding: 15px; border-radius: 12px; margin: 25px 0; display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 32px;">⭐</span>
        <div>
          <div style="font-weight: 600; color: #1a472a;">Rated 4.8/5 by Customers</div>
          <div style="font-size: 13px; color: #666;">"Best food delivery experience!"</div>
        </div>
      </div>
      
      <p style="font-size: 13px; color: #999; text-align: center; margin-top: 20px;">
        We're excited to serve you the most delicious meals.<br/>
        Questions? Contact us at ${process.env.SUPPORT_PHONE || '+233 XXX XXX XXXX'}
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background: #1a472a; padding: 20px; text-align: center;">
      <p style="margin: 0 0 10px; color: #d4e6d4; font-size: 12px;">
        🍔 Foodie - Delicious Meals, Happy Customers
      </p>
      <p style="margin: 0;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/unsubscribe" style="color: #ff8c42; text-decoration: none; font-size: 12px;">
          Unsubscribe
        </a>
      </p>
      <p style="margin: 10px 0 0; color: #88b388; font-size: 11px;">
        © ${new Date().getFullYear()} Foodie. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
`;

/* =========================
   ADMIN NOTIFICATION TEMPLATE
========================= */
const adminNotificationTemplate = (email) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Subscriber</title>
</head>
<body style="margin: 0; padding: 0; background: #f5f5f5; font-family: 'Segoe UI', Arial, sans-serif;">
  <div style="max-width: 500px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 5px 20px rgba(0,0,0,0.05);">
    <div style="background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%); padding: 25px; text-align: center;">
      <div style="font-size: 40px;">📧</div>
      <h2 style="margin: 10px 0 0; color: #fff;">New Subscriber!</h2>
    </div>
    <div style="padding: 25px;">
      <p style="font-size: 16px; color: #333;">Someone just subscribed to Foodie!</p>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 10px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Email:</strong> ${email}</p>
        <p style="margin: 10px 0 0;"><strong>Date:</strong> ${new Date().toLocaleString()}</p>
      </div>
      <a href="${process.env.ADMIN_PANEL_URL || 'http://localhost:5000/admin/subscribers'}" 
         style="background: #ff6b35; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 25px; display: inline-block;">
        View All Subscribers
      </a>
    </div>
  </div>
</body>
</html>
`;

/* =========================
   SUBSCRIBE CONTROLLER
========================= */
const subscribeMails = async (req, res) => {
  try {
    await connectDB();

    const { email, name } = req.body;

    /* Validate input */
    const { error } = subscriberMail.validate({ email });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    /* Prevent duplicates */
    const exists = await Subscription.findOne({ email }).lean();
    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Email already subscribed"
      });
    }

    /* Persist first (source of truth) */
    await Subscription.create({ email, name: name || "Food Lover" });

    /* ✅ Send WELCOME EMAIL TO CUSTOMER (SUBSCRIBER) */
    await transporter.sendMail({
      from: `"Foodie Team" <${process.env.EMAIL}>`,
      to: email,  // 👈 Customer receives this email
      subject: "Welcome to Foodie! 🍔 Get 15% Off Your First Order",
      html: subscriptionTemplate(name || email.split('@')[0])
    });

    /* ✅ Send NOTIFICATION TO ADMIN (optional) */
    await transporter.sendMail({
      from: `"Foodie Subscriptions" <${process.env.EMAIL}>`,
      to: process.env.ADMIN_EMAIL || process.env.EMAIL,
      subject: "📧 New Subscriber Joined Foodie",
      html: adminNotificationTemplate(email)
    });

    return res.status(201).json({
      success: true,
      message: "Thanks for subscribing! Check your email for your welcome gift 🎁"
    });

  } catch (err) {
    console.error("Subscription error:", err);

    return res.status(500).json({
      success: false,
      message: "Subscription failed. Please try again."
    });
  }
};

module.exports = subscribeMails;