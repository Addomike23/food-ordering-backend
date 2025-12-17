const express = require("express");
const orderRouter = express.Router();
const { createOrder, getOrders } = require("../controller/orderItemController");

orderRouter.post("/order", createOrder);
orderRouter.get("/orders", getOrders);

module.exports = orderRouter;
