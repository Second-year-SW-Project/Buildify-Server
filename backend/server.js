import mongoose from 'mongoose';
import dotenv from "dotenv";
import app from './app.js';
import session from 'express-session';
import passport from 'passport';
import Authrouter from './routes/auth.js';
import Complaint from './model/Complaint.js';
import Product from './model/productModel.js';
import connectCloudinary from './config/cloudinaryConfig.js';


dotenv.config({ path: "./config.env" });

// Connect to DB
const db = process.env.DB;
mongoose.connect(db).then(() => {
    console.log("DB connection successful");
}).catch((err) => {
    console.log("DB connection error:", err);
});

// Connect to Cloudinary
connectCloudinary();

// Start the server
const port = process.env.PORT || 8000;
app.listen(port, () => {
    console.log(`Server started at http://localhost:${port}`);
});

