const transporter = require("../middleware/nodemailer");
const Joi = require("joi");

/* =======================
   Validation Schema
======================= */
const contactValidator = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  message: Joi.string().min(5).max(2000).required()
});

/* =======================
   Email Templates - ForksUp Branding
======================= */
const companyEmailHTML = ({ name, email, message }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Contact Message - ForksUp</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
  </style>
</head>
<body style="margin: 0; padding: 0; background: #f5f5f5;">
  <div style="max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%); padding: 30px 25px; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 10px;">🍽️</div>
      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">New Contact Message</h1>
      <p style="margin: 8px 0 0; color: #fff3e0; font-size: 14px;">From ForksUp Website</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 30px;">
      <div style="background: #f8faf8; padding: 20px; border-radius: 16px; margin-bottom: 25px;">
        <p style="margin: 0 0 8px; color: #888; font-size: 12px;">From</p>
        <p style="margin: 0 0 4px; font-size: 18px; font-weight: 600; color: #1a472a;">${name}</p>
        <p style="margin: 0; color: #ff6b35; font-size: 14px;">${email}</p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <p style="margin: 0 0 10px; font-weight: 600; color: #1a472a;">📝 Message:</p>
        <div style="background: #f8faf8; padding: 20px; border-radius: 12px; border-left: 4px solid #ff6b35;">
          <p style="margin: 0; color: #444; line-height: 1.6; font-style: italic;">
            ${message.replace(/\n/g, "<br/>")}
          </p>
        </div>
      </div>
      
      <p style="margin-top: 20px; font-size: 13px; color: #888;">
        💡 You can reply directly to this email to respond to the sender.
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background: #1a472a; padding: 20px; text-align: center;">
      <p style="margin: 0; color: #d4e6d4; font-size: 12px;">🍔 ForksUp - Delicious Meals, Happy Customers</p>
      <p style="margin: 8px 0 0; color: #88b388; font-size: 11px;">© ${new Date().getFullYear()} ForksUp. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

const senderConfirmationHTML = ({ name }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Message Received - ForksUp</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
  </style>
</head>
<body style="margin: 0; padding: 0; background: #f5f5f5;">
  <div style="max-width: 550px; margin: 40px auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%); padding: 35px 25px; text-align: center;">
      <div style="font-size: 56px; margin-bottom: 10px;">🙏</div>
      <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700;">Message Received!</h1>
      <p style="margin: 10px 0 0; color: #fff3e0; font-size: 15px;">Thank you for reaching out to ForksUp</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 30px;">
      <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Hello <strong>${name}</strong>,</p>
      
      <p style="font-size: 14px; color: #555; line-height: 1.6;">Thank you for contacting <strong style="color: #ff6b35;">ForksUp</strong>. We have received your message and our team will get back to you as soon as possible.</p>
      
      <div style="background: #f8faf8; padding: 16px; border-radius: 12px; margin: 25px 0;">
        <p style="margin: 0; color: #666; font-size: 13px;">📩 Response Time:</p>
        <p style="margin: 5px 0 0; color: #1a472a; font-weight: 500;">Typically within 24 hours</p>
      </div>
      
      <div style="background: #fff9f0; padding: 16px; border-radius: 12px; margin: 20px 0; text-align: center;">
        <p style="margin: 0; font-size: 13px; color: #888;">💡 While you wait, why not explore our menu?</p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/menu" 
           style="background: #ff6b35; color: #fff; padding: 10px 25px; text-decoration: none; border-radius: 25px; display: inline-block; margin-top: 12px; font-weight: 500;">
          Browse Menu →
        </a>
      </div>
      
      <p style="font-size: 13px; color: #888; margin-top: 20px;">If your inquiry is urgent, please reply to this email or call us directly.</p>
      
      <p style="margin-top: 25px; font-size: 14px; color: #333;">
        Kind regards,<br/>
        <strong style="color: #ff6b35;">ForksUp Team</strong>
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background: #1a472a; padding: 20px; text-align: center;">
      <p style="margin: 0 0 8px; color: #d4e6d4; font-size: 12px;">🍔 ForksUp - Delicious Meals, Happy Customers</p>
      <p style="margin: 0; color: #88b388; font-size: 11px;">© ${new Date().getFullYear()} ForksUp. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

/* =======================
   Controller
======================= */
const sendContactMessage = async (req, res) => {
  const { name, email, message } = req.body;

  try {
    /* Validate input */
    const { error } = contactValidator.validate({ name, email, message });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    /* Email to company (admin) */
    await transporter.sendMail({
      from: `"ForksUp Contact" <${process.env.EMAIL}>`,
      to: process.env.ADMIN_EMAIL || process.env.EMAIL,
      replyTo: email,
      subject: `📩 New Contact Message from ${name} - ForksUp`,
      html: companyEmailHTML({ name, email, message })
    });

    /* Confirmation email to sender (customer) */
    await transporter.sendMail({
      from: `"ForksUp Team" <${process.env.EMAIL}>`,
      to: email,
      subject: "✅ We've received your message - ForksUp",
      html: senderConfirmationHTML({ name })
    });

    return res.status(200).json({
      success: true,
      message: "Message sent successfully"
    });

  } catch (err) {
    console.error("Contact form error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to send message",
      error: err.message
    });
  }
};

module.exports = sendContactMessage;