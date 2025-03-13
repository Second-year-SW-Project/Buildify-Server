import { Router } from 'express';
import express from 'express';
import RMA from '../model/RMAModel.js';

const RMArouter = express.Router();

// Create RMA Request
RMArouter.post("/", async (req, res) => {
    try {
      const { userId, subject, orderId, reason, message } = req.body;
      
      if (!userId || !subject || !orderId || !reason || !message) {
        return res.status(400).json({ error: "All fields are required" });
      }
  
      const newRMA = new RMA({ userId, subject, orderId, reason, message });
      const savedRMA = await newRMA.save();
  
      res.status(201).json(savedRMA);
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
});

RMArouter.get("/:id", async (req, res) => {
    try {
      const rmaRequest = await RMA.findById(req.params.id);
      if (!rmaRequest) {
        return res.status(404).json({ error: "RMA request not found" });
      }
      res.json(rmaRequest);
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
});

RMArouter.get("/user/:userId", async (req, res) => {
    try {
      const userRMARequests = await RMA.find({ userId: req.params.userId }).sort({ createdAt: -1 });
      res.json(userRMARequests);
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
});

export default RMArouter;
  