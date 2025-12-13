const connectDB = require("../utils/connectDB");
const staffModel = require("../model/staffModel");
const cloudinary = require("../config/cloudinary");
const { staffValidator } = require("../middleware/validator");
const crypto = require("crypto");

/* =========================
   Helpers
========================= */
function generateImageHash(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function uploadBufferToCloudinary(buffer, folder = "staff") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `success-axis-food/${folder}`,
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
   CREATE STAFF
========================= */
const createStaff = async (req, res) => {
  try {
    await connectDB();

    const { title, position } = req.body;

    const { error } = staffValidator.validate({ title, position });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: "Staff image is required"
      });
    }

    const imageHash = generateImageHash(req.file.buffer);

    const existingStaff = await staffModel
      .findOne({ imageHash })
      .lean();

    if (existingStaff) {
      return res.status(409).json({
        success: false,
        message: "A staff member with this image already exists"
      });
    }

    const upload = await uploadBufferToCloudinary(
      req.file.buffer,
      "staff"
    );

    const newStaff = await staffModel.create({
      title,
      position,
      image: upload.secure_url,
      public_id: upload.public_id,
      imageHash
    });

    res.status(201).json({
      success: true,
      message: "Staff created successfully",
      staff: newStaff
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating staff",
      error: error.message
    });
  }
};

/* =========================
   GET ALL STAFF
========================= */
const getStaff = async (req, res) => {
  try {
    await connectDB();

    const staffs = await staffModel
      .find()
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      staff: staffs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* =========================
   DELETE STAFF
========================= */
const deleteStaff = async (req, res) => {
  try {
    await connectDB();

    const staff = await staffModel.findById(req.params.id);
    if (!staff) {
      return res.status(404).json({ message: "Staff not found" });
    }

    if (staff.public_id) {
      await cloudinary.uploader.destroy(staff.public_id).catch(() => {});
    }

    await staff.deleteOne();

    res.status(200).json({
      success: true,
      message: "Staff deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createStaff,
  getStaff,
  deleteStaff
};
