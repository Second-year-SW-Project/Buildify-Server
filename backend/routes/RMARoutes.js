import { Router } from "express";
import {
  createRMA,
  getRMA,
  getUserRMAs,
  getAdminRequests,
  respondToRMA,
  updateRMAStatus,
} from '../controller/rmaController.js'

const RMArouter = Router();

// User Routes
RMArouter.post("/", createRMA);
RMArouter.get("/:id", getRMA);
RMArouter.get("/user/:userId", getUserRMAs);

// Admin Routes
RMArouter.get("/admin/requests", getAdminRequests);
RMArouter.put("/admin/respond/:id", respondToRMA);
RMArouter.put("/status/:id", updateRMAStatus);

export default RMArouter;
  