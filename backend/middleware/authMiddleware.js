import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config({path: "./config.env"});


export const protect = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];

  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);  // Use jwt.verify instead of just verify
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

export default protect;




