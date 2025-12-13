const mongoose = require('mongoose')

// message model for users

const messageSchema = new mongoose.Schema({
    name: {
        type: String,
        require: true
    },
    email: {
        type: String,
        require: true
    },
    phone: {
        type: Number,
        require: true
    },
    message: {
        type: String,
        require: true
    }
}, {timestamps: true})

const clientEnquiry = mongoose.model("enquiry", messageSchema)
module.exports = clientEnquiry