const connectDB = require("../utils/connectDB");
const productModel = require("../model/productModel");
const cloudinary = require("../config/cloudinary");
const { productValidator } = require("../middleware/validator");
const crypto = require("crypto");


/* =========================
   Helpers
========================= */
function generateImageHash(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function uploadBufferToCloudinary(buffer, folder = "products") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        quality: "auto",
        fetch_format: "auto",
        transformation: [{ width: 1200, crop: "limit" }]
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
   CREATE PRODUCT
========================= */
exports.createProduct = async (req, res) => {
  try {
    await connectDB();

    const { title, category, description, price } = req.body;

    const { error } = productValidator.validate({
      title,
      category,
      description,
      price
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
        message: "Product image is required"
      });
    }

    const imageHash = generateImageHash(req.file.buffer);

    const existingProduct = await productModel.findOne({ imageHash }).lean();
    if (existingProduct) {
      return res.status(409).json({
        success: false,
        message: "A product with this image already exists"
      });
    }

    const upload = await uploadBufferToCloudinary(
      req.file.buffer,
      "success-axis-food/products"
    );

    const newProduct = await productModel.create({
      title,
      category,
      description,
      price,
      image: upload.secure_url,
      public_id: upload.public_id,
      imageHash
    });

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: newProduct
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error creating product",
      error: err.message
    });
  }
};

/* =========================
   GET ALL PRODUCTS
========================= */
exports.getProducts = async (req, res) => {
  try {
    await connectDB();

    const products = await productModel
      .find()
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: products
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/* =========================
   UPDATE PRODUCT
========================= */
exports.updateProduct = async (req, res) => {
  try {
    await connectDB();

    const { title, category, description, price } = req.body;

    const { error } = productValidator.validate({
      title,
      category,
      description,
      price
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const product = await productModel.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    let image = product.image;
    let public_id = product.public_id;

    if (req.file && req.file.buffer) {
      if (public_id) {
        await cloudinary.uploader.destroy(public_id).catch(() => {});
      }

      const upload = await uploadBufferToCloudinary(
        req.file.buffer,
        "success-axis-food/products"
      );

      image = upload.secure_url;
      public_id = upload.public_id;
    }

    const updatedProduct = await productModel.findByIdAndUpdate(
      req.params.id,
      {
        title,
        category,
        description,
        price,
        image,
        public_id
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Product updated",
      data: updatedProduct
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error updating product",
      error: err.message
    });
  }
};

/* =========================
   DELETE PRODUCT
========================= */
exports.deleteProduct = async (req, res) => {
  try {
    await connectDB();

    const productDoc = await productModel.findById(req.params.id);
    if (!productDoc) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (productDoc.public_id) {
      await cloudinary.uploader.destroy(productDoc.public_id).catch(() => {});
    }

    await productDoc.deleteOne();

    res.status(200).json({
      success: true,
      message: "Product deleted successfully"
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error deleting product",
      error: err.message
    });
  }
};
