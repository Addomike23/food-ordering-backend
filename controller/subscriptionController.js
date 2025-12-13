const connectDB = require("../utils/connectDB");
const transporter = require("../middleware/nodemailer");
const { subscriberMail } = require("../middleware/validator");
const Subscription = require("../model/subscription");

/* =========================
   SUBSCRIBE EMAIL
========================= */
const subscribeMails = async (req, res) => {
  try {
    await connectDB();

    const { email } = req.body;

    /* Validate email */
    const { error } = subscriberMail.validate({ email });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    /* Check if already subscribed */
    const alreadySubscribed = await Subscription
      .findOne({ email })
      .lean();

    if (alreadySubscribed) {
      return res.status(409).json({
        success: false,
        message: "Email already subscribed"
      });
    }

    /* Save subscription FIRST */
    await Subscription.create({ email });

    /* Send welcome email (non-blocking) */
    transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: "Welcome to Success Axis Foods!",
      attachments: [
        {
          filename: "logo.jpg",
          path: encodeURI(
            "https://res.cloudinary.com/dro9wcugg/image/upload/v1765573840/products/b87coh3o8fxagorzbgtq.jpg"
          ),
          cid: "banner"
        }
      ],
      html: `
<div style="max-width: 650px; margin: auto; background: #121212;
            border-radius: 12px; overflow: hidden; 
            font-family: Arial, sans-serif; color: #e5e5e5;
            box-shadow: 0 4px 25px rgba(0,0,0,0.6);">

    <!-- Banner -->
    <div style="text-align: center; background: #1a1a1a; padding: 30px 0;">
        <img src="cid:banner" alt="Success Axis Foods"
             style="width: 200px; height: auto; border-radius: 10px;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.45);">
    </div>

    <!-- Header -->
    <div style="background: linear-gradient(to right, #2e8b38, #1b5e20);
                padding: 40px 20px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 28px; letter-spacing: 1px;">
            SUCCESS AXIS FOODS
        </h1>
        <p style="margin-top: 10px; font-size: 15px; opacity: 0.9;">
            Premium Pasture-Raised Poultry Delivered Fresh
        </p>
    </div>

    <!-- Body -->
    <div style="padding: 30px 25px;">
        <h2 style="margin: 0; font-size: 24px; color: #81c784;">Welcome to the Family!</h2>

        <p style="margin-top: 12px; line-height: 1.7; color: #d4d4d4;">
            Thank you for subscribing to Success Axis Foods. We are excited to provide you 
            with fresh, high-quality poultry products raised with care and commitment.
        </p>

        <!-- Highlight Box -->
        <div style="margin-top: 20px; background: #1e1e1e; padding: 18px;
                    border-radius: 8px; border-left: 5px solid #4CAF50;">
            <p style="margin: 0; color: #cfcfcf;"><strong>You will now receive:</strong></p>
            <ul style="margin-top: 10px; padding-left: 22px; line-height: 1.7; color: #bbbbbb;">
                <li>Exclusive farm updates and livestock availability</li>
                <li>Seasonal discounts and special offers</li>
                <li>Poultry care tips and cooking inspiration</li>
            </ul>
        </div>

        <!-- CTA Button -->
        <div style="text-align: center; margin-top: 35px;">
            <a href="https://portryfarm.vercel.app/shop"
               style="background: #43a047; color: white; padding: 14px 28px;
                      text-decoration: none; font-size: 16px;
                      border-radius: 8px; display: inline-block;
                      box-shadow: 0 4px 15px rgba(76,175,80,0.4);">
                Visit Our Shop
            </a>
        </div>

        <!-- Divider -->
        <hr style="margin: 40px 0; border: none; border-top: 1px solid #333;">
        
        <p style="font-size: 14px; line-height: 1.7; color: #aaaaaa;">
            If you have any questions, feel free to reach out. 
            We are always ready to support you with premium farm products and expert guidance.
        </p>
    </div>

    <!-- Footer -->
    <div style="background: #1a1a1a; padding: 18px; text-align: center; color: #9a9a9a; font-size: 12px;">
        <p style="margin: 0;">Success Axis Foods • Serving Quality Since 2010</p>
        <p style="margin-top: 6px;">
            <a href="mailto:info@successaxisfoods.com" style="color: #4CAF50;">Contact</a> |
            <a href="https://portryfarm.vercel.app/unsubscribe" style="color: #4CAF50;">Unsubscribe</a>
        </p>
    </div>
</div>
      `
    }).catch(() => {}); // ensure email failures do not crash API

    res.status(201).json({
      success: true,
      message: "Thanks for subscribing"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = subscribeMails;
