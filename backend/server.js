import mongoose from 'mongoose';
import dotenv from "dotenv";
import app from './app.js';


dotenv.config({path: "./config.env"});

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


 