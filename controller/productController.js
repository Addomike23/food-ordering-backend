const productModel = require("../model/productModel");
const cloudinary = require("../config/cloudinary");
const {productValidator} = require('../middleware/validator')
const crypto = require("crypto");

function generateImageHash(buffer) {
    return crypto
        .createHash("sha256")
        .update(buffer)
        .digest("hex");
}


// UTILITY: Upload buffer to Cloudinary
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


// create product controller
exports.createProduct = async (req, res) => {
    const { category, title, description, price } = req.body;

    try {
        // Validate fields
        const { error } = productValidator.validate({ category, price, title, description });
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
        const existingProduct = await productModel.findOne({ imageHash });
        if (existingProduct) {
            return res.status(409).json({
                success: false,
                message: "A product with this image already exists.",
            });
        }

        // Upload image to Cloudinary
        const result = await uploadBufferToCloudinary(req.file.buffer);

        // Create product
        const newProduct = await productModel.create({
            title,
            category,
            description,
            price,
            image: result.secure_url,
            public_id: result.public_id,
            imageHash
        });

        // Response to client
        res.status(201).json({
            success: true,
            message: "Product created successfully",
            product: newProduct
        });

    } catch (err) {
        // console.error("Create product error:", err);
        res.status(500).json({ error: err.message });
    }
};


// fetch all products
exports.getProducts = async (req, res) => {
    try {
        const products = await productModel.find().sort({ createdAt: -1 });

        res.json({ success: true, data: products });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// update product
exports.updateProduct = async (req, res) => {
    const {title, category, price, description} = req.body
    try {
        // Validate fields
        const { error } = productValidator.validate({ category, price, title, description });
        if (error) {
            return res.status(400).json({
                success: false,
                message: error.details[0].message,
            });
        }

        const product = await productModel.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        let imageUrl = product.image;
        let public_id = product.public_id;

        // New image uploaded?
        if (req.file) {
            // delete old image
            if (product.public_id) {
                try {
                    await cloudinary.uploader.destroy(product.public_id);
                } catch (error) {
                    console.warn("Cloudinary delete failed:", error.message);
                }
            }

            // upload new image
            const result = await uploadBufferToCloudinary(req.file.buffer);
            imageUrl = result.secure_url;
            public_id = result.public_id;
        }

        const updated = await productModel.findByIdAndUpdate(
            req.params.id,
            {
                title: title,
                category: category,
                price: price,
                description: description,
                image: imageUrl,
                public_id
            },
            { new: true }
        );

        res.json({ success: true, message: "Product updated", data: updated });

    } catch (err) {
        // console.error("Update product error:", err);
        res.status(500).json({ error: err.message });
    }
};

// Delete product controller

exports.deleteProduct = async (req, res) => {
    try {
        const productDoc = await productModel.findById(req.params.id);
        if (!productDoc) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Delete Cloudinary image
        if (productDoc.public_id) {
            try {
                await cloudinary.uploader.destroy(productDoc.public_id);
            } catch (err) {
                console.warn("Cloudinary delete failed:", err.message);
            }
        }

        // Delete MongoDB record
        await productDoc.deleteOne();

        res.json({ message: "Product deleted successfully" });

    } catch (err) {
        // console.error("Delete product error:", err);
        res.status(500).json({ error: err.message });
    }
};
