const mongoose = require('mongoose')


// Order model example
const orderSchema = new mongoose.Schema({
    orderNumber: { type: String, required: true, unique: true },
    customerInfo: {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        email: { type: String },
        address: { type: String },
        deliveryType: { type: String, enum: ['pickup', 'delivery'], default: 'pickup' },
        paymentMethod: { type: String, default: 'cash' },
    },
    items: [{
        productId: { type: String, required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
        totalPrice: { type: Number, required: true },
        images: [{ type: String }], // supports single or multiple images
        category: { type: String }
    }],
    

},{timestamps: true})

const orderModel = mongoose.model("client-order", orderSchema)
module.exports = orderModel