import express from "express";
import { checkout } from "../controller/checkoutController.js";

const router = express.Router();

router.post("/checkout", checkout);

export default router;