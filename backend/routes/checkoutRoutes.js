import express from "express";
import { checkout, getOrders } from "../controller/checkoutController.js";

const checkrouter = express.Router();

checkrouter.post("/checkout", checkout);
checkrouter.get("/checkout", getOrders);

export default checkrouter; // Add this line for default export