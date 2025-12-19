const express = require("express");
const orderRouter = express.Router();
const { createOrder, getOrders, deleteAllOrders } = require("../controller/orderItemController");

orderRouter.post("/order", createOrder);
orderRouter.get("/orders", getOrders);
orderRouter.delete("/orders", deleteAllOrders);


module.exports = orderRouter;
