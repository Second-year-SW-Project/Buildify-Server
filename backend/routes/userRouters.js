import express from "express";
import { forgetPassword, login, logout, resendOtp, resetPassword, signup, updateProfile, verifyAccount, changePassword,
  generate2FASecret,
  enable2FA,
  disable2FA, 
  updatestatus} from "../controller/authController.js";
import isAuthenticated from "../middleware/isAuthenticated.js";
import User from "../model/userModel.js";
import { protect } from "../middleware/authMiddleware.js";
import { authenticateForPassword } from "../middleware/changepasswordMiddleware.js";

const router = express.Router();

router.post('/signup', signup);
router.post('/verify', isAuthenticated, verifyAccount)
router.post('/resend-otp', isAuthenticated, resendOtp);
router.post('/login', login);
router.post('/logout', logout);
router.post('/forget-password', forgetPassword);
router.post('/reset-password', resetPassword);
router.post('/update-profile',isAuthenticated, updateProfile);

router.post('/change-password', authenticateForPassword, changePassword);

// 2FA routes
router.post('/2fa/generate',isAuthenticated, generate2FASecret);
router.post('/2fa/enable', isAuthenticated, enable2FA);
router.post('/2fa/disable', isAuthenticated, disable2FA);
router.put('/update-status/:userId',isAuthenticated,updatestatus);





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
import authenticateJWT from "../middleware/authenticateJWT.js";

// Create a new user
router.post("/new", async (req, res) => {
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




export default router;
