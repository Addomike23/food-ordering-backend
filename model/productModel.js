const mongoose = require('mongoose')

// product model for DB

const productSchema = new mongoose.Schema({
    public_id: { type: String },
    imageHash: {
        type: String,
        unique: true,
        sparse: true
    },
    image: {
        type: String,
        require: true
    },
    category: {
        type: String,
        require: true
    },
    name: {
        type: String,
        require: true
    },
    status: {
        type: String,
        require: true
    },
    size: {
        type: String,
        require: true
    },
    description: {
        type: String,
        require: true
    },
    price: {
        type: String,
        require: true
    },
    datePublished: {
        type: Date, default: Date.now,
        required: true
    }

}, { timestamps: true })

const productModel = mongoose.model('product', productSchema)
module.exports = productModel