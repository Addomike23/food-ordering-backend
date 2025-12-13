const express = require("express");
const productRouter = express.Router();
const productController = require("../controller/productController");
const upload = require("../middleware/multer"); // multer config

// CREATE
productRouter.post("/create-product", upload.single("image"), productController.createProduct);

// READ
productRouter.get("/get-product", productController.getProducts);
// productRouter.get("/targeted-product/:id", productController.getSingleProduct);

// UPDATE
productRouter.put("/update-product/:id", upload.single("image"), productController.updateProduct);

// DELETE
productRouter.delete("/products/:id", productController.deleteProduct);

module.exports = productRouter;
