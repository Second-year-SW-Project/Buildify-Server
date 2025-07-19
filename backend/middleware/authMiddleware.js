import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../model/userModel.js";

dotenv.config({ path: "./config.env" });


export const protect = async (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];

  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Fetch the full user object from the database
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: "User not found" });
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

export default protect;


export const admin = (req, res, next) => {
  console.log('REQ.USER IN ADMIN MIDDLEWARE:', req.user);
  console.log('REQ.USER IN ADMIN MIDDLEWARE:', req.user.Role);
  if (req.user && req.user.Role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Admin access denied' });
  }
};





