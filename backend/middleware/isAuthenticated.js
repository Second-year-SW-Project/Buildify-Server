import jwt from 'jsonwebtoken';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/appError.js';
import User from '../model/userModel.js';

const isAuthenticated = catchAsync(async (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
        return next(new AppError("You are not logged in. Please login", 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const currentUser = await User.findById(decoded.id);

    if (!currentUser) {
        return next(new AppError("The user belonging to this token does not exist", 401));
    }

    req.user = currentUser;

    console.log("Authenticated User:", req.user);

    next();
});

export default isAuthenticated;
