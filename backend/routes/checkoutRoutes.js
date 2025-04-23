import express from "express";
import { protect } from "../middleware/authMiddleware.js"
import { checkout, getProductOrders, getSinglOrder } from "../controller/checkoutController.js";

const checkoutrouter = express.Router();

checkoutrouter.post("/checkout", checkout);
checkoutrouter.get("/product-orders", protect, getProductOrders);
checkoutrouter.get("/order/:id", protect, getSinglOrder);

export default checkoutrouter;