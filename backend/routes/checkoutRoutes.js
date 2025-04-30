import express from "express";
import { protect } from "../middleware/authMiddleware.js"
import { checkout, getOrders, deleteOrder, getProductOrders, getSinglOrder } from "../controller/checkoutController.js";

const checkoutrouter = express.Router();

checkoutrouter.post("/payment", checkout);
checkoutrouter.get("/payment", getOrders);
checkoutrouter.delete("/order/:id", deleteOrder);
checkoutrouter.get("/product-orders", protect, getProductOrders);
checkoutrouter.get("/order/:id", protect, getSinglOrder);

export default checkoutrouter; 