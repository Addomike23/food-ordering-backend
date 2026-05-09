const connectDB = require("../utils/connectDB");
const reviewModel = require("../model/reviewModel");
const cloudinary = require("../config/cloudinary");
const { reviewValidator } = require("../middleware/validator");
const transporter = require("../middleware/nodemailer");

/* =========================
   Helper: Render Star Rating with Emojis
========================= */
function renderStarRating(rating) {
  const fullStar = "⭐";
  const emptyStar = "☆";
  return fullStar.repeat(rating) + emptyStar.repeat(5 - rating);
}

function renderStarRatingText(rating) {
  const stars = {
    5: "⭐⭐⭐⭐⭐ (Excellent!)",
    4: "⭐⭐⭐⭐ (Very Good)",
    3: "⭐⭐⭐ (Good)",
    2: "⭐⭐ (Fair)",
    1: "⭐ (Poor)"
  };
  return stars[rating] || "⭐⭐⭐ (Good)";
}

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


// ForksUp Configuration
const FORKSUP_URL = process.env.FRONTEND_URL || 'https://foodorderio.vercel.app';
const FORKSUP_NAME = 'ForksUp';
const FORKSUP_TAGLINE = 'Delicious Meals, Happy Customers';
const FORKSUP_EMAIL = process.env.EMAIL;


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
      "forksup-reviews"
    );

    // ✅ Save to DB
    const newReview = await reviewModel.create({
      name,
      email,
      content,
      rating,
      avatar: upload.secure_url
    });

    // ✅ Send PROFESSIONAL ADMIN EMAIL (ForksUp Branding)
    await transporter.sendMail({
      from: `"${FORKSUP_NAME} Reviews" <${FORKSUP_EMAIL}>`,
      to: process.env.ADMIN_EMAIL || FORKSUP_EMAIL,
      subject: `⭐ New ${rating}-Star Review from ${name} - ${FORKSUP_NAME}`,
      attachments: [
        {
          filename: "customer-avatar.jpg",
          path: upload.secure_url,
          cid: "customerAvatar"
        }
      ],
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New ${FORKSUP_NAME} Review</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
          </style>
        </head>
        <body style="margin: 0; padding: 0; background: #f5f5f5;">
          <div style="max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.08);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%); padding: 30px 20px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 10px;">🍽️</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">New ${FORKSUP_NAME} Review!</h1>
              <p style="margin: 8px 0 0; color: #fff3e0; font-size: 14px;">A customer just shared their experience</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px;">
              <!-- Customer Info -->
              <div style="background: #f8faf8; padding: 20px; border-radius: 16px; margin-bottom: 25px;">
                <div style="display: flex; align-items: center; gap: 15px;">
                  <img src="cid:customerAvatar" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 3px solid #ff6b35;" />
                  <div>
                    <h3 style="margin: 0 0 4px; color: #ff6b35; font-size: 18px;">${name}</h3>
                    <p style="margin: 0; color: #666; font-size: 13px;">${email}</p>
                  </div>
                </div>
              </div>
              
              <!-- Rating Section -->
              <div style="text-align: center; padding: 20px; background: #fff9f0; border-radius: 16px; margin-bottom: 25px;">
                <div style="font-size: 48px; letter-spacing: 4px; margin-bottom: 10px;">
                  ${renderStarRating(rating)}
                </div>
                <div style="font-size: 24px; font-weight: 700; color: #ff6b35;">
                  ${rating}.0 / 5.0
                </div>
                <div style="font-size: 14px; color: #888; margin-top: 8px;">
                  ${renderStarRatingText(rating)}
                </div>
              </div>
              
              <!-- Review Content -->
              <div style="margin-bottom: 20px;">
                <h3 style="margin: 0 0 8px; color: #ff6b35; font-size: 16px;">📝 Customer Review</h3>
                <div style="background: #f8faf8; padding: 16px; border-radius: 12px; color: #444; line-height: 1.6; font-style: italic;">
                  "${content}"
                </div>
              </div>
              
              <!-- Action Buttons -->
              <div style="display: flex; gap: 12px; margin-top: 25px;">
                <a href="${FORKSUP_URL}/admin/reviews" 
                   style="flex: 1; background: #ff6b35; color: #ffffff; padding: 12px; text-decoration: none; border-radius: 30px; text-align: center; font-weight: 500;">
                  📋 View All Reviews
                </a>
                <a href="${FORKSUP_URL}/reviews" 
                   style="flex: 1; background: #ff6b35; color: #ffffff; padding: 12px; text-decoration: none; border-radius: 30px; text-align: center; font-weight: 500;">
                  👀 View on Site
                </a>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background: #f8faf8; padding: 20px; text-align: center; border-top: 1px solid #e0e5e0;">
              <p style="margin: 0; color: #999; font-size: 11px;">
                This is an automated notification from ${FORKSUP_NAME}.
              </p>
              <p style="margin: 10px 0 0; color: #ff6b35; font-size: 12px;">🍔 ${FORKSUP_NAME} - ${FORKSUP_TAGLINE}</p>
              <p style="margin: 5px 0 0; color: #999; font-size: 11px;">${FORKSUP_URL}</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    // ✅ Send CONFIRMATION EMAIL TO CUSTOMER (ForksUp Branding)
    if (email && email !== process.env.ADMIN_EMAIL) {
      await transporter.sendMail({
        from: `"${FORKSUP_NAME} Team" <${FORKSUP_EMAIL}>`,
        to: email,
        subject: `Thank You for Your Review, ${name}! 🍔`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Thank You for Your Review</title>
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
                <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 600;">Thank You, ${name}!</h1>
                <p style="margin: 10px 0 0; color: #fff3e0; font-size: 15px;">Your review helps us serve you better</p>
              </div>
              
              <!-- Content -->
              <div style="padding: 30px;">
                <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Dear <strong>${name}</strong>,</p>
                
                <p style="font-size: 14px; color: #555; line-height: 1.6;">Thank you for taking the time to share your feedback about <strong style="color: #ff6b35;">${FORKSUP_NAME}</strong>. We truly appreciate your honest review!</p>
                
                <!-- Review Summary -->
                <div style="background: #f8faf8; padding: 20px; border-radius: 16px; margin: 25px 0; text-align: center;">
                  <div style="font-size: 48px; letter-spacing: 3px; margin-bottom: 10px;">
                    ${renderStarRating(rating)}
                  </div>
                  <div style="font-size: 18px; font-weight: 600; color: #ff6b35; margin-bottom: 5px;">
                    ${rating}.0 / 5.0
                  </div>
                  <div style="font-size: 14px; color: #666;">${renderStarRatingText(rating)}</div>
                </div>
                
                <div style="background: #fff9f0; padding: 16px; border-radius: 12px; margin: 20px 0;">
                  <p style="margin: 0; color: #555; font-style: italic; line-height: 1.5;">"${content}"</p>
                </div>
                
                <!-- Special Offer -->
                <div style="background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%); padding: 20px; border-radius: 16px; margin: 25px 0; text-align: center;">
                  <div style="font-size: 32px; margin-bottom: 10px;">🎁</div>
                  <h3 style="color: #fff; margin: 0 0 8px;">Special Thank You Gift!</h3>
                  <p style="color: #fff3e0; margin: 0 0 15px;">Use code: <strong style="font-size: 20px;">FORKSUP15</strong> for 15% off your next order</p>
                  <a href="${FORKSUP_URL}/menu" 
                     style="background: #fff; color: #ff6b35; padding: 10px 25px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: 600;">
                    Order Now →
                  </a>
                </div>
                
                <p style="font-size: 13px; color: #999; text-align: center; margin-top: 20px;">
                  Your feedback makes ${FORKSUP_NAME} better every day. Thank you for being part of our community!<br/>
                  Questions? Contact us at ${process.env.SUPPORT_PHONE || '+233 XXX XXX XXXX'}
                </p>
              </div>
              
              <!-- Footer -->
              <div style="background: #1a472a; padding: 20px; text-align: center;">
                <p style="margin: 0; color: #d4e6d4; font-size: 12px;">© ${new Date().getFullYear()} ${FORKSUP_NAME} - ${FORKSUP_TAGLINE}</p>
                <p style="margin: 5px 0 0; color: #88b388; font-size: 11px;">${FORKSUP_URL}</p>
              </div>
            </div>
          </body>
          </html>
        `
      });
    }

    res.status(201).json({
      success: true,
      message: "Review created successfully",
      review: newReview
    });

  } catch (error) {
    console.error("Create review error:", error);
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

    const { limit = 50, minRating } = req.query;

    let filter = {};
    if (minRating) filter.rating = { $gte: parseInt(minRating) };

    const reviews = await reviewModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    // Calculate average rating
    const avgRatingResult = await reviewModel.aggregate([
      { $group: { _id: null, average: { $avg: "$rating" }, total: { $sum: 1 } } }
    ]);

    const averageRating = avgRatingResult[0]?.average || 0;
    const totalReviews = avgRatingResult[0]?.total || 0;

    // Rating distribution
    const distribution = await reviewModel.aggregate([
      { $group: { _id: "$rating", count: { $sum: 1 } } },
      { $sort: { _id: -1 } }
    ]);

    const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    distribution.forEach(d => { ratingDistribution[d._id] = d.count; });

    res.status(200).json({
      success: true,
      stats: {
        averageRating: parseFloat(averageRating.toFixed(1)),
        totalReviews,
        ratingDistribution
      },
      count: reviews.length,
      reviews
    });

  } catch (error) {
    console.error("Get reviews error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* =========================
   GET SINGLE REVIEW
========================= */
const getSingleReview = async (req, res) => {
  try {
    await connectDB();

    const review = await reviewModel.findById(req.params.id).lean();

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found"
      });
    }

    res.status(200).json({
      success: true,
      review
    });

  } catch (error) {
    console.error("Get single review error:", error);
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
      return res.status(404).json({
        success: false,
        message: "Review not found"
      });
    }

    // Extract public_id from avatar URL if needed
    if (review.avatar) {
      const publicId = review.avatar.split('/').slice(-2).join('/').split('.')[0];
      await cloudinary.uploader.destroy(publicId).catch(() => { });
    }

    await review.deleteOne();

    res.status(200).json({
      success: true,
      message: "Review deleted successfully"
    });

  } catch (error) {
    console.error("Delete review error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createReview,
  allReview,
  getSingleReview,
  deleteReview
};