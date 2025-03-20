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

// Get a specific RMA request
RMArouter.get("/:id", async (req, res) => {
    try {
      const rmaRequest = await RMA.findById(req.params.id).populate("userId", "name email");
      if (!rmaRequest) {
        return res.status(404).json({ error: "RMA request not found" });
      }
      res.json(rmaRequest);
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
});

// Get RMA requests for a specific user
RMArouter.get("/user/:userId", async (req, res) => {
    try {
      const userRMARequests = await RMA.find({ userId: req.params.userId }).sort({ createdAt: -1 });
      res.json(userRMARequests);
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
});

// Get RMA requests for Admin (with filtering)
RMArouter.get("/admin/requests", async (req, res) => {
  const { userName, email, status } = req.query;

  const query = {};
  if (userName) query["userId.name"] = userName;
  if (email) query["userId.email"] = email;
  if (status) query.status = status;

  try {
    const rmaRequests = await RMA.find(query).populate("userId", "name email");
    req.json(rmaRequests);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Admin response to RMA request
RMArouter.put("/admin/respond/:id", async (req, res) => {
  const { status, response } = req.body;
  const rmaId = req.params.id;

  try {
    const rmaRequest =await RMA.findById(rmaId);
    if (!rmaRequest) {
      return res.status(404).json({ error: "RMA request not found" });
    }

    rmaRequest.status = status || "Resolved";
    rmaRequest.response = response;
    await rmaRequest.save();

    res.json({ message: "Response added to RMA request" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default RMArouter;
  