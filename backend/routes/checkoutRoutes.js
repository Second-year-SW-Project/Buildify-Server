import express from "express";
import { checkout, getOrders } from "../controller/checkoutController.js";

const checkrouter = express.Router();

checkrouter.post("/payment", checkout);
checkrouter.get("/payment", getOrders);

export default checkrouter; // Add this line for default export