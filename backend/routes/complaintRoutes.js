import { Router } from "express";
import Complaint from "../model/Complaint.js";

const crouter = Router();
// Submit complaint (for users)
crouter.post("/complaints/submit", async (req, res) => {
  const { title, description, userId, complaintType } = req.body;

  try {
    const complaint = new Complaint({
      title,
      description,
      user: userId, // Make sure userId is coming from the authenticated user's session
      complaintType, // Add complaint type
    });
    await complaint.save();
    res.json({ message: "Complaint submitted successfully!" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

//Get complaints by user (for users to see their complaints)
crouter.get("/complaints/user/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const complaints = await Complaint.find({ user: userId }).populate("user");
    res.json(complaints);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// GET /api/complaints/admin
crouter.get("/complaints/admin", async (req, res) => {
  const { name = "", email = "", status = "" } = req.query;

  try {
    const filter = {
      ...(status && { status }),
    };

    const userFilter = {};

    if (name) {
      userFilter["user.name"] = { $regex: name, $options: "i" };
    }

    if (email) {
      userFilter["user.email"] = { $regex: email, $options: "i" };
    }

    const complaints = await Complaint.find(filter)
      .populate({
        path: "user",
        match: {
          ...(name && { name: { $regex: name, $options: "i" } }),
          ...(email && { email: { $regex: email, $options: "i" } }),
        },
      })
      .exec();

    // Filter out complaints where the user doesn't match the populate filter
    const filtered = complaints.filter((c) => c.user);

    res.json(filtered);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get complaints (for admin to filter and view all complaints)
crouter.get("/complaints/admin", async (req, res) => {
  const { name, email, status, complaintType } = req.query;

  const query = {};

  // Optional filters for admin
  if (name) query["user.name"] = name;
  if (email) query["user.email"] = email;
  if (status) query.status = status;
  if (complaintType) query.complaintType = complaintType; // Filter by complaint type

  try {
    const complaints = await Complaint.find(query).populate("user");
    res.json(complaints);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin response to complaint
crouter.put("/complaints/admin/respond/:id", async (req, res) => {
  const { status, response } = req.body;
  const complaintId = req.params.id;

  try {
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }
    // Update complaint's status and add the admin's response
    complaint.status = status;
    complaint.response = response;
    await complaint.save();

    res.json({ message: "Response added to complaint" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default crouter;
