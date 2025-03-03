import mongoose from 'mongoose';
import dotenv from "dotenv";
import app from './app.js';
import session from 'express-session';
import passport from 'passport';
import Authrouter from './routes/auth.js';
import Complaint from './model/Complaint.js';


dotenv.config({path: "./config.env"});

// application to database
const db= process.env.DB;
mongoose.connect(db).then(()=>{
    console.log("DB connection successful");
}).catch((err)=>{
    console.log(err);
} );

const port= process.env.PORT || 3000;

app.listen(port,()=>{
    console.log(`App running on port ${port}`);
});


 