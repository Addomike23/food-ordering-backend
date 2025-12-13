// controllers/blogController.js
const fs = require("fs"); // kept in case you later use disk paths
const blog = require("../model/blogModel"); // ensure this exports the mongoose model
const cloudinary = require("../config/cloudinary");
const {blogValidator, allowedUpdateSchema} = require('../middleware/validator')



/**
 * Upload buffer to Cloudinary using upload_stream (provided earlier).
 * Assumes cloudinary.v2 configured.
 */
function uploadBufferToCloudinary(buffer, folder = "blogs") {
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


// CREATE
exports.createBlog = async (req, res) => {
    const {title, category, description} = req.body

  try {
    // 1) Ensure file exists (multer memory storage expected)
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: "Image file is required (key: 'image')." });
    }

    const { error } = blogValidator.validate({ category, title, description });
        if (error) {
            return res.status(400).json({
                success: false,
                message: error.details[0].message,
            });
        }

    // 3) Upload image to Cloudinary
    const result = await uploadBufferToCloudinary(req.file.buffer, "success-axis-food/blogs");

    // 4) Save to DB (include public_id for easier deletes)
    const newBlog = await blog.create({
      title: title,
      category: category,
      description: description,
      image: result.secure_url,
      public_id: result.public_id
    });

    return res.status(201).json({ message: "Blog created", blog: newBlog });

  } catch (err) {
    // console.error("createBlog error:", err);
    // Handle common Cloudinary errors vs generic
    return res.status(500).json({ message: "Error creating blog", error: err.message });
  }
};

// GET ALL
exports.getBlogs = async (req, res) => {
  try {
    // search and fetch all block post
    const blogs = await blog.find().sort({ createdAt: -1 });

    // send respond data to client
    res.status(201).json({success: true, blogData: blogs});
  } catch (err) {

    res.status(500).json({ message: err.message });
  }
};

// GET ONE
exports.getSingleBlog = async (req, res) => {
  try {
    const blogs = await blog.findById(req.params.id);
    if (!blogs) return res.status(404).json({ message: "Blog not found" });
    res.json(blogs);
  } catch (err) {
    // console.error("getSingleBlog error:", err);
    res.status(500).json({ message: err.message });
  }
};

// UPDATE BLOG (with optional new image)
exports.updateBlog = async (req, res) => {
  try {
    
    const { error, value } = allowedUpdateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const details = error.details.map(d => d.message);
      return res.status(400).json({ error: "Validation failed", details });
    }

    const blogDoc = await blog.findById(req.params.id);
    if (!blogDoc) return res.status(404).json({ message: "Blog not found" });

    let imageUrl = blogDoc.image;
    let public_id = blogDoc.public_id;

    // If a new image is uploaded, replace in Cloudinary
    if (req.file && req.file.buffer) {
      // Delete old image if public_id exists
      if (public_id) {
        try {
          await cloudinary.uploader.destroy(public_id);
        } catch (delErr) {
          // Log but continue — do not stop update if delete fails
          console.warn("Failed to delete old image:", delErr.message || delErr);
        }
      }

      const uploadResult = await uploadBufferToCloudinary(req.file.buffer, "success-axis-food/blogs");
      imageUrl = uploadResult.secure_url;
      public_id = uploadResult.public_id;
    }

    // Build update object
    const updatePayload = {
      ...value, // validated text fields
      image: imageUrl,
      public_id
    };

    const updated = await blog.findByIdAndUpdate(req.params.id, updatePayload, { new: true, runValidators: true });

    res.json({ message: "Blog updated", blog: updated });
  } catch (err) {
    // console.error("updateBlog error:", err);
    res.status(500).json({ message: "Error updating blog", error: err.message });
  }
};

// DELETE BLOG
exports.deleteBlog = async (req, res) => {
  try {
    const blogDoc = await blog.findById(req.params.id);
    if (!blogDoc) return res.status(404).json({ message: "Blog not found" });

    // Remove image from Cloudinary if we have public_id
    if (blogDoc.public_id) {
      try {
        await cloudinary.uploader.destroy(blogDoc.public_id);
      } catch (err) {
        console.warn("Cloudinary delete failed:", err.message || err);
        // continue to delete DB record regardless
      }
    }

    // Remove blog from DB
    await blogDoc.deleteOne();

    res.json({ message: "Blog deleted successfully" });
  } catch (err) {
    // console.error("deleteBlog error:", err);
    res.status(500).json({ message: "Error deleting blog", error: err.message });
  }
};
