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
import crouter from './routes/complaintRoutes.js';
import RMArouter from './routes/RMARoutes.js';
import reviewrouter from './routes/ReviewRoutes.js';
import prouter from './routes/productRoutes.js';
import gameRouter from './routes/gameRouter.js';
import checkoutrouter from './routes/checkoutRoutes.js';
import configurePassport from './config/passport.js';
import router from './routes/auth.js';

// Load environment variables
dotenv.config({ path: './config.env' });

const app = express();

// Middleware
app.use(cookieParser());
app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json({ limit: '1000kb' }));

// Session Middleware
app.use(
  session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.DB,
      collectionName: 'sessions',
    }),
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Configure Passport strategies
configurePassport(passport);

// Routes
app.use('/auth', router);
app.use('/api/v1/users', userRouters);
app.use('/api', crouter);
app.use('/api/rma', RMArouter);
app.use('/api/review', reviewrouter);
app.use('/api/product', prouter);
app.use('/api/checkout', checkoutrouter);
app.use('/api/game', gameRouter);

// Handle Unmatched Routes
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 400));
});

// Global Error Handler
app.use(globalErrorHandler);

export default app;