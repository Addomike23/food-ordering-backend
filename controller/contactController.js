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
   Email Templates
======================= */
const companyEmailHTML = ({ name, email, message }) => `
<div style="max-width:640px;margin:auto;background:#121212;
            font-family:Arial,sans-serif;color:#e0e0e0;
            border-radius:12px;overflow:hidden;
            box-shadow:0 8px 30px rgba(0,0,0,.6);">

  <div style="background:linear-gradient(to right,#2e7d32,#1b5e20);
              padding:26px;text-align:center;">
    <h2 style="margin:0;color:#fff;">New Contact Message</h2>
    <p style="margin-top:6px;font-size:14px;opacity:.9;">
      Naya Axis Foods Website
    </p>
  </div>

  <div style="padding:30px 28px;">
    <p style="font-size:14px;color:#9e9e9e;margin:0;">From</p>
    <p style="font-size:17px;color:#fff;margin:4px 0 0;">${name}</p>
    <p style="font-size:14px;color:#81c784;margin:2px 0 18px;">
      ${email}
    </p>

    <div style="background:#1e1e1e;padding:22px;border-radius:8px;
                border-left:4px solid #4CAF50;">
      <p style="margin:0;font-size:14px;line-height:1.7;color:#d4d4d4;">
        ${message.replace(/\n/g, "<br/>")}
      </p>
    </div>

    <p style="margin-top:24px;font-size:13px;color:#9e9e9e;">
      You can reply directly to this email to respond to the sender.
    </p>
  </div>

  <div style="background:#1a1a1a;padding:16px;text-align:center;
              font-size:12px;color:#8e8e8e;">
    © ${new Date().getFullYear()} Naya Axis Foods
  </div>
</div>
`;

const senderConfirmationHTML = ({ name }) => `
<div style="max-width:640px;margin:auto;background:#ffffff;
            font-family:Arial,sans-serif;color:#333;
            border-radius:12px;overflow:hidden;
            box-shadow:0 8px 30px rgba(0,0,0,.15);">

  <div style="background:#2e7d32;padding:26px;text-align:center;">
    <h2 style="margin:0;color:#fff;">Message Received</h2>
  </div>

  <div style="padding:28px;">
    <p style="font-size:16px;">Hello ${name},</p>

    <p style="font-size:14px;line-height:1.7;">
      Thank you for contacting <strong>Naya Axis Foods</strong>.
      We have received your message and our team will get back to you
      as soon as possible.
    </p>

    <p style="font-size:14px;line-height:1.7;">
      If your inquiry is urgent, please reply to this email.
    </p>

    <p style="margin-top:26px;font-size:14px;">
      Kind regards,<br/>
      <strong>Naya Axis Foods Team</strong>
    </p>
  </div>

  <div style="background:#f5f5f5;padding:14px;text-align:center;
              font-size:12px;color:#777;">
    © ${new Date().getFullYear()} Naya Axis Foods
  </div>
</div>
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

    /* Email to company */
    await transporter.sendMail({
      from: `"Website Contact" <${process.env.EMAIL}>`,
      to: process.env.EMAIL,
      replyTo: email,
      subject: `📩 New Contact Message from ${name}`,
      html: companyEmailHTML({ name, email, message })
    });

    /* Confirmation email to sender */
    await transporter.sendMail({
      from: `"Naya Axis Foods" <${process.env.EMAIL}>`,
      to: email,
      subject: "✅ We’ve received your message",
      html: senderConfirmationHTML({ name })
    });

    return res.status(200).json({
      success: true,
      message: "Message sent successfully"
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to send message",
      error: err.message
    });
  }
};

module.exports = sendContactMessage;
