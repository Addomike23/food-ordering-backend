const staffModel = require('../model/staffModel')
const cloudinary = require("../config/cloudinary");
const {staffValidator} = require('../middleware/validator')
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


// create staff

const createStaff = async (req, res) => {
    // destruct staff object from request body
    const { title, position } = req.body

    // try catch block
    try {
        // validate user data
        const { error } = staffValidator.validate({ position, title });
        if (error) {
            return res.status(400).json({
                success: false,
                message: error.details[0].message,
            });
        }

        if (!req.file) {
            return res.status(400).json({ error: "Product image is required." });
        }

        // Generate hash of uploaded image
        const imageHash = generateImageHash(req.file.buffer);

        // Check for duplicates
        const existingProduct = await staffModel.findOne({ imageHash });
        if (existingProduct) {
            return res.status(409).json({
                success: false,
                message: "A staff with this image already exists.",
            });
        }

        // Upload image to Cloudinary
        const result = await uploadBufferToCloudinary(req.file.buffer);

        // Create product
        const newStaff = await staffModel.create({
            title,
            position,
            image: result.secure_url,
            public_id: result.public_id,
            imageHash
        });

        // Response to client
        res.status(201).json({
            success: true,
            message: "staff created successfully",
            product: newStaff
        });

    } catch (error) {

        // console.error("Create product error:", error);
        res.status(500).json({ error: error.message });
    }

}

// fetch all staff
const getStaff = async (req, res) => {
    try {
        // search DB for staffs
        const staffs = staffModel.find().sort({ createdAt: -1 })
        res.status(201).json({ success: true, staff: staffs })
    } catch (error) {
        res.status(500).json({ error: err.message });
    }
}

// delete staff
const deleteStaff = async (req, res) => {
    try {
        const staff = await staffModel.findById(req.params.id);
        if (!staff) {
            return res.status(404).json({ message: "staff not found" });
        }

        // Delete Cloudinary image
        if (staff.public_id) {
            try {
                await cloudinary.uploader.destroy(staff.public_id);
            } catch (err) {
                console.warn("Cloudinary delete failed:", err.message);
            }
        }

        // Delete MongoDB record
        await staff.deleteOne();

        res.json({ message: "staff deleted successfully" });

    } catch (error) {

        res.status(500).json({ error: err.message });
    }
}

module.exports = { createStaff, getStaff, deleteStaff }