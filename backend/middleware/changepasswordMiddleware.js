import jwt from "jsonwebtoken";
import { catchAsync } from "../utils/catchAsync.js";
import User from "../model/userModel.js";

export const authenticateForPassword = catchAsync(async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1] || req.cookies?.token;

  if (!token) return next(new AppError("Authentication required", 401));

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id).select("+password");

  if (!user) return next(new AppError("User no longer exists", 401));
  if (user.changedPasswordAfter(decoded.iat)) {
    return next(new AppError("Password changed recently! Please log in again", 401));
  }

  req.user = user;
  next();
});
