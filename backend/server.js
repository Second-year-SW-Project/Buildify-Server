import mongoose from 'mongoose';
import dotenv from 'dotenv';
import app from './app.js';
import connectCloudinary from './config/cloudinaryConfig.js';

dotenv.config({ path: './config.env' });

// Connect to DB
const db = process.env.DB;
mongoose
  .connect(db)
  .then(() => {
    console.log('DB connection successful');
  })
  .catch((err) => {
    console.log('DB connection error:', err);
  });

// Connect to Cloudinary
connectCloudinary();

// Start the server
const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`Server started at https://buildify-server-d5yu.vercel.app/`);
});