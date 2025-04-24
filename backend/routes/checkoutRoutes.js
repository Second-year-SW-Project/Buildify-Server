import express from "express";
import { protect } from "../middleware/authMiddleware.js"
import { checkout, getOrders, getProductOrders, getSinglOrder, updateOrderStatus } from "../controller/checkoutController.js";

const checkoutrouter = express.Router();

checkoutrouter.post("/checkout", checkout);
checkoutrouter.get("/checkout", getOrders);
checkoutrouter.get("/product-orders", protect, getProductOrders);
checkoutrouter.get("/order/:id", protect, getSinglOrder);
checkoutrouter.patch("/product-orders/:id", updateOrderStatus);

export default checkoutrouter; 