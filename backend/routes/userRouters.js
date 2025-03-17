import express from "express";
import { forgetPassword, login, logout, resendOtp, resetPassword, signup, verifyAccount } from "../controller/authController.js";
import isAuthenticated from "../middleware/isAuthenticated.js";
import User from "../model/userModel.js";
import {protect} from "../middleware/authMiddleware.js";
const router= express.Router();

router.post('/signup', signup);
router.post('/verify', isAuthenticated, verifyAccount)
router.post('/resend-otp',isAuthenticated,resendOtp);
router.post('/login',login);
router.post('/logout', logout);
router.post('/forget-password', forgetPassword);
router.post('/reset-password', resetPassword);






//managing users
router.get("/user", protect, async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Error fetching user" });
    }
  });


  //get all users 

  router.get("/", async (req, res) => {
    try {
      const users = await User.find().select("-password");
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Server Error" });
    }
  });


  //update user
  router.put("/:id", async (req, res) => {
    try {
      const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Error updating user" });
    }
  });
  
  // Delete User
  router.delete("/:id", async (req, res) => {
    try {
      await User.findByIdAndDelete(req.params.id);
      res.json({ message: "User deleted" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting user" });
    }
  });

  //update or change user
  router.put("/:id", async (req, res) => {
    try {
      const { name, email, Role } = req.body;
      const updatedUser = await User.findByIdAndUpdate(
        req.params.id,
        { name, email, Role },
        { new: true }
      );
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Error updating user" });
    }
  });
  


  import bcrypt from "bcryptjs";

// Create a new user
router.post("/", async (req, res) => {
  try {
    const { name, email, password, Role } = req.body;

    if (!name || !email || !password || !Role) {
      return res.status(400).json({ message: "All fields are required" });
    }
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      Role
    });

    await newUser.save();
    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error creating user" });
  }
});


//searching users

router.get("/", async (req, res) => {
  try {
    const { name, email, Role } = req.query;

    // Building query object
    let query = {};
    if (name) query.name = new RegExp(name, "i"); // Case-insensitive regex
    if (email) query.email = new RegExp(email, "i");
    if (Role) query.Role = Role; // Role should be an exact match

    const users = await User.find(query);
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users" });
  }
});


router.post('/update-profile', isAuthenticated, async (req, res) => {
  try {
    const { name, email, firstName, lastName, address } = req.body;

    console.log('Request body:', req.body); // Debugging log (remove in production)

    // Validate request body
    if (!name || !email || !firstName || !lastName || !address) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if the user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Find and update the user in the database
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { name, email, firstName, lastName, address },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'Profile updated successfully', data: { user: updatedUser } });
  } catch (error) {
    console.error('Error updating profile:', error); // Log error for debugging
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});


export default router;
