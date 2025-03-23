import cors from 'cors';
import cookieParser from 'cookie-parser';
import globalErrorHandler from './controller/errorController.js';
import userRouters from './routes/userRouters.js';
import AppError from './utils/appError.js';
import dotenv from "dotenv";
import session from "express-session";
import passport from "passport";
import express from 'express';
import MongoStore from 'connect-mongo';
import crouter from './routes/complaintRoutes.js';
import RMArouter from './routes/RMARoutes.js';
import reviewrouter from './routes/ReviewRoutes.js';
import prouter from './routes/productRoutes.js';

// Load environment variables
dotenv.config({ path: "./config.env" });

import configurePassport from './config/passport.js';
import router from './routes/auth.js';

const app = express();

// Middleware
app.use(cookieParser());

app.use(
    cors({
        origin: 'http://localhost:5173',
        credentials: true,
    })
);

app.use(express.json({ limit: "1000kb" }));


// Session Middleware (Must be Before Passport)
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.DB,  // Ensure this is correctly set
        collectionName: "sessions",  // Optional: specify a session collection name
    }),
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());



// Configure Passport strategies
configurePassport(passport);

app.use('/auth', router);

// User API routes
app.use('/api/v1/users', userRouters);

//complaint routes
app.use('/api', crouter);
app.use("/api/rma", RMArouter);

//review routes
app.use("/api/review", reviewrouter);

//product routes
app.use('/api/product', prouter);

// Handle Unmatched Routes
app.all('*', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 400));
});


// Global Error Handler
app.use(globalErrorHandler);

export default app;
