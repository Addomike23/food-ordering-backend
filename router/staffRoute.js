const express = require('express')
const staffRouter = express.Router()
const upload = require("../middleware/multer"); // multer config
const {createStaff, getStaff, deleteStaff} = require('../controller/staffController')


// CREATE STAFF ROUTE
staffRouter.post('/create-staff', upload.single("image"), createStaff)

// GET STAFF
staffRouter.get('/get-staff', getStaff)

// DELETE STAFF
staffRouter.delete('/delete-staff/:id', deleteStaff)

module.exports = staffRouter