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
   Contact Controller
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

    /* Send email */
    await transporter.sendMail({
      from: `"Contact Form" <${process.env.EMAIL}>`,
      to: process.env.EMAIL,
      replyTo: email,
      subject: `📩 New Contact Message from ${name}`,
      html: `
<div style="max-width: 640px; margin: auto; background: #121212;
            font-family: Arial, sans-serif; color: #e0e0e0;
            border-radius: 12px; overflow: hidden;
            box-shadow: 0 8px 30px rgba(0,0,0,0.6);">

  <!-- Header -->
  <div style="background: linear-gradient(to right, #2e7d32, #1b5e20);
              padding: 26px; text-align: center;">
    <h2 style="margin: 0; color: #ffffff;">New Contact Message</h2>
    <p style="margin-top: 6px; font-size: 14px; opacity: 0.9;">
      Naya Axis Foods Website
    </p>
  </div>

  <!-- Body -->
  <div style="padding: 30px 28px;">

    <!-- Sender Info -->
    <div style="margin-bottom: 22px;">
      <p style="margin: 0; font-size: 14px; color: #9e9e9e;">From</p>
      <p style="margin: 4px 0 0; font-size: 17px; color: #ffffff;">
        ${name}
      </p>
      <p style="margin: 2px 0 0; font-size: 14px; color: #81c784;">
        ${email}
      </p>
    </div>

    <!-- Message -->
    <div style="background: #1e1e1e; padding: 22px;
                border-radius: 8px;
                border-left: 4px solid #4CAF50;">
      <p style="margin: 0; font-size: 14px; line-height: 1.7; color: #d4d4d4;">
        ${message.replace(/\n/g, "<br/>")}
      </p>
    </div>

    <!-- Footer Note -->
    <p style="margin-top: 26px; font-size: 13px; color: #9e9e9e;">
      You can reply directly to this email to respond to the sender.
    </p>
  </div>

  <!-- Footer -->
  <div style="background: #1a1a1a; padding: 16px; text-align: center;
              font-size: 12px; color: #8e8e8e;">
    <p style="margin: 0;">
      © ${new Date().getFullYear()} Naya Axis Foods
    </p>
  </div>
</div>
`
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
