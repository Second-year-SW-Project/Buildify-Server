import cors from 'cors';
import cookieParser from 'cookie-parser';
import globalErrorHandler from './controller/errorController.js';
import userRouters from './routes/userRouters.js';
import AppError from './utils/appError.js';
import dotenv from 'dotenv';
import session from 'express-session';
import passport from 'passport';
import express from 'express';
import MongoStore from 'connect-mongo';
import router from './routes/auth.js';
import crouter from './routes/complaintRoutes.js';
import RMArouter from './routes/RMARoutes.js';
import reviewrouter from './routes/ReviewRoutes.js';
import prouter from './routes/productRoutes.js';
import invoicerouter from './routes/invoiceRoutes.js';
import commentrouter from './routes/commentRoutes.js';
import buildRouter from './routes/buildRouter.js';
import gameRouter from './routes/gameRouter.js';
import checkoutrouter from './routes/checkoutRoutes.js';
import configurePassport from './config/passport.js';
import buildTransactionRouter from './routes/buildTransactionRoutes.js';

// Initialize Express app
const app = express();

// Load environment variables
dotenv.config({ path: "./config.env" });

// Middleware
app.use(cookieParser());
app.use(
  cors({
    origin: 'http://localhost:5173', // Frontend URL
    credentials: true,
  })
);
app.use(express.json({ limit: '1000kb' })); // Parse JSON requests

// Session Middleware
app.use(
  session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.DB, // MongoDB connection string
      collectionName: 'sessions', // Collection name for storing sessions
    }),
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Configure Passport strategies
configurePassport(passport);

//Auth Routes
app.use('/auth', router);

//User Routes
app.use('/api/v1/users', userRouters);

//Complaint Routes
app.use('/api', crouter);

//RMA Routes
app.use('/api/rma', RMArouter);

//Review Routes
app.use('/api/review', reviewrouter);

//Product Routes
app.use('/api/product', prouter);

//Checkout Routes
app.use('/api/checkout', checkoutrouter);

//Game Routes
app.use('/api/game', gameRouter);

//Build Routes
app.use('/api/build', buildRouter);

//Invoice Routes
app.use('/api/invoices', invoicerouter);

//Comment Routes
app.use('/api/comment', commentrouter);

// Build Transaction Routes
app.use('/api/build-transactions', buildTransactionRouter);

// Handle Unmatched Routes
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 400));
});

// Global Error Handler
app.use(globalErrorHandler);

export default app;