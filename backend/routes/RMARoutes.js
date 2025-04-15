import express from 'express';
import RMA from '../model/RMAModel.js';
import User from '../model/userModel.js';

const RMArouter = express.Router();

// Create RMA Request
RMArouter.post("/", async (req, res) => {
  console.log("Received RMA request:", req.body);
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
      const rmaRequest = await RMA.findById(req.params.id);
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


// Get RMA requests with filtering
RMArouter.get('/admin/requests', async (req, res) => {
  try {
    const { orderId, status } = req.query;
    const query = {};
    
    if (orderId) query.orderId = orderId;
    if (status) query.status = status;

    const requests = await RMA
      .find(query)
      .populate('userId', 'name email') // populate name and email from user
      .sort({ createdAt: -1 });

    res.status(200).json(requests);
  } catch (error) {
    console.error('Admin RMA Error:', error);
    res.status(500).json([]); // Return empty array on error
  }
});


// Update RMA response
RMArouter.put('/admin/respond/:id', async (req, res) => {
  try {
    const updatedRequest = await RMA.findByIdAndUpdate(
      req.params.id,
      {
        status: req.body.status,
        response: req.body.response,
        updatedAt: Date.now()
      },
      { new: true }
    );
    
    res.status(200).json(updatedRequest);
  } catch (error) {
    console.error('Response Error:', error);
    res.status(500).json({ error: 'Update failed' });
  }
});





export default RMArouter;
  