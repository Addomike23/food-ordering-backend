const connectDB = require("../utils/connectDB");
const reviewModel = require("../model/reviewModel");
const cloudinary = require("../config/cloudinary");
const { reviewValidator } = require("../middleware/validator");
const transporter = require("../middleware/nodemailer");

/* =========================
   Cloudinary Upload Helper
========================= */
function uploadBufferToCloudinary(buffer, folder = "reviews") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        quality: "auto",
        fetch_format: "auto",
        transformation: [{ width: 600, crop: "limit" }]
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

/* =========================
   CREATE REVIEW
========================= */
const createReview = async (req, res) => {
  try {
    await connectDB();

    const { name, email, content, rating } = req.body;

    const { error } = reviewValidator.validate({
      name,
      email,
      content,
      rating
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: "Reviewer image is required"
      });
    }

    const upload = await uploadBufferToCloudinary(
      req.file.buffer,
      "success-axis-food/reviews"
    );

    // ✅ Save to DB FIRST
    const newReview = await reviewModel.create({
      name,
      email,
      content,
      rating,
      avatar: upload.secure_url,
      public_id: upload.public_id
    });

    // ✅ Send email AFTER DB success
    await transporter.sendMail({
      from: email,
      to: process.env.EMAIL,
      subject: "New Customer Feedback Received",
      attachments: [
        {
          filename: "avatar.jpg",
          path: upload.secure_url,
          cid: "avatar"
        }
      ],
      html: `
        <div style="max-width:640px;margin:auto;background:#121212;color:#e0e0e0;
                    font-family:Arial;border-radius:10px;overflow:hidden;">
          <div style="padding:24px;background:#1b5e20;color:#fff;text-align:center">
            <h2>New Customer Feedback</h2>
          </div>
          <div style="padding:24px">
            <div style="display:flex;align-items:center;margin-bottom:16px">
              <img src="cid:avatar" style="width:55px;height:55px;border-radius:50%;margin-right:14px"/>
              <div>
                <strong>${name}</strong><br/>
                
              </div>
            </div>
            <div style="color:#FFC107;font-size:18px;margin-bottom:12px">
              ${"★".repeat(rating)}${"☆".repeat(5 - rating)}
            </div>
            <p>${content}</p>
          </div>
        </div>
      `
    });

    res.status(201).json({
      success: true,
      message: "Review created successfully",
      review: newReview
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating review",
      error: error.message
    });
  }
};

/* =========================
   GET ALL REVIEWS
========================= */
const allReview = async (req, res) => {
  try {
    await connectDB();

    const reviews = await reviewModel
      .find()
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      reviews
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* =========================
   DELETE REVIEW
========================= */
const deleteReview = async (req, res) => {
  try {
    await connectDB();

    const review = await reviewModel.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (review.public_id) {
      await cloudinary.uploader.destroy(review.public_id).catch(() => {});
    }

    await review.deleteOne();

    res.status(200).json({
      success: true,
      message: "Review deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createReview,
  allReview,
  deleteReview
};
