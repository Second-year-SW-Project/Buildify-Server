import express from "express";
import { protect } from "../middleware/authMiddleware.js"
import { checkout, getOrders, deleteOrder, getProductOrders, getSingleOrder, updateOrderStatus, getOrderSummary, getOrdersSummaryTotals } from "../controller/checkoutController.js";

const checkoutrouter = express.Router();

//Create Order
checkoutrouter.post("/payment", checkout);

//Get all orders
checkoutrouter.get("/payment", getOrders);

//Delete Order
checkoutrouter.delete("/order/:id", deleteOrder);

//Get all orders of a user
checkoutrouter.get("/product-orders", protect, getProductOrders);

//Get single order by id
checkoutrouter.get("/order/:id", protect, getSingleOrder);

//Get normal order Summary
checkoutrouter.get("/order-summary", protect, getOrderSummary);

//get order summary total
checkoutrouter.get("/order-summary-total", protect, getOrdersSummaryTotals);

//Update order status by id
checkoutrouter.patch("/product-orders/:id", updateOrderStatus);

export default checkoutrouter; 