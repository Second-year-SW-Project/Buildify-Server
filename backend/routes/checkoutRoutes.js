import express from "express";
import { protect } from "../middleware/authMiddleware.js"
import { checkout, getOrders, deleteOrder, getProductOrders, getSinglOrder, updateOrderStatus } from "../controller/checkoutController.js";

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
checkoutrouter.get("/order/:id", protect, getSinglOrder);

//Update order status by id
checkoutrouter.patch("/product-orders/:id", updateOrderStatus);

export default checkoutrouter; 