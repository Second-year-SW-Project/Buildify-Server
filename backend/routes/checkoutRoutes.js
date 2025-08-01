import express from "express";
import { protect } from "../middleware/authMiddleware.js"
import { isAdmin, isUser } from "../middleware/roleMiddleware.js";
import { checkout, getOrderList, deleteOrder, getProductOrders, getSingleOrder, updateOrderStatus, getOrderSummary, getOrdersSummaryTotals, getBarChartSummary } from "../controller/checkoutController.js";
import { validateObjectId } from "../middleware/validateObjectId.js";

const checkoutrouter = express.Router();

//Create Order
checkoutrouter.post("/payment", checkout);

//Get all orders
checkoutrouter.get("/payment", protect, isAdmin, getOrderList);

//Delete Order
checkoutrouter.delete("/order/:id", protect, isAdmin, validateObjectId, deleteOrder);

//Get all orders of a user
checkoutrouter.get("/product-orders", protect, getProductOrders);

//Get single order by id
checkoutrouter.get("/order/:id", protect, validateObjectId, getSingleOrder);

//Get normal order Summary
checkoutrouter.get("/order-summary", protect, isAdmin, getOrderSummary);

//get order summary total
checkoutrouter.get("/order-summary-total", protect, isAdmin, getOrdersSummaryTotals);

//Update order status by id
checkoutrouter.patch("/product-orders/:id", protect, validateObjectId, updateOrderStatus);

//Get bar chart summary data for dashboard analytics
checkoutrouter.get("/bar-chart-summary", protect, isAdmin, getBarChartSummary);

export default checkoutrouter;