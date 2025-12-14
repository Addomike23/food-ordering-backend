const connectDB = require("../utils/connectDB");
const transporter = require("../middleware/nodemailer");
const { subscriberMail } = require("../middleware/validator");
const Subscription = require("../model/subscription");

/* =========================
   SUBSCRIBE EMAIL
========================= */
const subscribeMails = async (req, res) => {
  try {
    /* Ensure DB connection */
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

    /* Send welcome email (awaited for Vercel reliability) */
    await transporter.sendMail({
      from: `"Naya Success Axis" <${process.env.EMAIL}>`,
      to: email,
      subject: "Welcome to Naya Success Axis",
      attachments: [
        {
          filename: "logo.jpg",
          path: "https://res.cloudinary.com/dro9wcugg/image/upload/v1765573840/products/b87coh3o8fxagorzbgtq.jpg",
          cid: "banner"
        }
      ],
      html: `
<div style="max-width: 620px; margin: auto; background: #ffffff;
            border-radius: 8px; overflow: hidden;
            font-family: Arial, sans-serif; color: #333333;
            border: 1px solid #e6e6e6;">

  <div style="text-align: center; padding: 28px 16px;">
    <img src="cid:banner" alt="Naya Success Axis"
         style="max-width:130px;width:100%;height:auto;">
  </div>

  <div style="text-align: center; padding: 0 24px 20px;">
    <h1 style="margin:0;font-size:24px;color:#2e7d32;">
      NAYA SUCCESS AXIS
    </h1>
    <p style="margin-top:6px;font-size:14px;color:#666;">
      Premium Pasture-Raised Poultry
    </p>
  </div>

  <div style="padding:24px 28px;font-size:15px;line-height:1.7;">
    <p>Welcome, and thank you for subscribing to <strong>Naya Success Axis</strong>.</p>
    <p>Since <strong>2018</strong>, we have been committed to delivering responsibly raised, high-quality poultry.</p>

    <ul>
      <li>Farm updates and product availability</li>
      <li>Seasonal promotions and discounts</li>
      <li>Poultry care tips and cooking inspiration</li>
    </ul>

    <div style="text-align:center;margin:30px 0;">
      <a href="https://nayaaxisfoods.vercel.app/products"
         style="background:#2e7d32;color:#fff;padding:12px 28px;
                text-decoration:none;border-radius:6px;">
        Visit Our Shop
      </a>
    </div>
  </div>

  <div style="background:#f8f8f8;padding:16px;text-align:center;
              font-size:12px;color:#777;">
    <p style="margin:0;">Naya Success Axis • Started 2018</p>
    <p style="margin-top:6px;">
      <a href="mailto:nayasuccessaxis@gmail.com" style="color:#2e7d32;">Contact</a> |
      <a href="https://nayaaxisfoods.vercel.app/unsubscribe" style="color:#2e7d32;">Unsubscribe</a>
    </p>
  </div>
</div>
`
    });

    return res.status(201).json({
      success: true,
      message: "Thanks for subscribing"
    });

  } catch (error) {
    console.error("Subscription error:", error);

    return res.status(500).json({
      success: false,
      message: "Subscription failed",
      error: error.message
    });
  }
};

module.exports = subscribeMails;
