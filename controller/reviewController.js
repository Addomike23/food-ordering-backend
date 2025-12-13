const reviewModel = require('../model/reviewModel')
const cloudinary = require("../config/cloudinary");
const { reviewValidator } = require('../middleware/validator')
const transporter = require('../middleware/nodemailer')
const crypto = require("crypto");

function generateImageHash(buffer) {
    return crypto
        .createHash("sha256")
        .update(buffer)
        .digest("hex");
}

function uploadBufferToCloudinary(buffer, folder = "products") {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                quality: "auto",
                fetch_format: "auto",
                transformation: [
                    { width: 1200, crop: "limit" },
                    { quality: "auto" }
                ]
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );
        stream.end(buffer);
    });
}

// create review card
const createReview = async (req, res) => {
    // destruct review data
    const { name, email, content, role, rating } = req.body

    try {
        // validate review data
        const { error } = reviewValidator.validate({ name, email, content, role, rating })
        // send error response
        if (error) {
            return res.status(400).json({ success: false, message: error.details[0].message })
        }

        if (!req.file) {
            return res.status(400).json({ error: "Product image is required." });
        }



        // Upload image to Cloudinary
        const result = await uploadBufferToCloudinary(req.file.buffer);

        await transporter.sendMail({
            from: email,
            to: process.env.EMAIL,
            subject: "New Customer Feedback Received",

            attachments: [
                {
                    filename: "image.jpg",
                    path: encodeURI(`${result.secure_url}`),
                    cid: "image"
                }
            ],

            html: `
    <div style="max-width: 640px; margin: auto; background: #121212;
                font-family: Arial, sans-serif; color: #e0e0e0;
                border-radius: 10px; overflow: hidden;
                box-shadow: 0 6px 25px rgba(0,0,0,0.6);">

        <!-- Header -->
        <div style="background: linear-gradient(to right, #2e7d32, #1b5e20);
                    padding: 24px; text-align: center; color: #ffffff;">
            <h2 style="margin: 0; font-size: 22px;">New Customer Feedback</h2>
            <p style="margin-top: 6px; font-size: 14px; opacity: 0.9;">
                Review & testimonial notification
            </p>
        </div>

        <!-- Body -->
        <div style="padding: 28px 30px;">

            <!-- Sender Profile -->
            <div style="display: flex; align-items: center; margin-bottom: 20px;">
                <img src="cid:image" alt="Sender Avatar"
                     style="width: 55px; height: 55px; border-radius: 50%;
                            margin-right: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.4);">
                <div>
                    <p style="margin: 0; font-size: 16px; font-weight: bold; color: #ffffff;">
                        ${name}
                    </p>
                    <p style="margin: 4px 0 0; font-size: 13px; color: #9e9e9e;">
                        ${role}
                    </p>
                </div>
            </div>

            <!-- Rating -->
            <div style="margin-bottom: 18px;">
                <p style="margin: 0 0 6px; font-size: 14px; color: #bdbdbd;">
                    Rating
                </p>
                <div style="font-size: 20px; letter-spacing: 2px; color: #FFC107;">
                    ${"★".repeat(rating)}${"☆".repeat(5 - rating)}
                </div>
            </div>

            <!-- Feedback Content -->
            <div style="background: #1e1e1e; padding: 20px;
                        border-radius: 8px; border-left: 4px solid #4CAF50;">
                <p style="margin: 0; font-size: 14px; line-height: 1.7; color: #d4d4d4;">
                    ${content}
                </p>
            </div>

            <!-- Note -->
            <p style="margin-top: 22px; font-size: 13px; color: #9e9e9e;">
                This message was automatically generated. 
                Please log in to your dashboard to manage this feedback.
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


        // Create product
        const newReview = await reviewModel.create({
            name,
            content,
            role,
            rating,
            avatar: result.secure_url,
            public_id: result.public_id,

        });

        // Response to client
        res.status(201).json({
            success: true,
            message: "Review created successfully",
            reviews: newReview
        });

    } catch (error) {

        res.status(500).json({ error: err.message });

    }
}

// get all review
const allReview = async (req, res) => {
    try {
        // search DB for staffs
        const reviews = reviewModel.find().sort({ createdAt: -1 })
        res.status(201).json({ success: true, review: reviews })
    } catch (error) {
        res.status(500).json({ error: err.message });
    }
}

// delete staff
const deleteReview = async (req, res) => {
    try {
        const review = await reviewModel.findById(req.params.id);
        if (!review) {
            return res.status(404).json({ message: "staff not found" });
        }

        // Delete Cloudinary image
        if (review.public_id) {
            try {
                await cloudinary.uploader.destroy(review.public_id);
            } catch (err) {
                // console.warn("Cloudinary delete failed:", err.message);
                return res.status(400).json({ err: "Cloudinary delete failed:" })
            }
        }

        // Delete MongoDB record
        await review.deleteOne();

        res.json({ message: "review deleted successfully" });

    } catch (error) {

        res.status(500).json({ error: error.message, message: "internal error" });
    }
}

module.exports = { createReview, allReview, deleteReview }