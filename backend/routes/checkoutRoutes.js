import express from "express";
import { protect } from "../middleware/authMiddleware.js"
import { checkout, getOrders, getProductOrders, getSinglOrder } from "../controller/checkoutController.js";

const checkrouter = express.Router();

checkrouter.post("/checkout", checkout);
checkrouter.get("/checkout", getOrders);
checkoutrouter.get("/product-orders", protect, getProductOrders);
checkoutrouter.get("/order/:id", protect, getSinglOrder);

export default checkrouter; 