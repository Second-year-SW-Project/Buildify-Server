import generateOtp from "../utils/generateOtp.js";
import User from "../model/userModel.js";
import jwt from 'jsonwebtoken';
import sendEmail from "../utils/email.js";
import {catchAsync} from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';



//creating the token based on user id
const signToken = (id) => {

    return jwt.sign({ id }, process.env.JWT_SECRET, { 
        expiresIn: process.env.JWT_EXPIRES_IN 
    });

};

//creating through another function and send to cookies
const createSendToken = (user, statusCode, res, message) => {

    const token = signToken(user._id);

    const cookieOptions = {
        expires: new Date(Date.now() + (process.env.JWT_COOKIE_EXPIRES_IN || 7) * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'Lax',
    };

    res.cookie('token', token, cookieOptions);

    user.password = undefined;
    user.passwordConfirm = undefined;
    user.otp = undefined;

    res.status(statusCode).json({
        status: 'success',
        message,
        token,
        data: { user },
    });
};

//signup with sending token to verify the account
export const signup = catchAsync(async (req, res, next) => {
    const { email, password, passwordConfirm,name } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return next(new AppError("Email already registered", 400));

    const otp = generateOtp();
    const otpExpires = Date.now() + 24 * 60 * 60 * 1000;

    const newUser = await User.create({
        name,
        email,
        password,
        passwordConfirm,
        otp,
        otpExpires,
    });

    try {
      await sendEmail({
        email: newUser.email,
        subject: "🔒 Verify Your Email - Buildify",
        html: `
          <div style="font-family: Arial, sans-serif; background-color: #f4f4f7; padding: 30px; text-align: center;">
            <div style="max-width: 500px; margin: auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
              <h2 style="color: #7C3AED;">Verify Your Email Address</h2>
              <p style="font-size: 16px; color: #333;">Thank you for signing up for <strong>Buildify</strong>!</p>
              <p style="font-size: 16px; color: #333;">Please use the following OTP to verify your account:</p>
              <div style="margin: 20px 0; font-size: 32px; font-weight: bold; color: #7C3AED;">${otp}</div>
              <p style="font-size: 14px; color: #666;">This code will expire in 10 minutes.</p>
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
              <p style="font-size: 12px; color: #999;">If you did not request this, please ignore this email.</p>
            </div>
          </div>
        `,
      });
      
        createSendToken(newUser, 200, res, "Registration successful");
    } catch (error) {
        await User.findByIdAndDelete(newUser.id);
        return next(new AppError("There is an error in sending this email. Try again", 500));
    }
});

//Verify the account
export const verifyAccount = catchAsync(async(req, res, next)=> {

    const {otp} = req.body;

    if(!otp){
        return next(new AppError("Otp is missing", 400 ));
    }

    const user= req.user;
    if(user.otp !== otp){
        return next(new AppError("Invalid otp" , 400));
    }

    if(Date.now() > user.otpExpires){
        return next(new AppError("Otp has expired please request a new otp", 400))
    }

    user.isVerified = true;
    user.status = "active"
    user.otp= undefined;
    user.otpExpires= undefined;

    await user.save({validateBeforeSave: false});

    createSendToken(user, 200, res, "Email has been verified");

})

//asking to resend otp in verify or forgot password and reetting
export const resendOtp = catchAsync(async(req,res,next)=> {
    const {email} = req.user;
    if(!email){
        return next(new AppError("Email is required to resend otp", 400));

    }

    const user= await User.findOne({email});
    if(!user){
        return next(new AppError("User not found", 400));

    }

    if(user.isVerified){
        return next(new AppError("This account is already verified", 400));

    }

    const newOtp = generateOtp();
    user.otp= newOtp;
    user.otpExpires= Date.now() + 24* 60 * 60 * 1000;

    await user.save({validateBeforeSave : false});

    try{
      await sendEmail({
        email: user.email,
        subject: "🔄 Resend OTP - Buildify Email Verification",
        html: `
          <div style="font-family: Arial, sans-serif; background-color: #f4f4f7; padding: 30px; text-align: center;">
            <div style="max-width: 500px; margin: auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
              <h2 style="color: #7C3AED;">Resend: Verify Your Email</h2>
              <p style="font-size: 16px; color: #333;">You requested a new OTP for your <strong>Buildify</strong> account.</p>
              <p style="font-size: 16px; color: #333;">Here is your new OTP:</p>
              <div style="margin: 20px 0; font-size: 32px; font-weight: bold; color: #7C3AED;">${newOtp}</div>
              <p style="font-size: 14px; color: #666;">This code will expire in 10 minutes. Please do not share it with anyone.</p>
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
              <p style="font-size: 12px; color: #999;">If you did not request a new OTP, you can safely ignore this email.</p>
            </div>
          </div>
        `,
      });
      

        res.status(200).json({
            status: 'success',
            message: 'A new otp sent to your email'
        });

    }catch(error){
        user.otp= undefined;
        user.otpExpires = undefined;
        await user.save({validateBeforeSave: false});
        return next(new AppError("There is a error in sending email please try again", 500));

    }
});

//login after verification done
export const login = catchAsync(async(req, res, next) => {
    
    const {email,password} = req.body;
    if(!email || ! password){
        return next(new AppError("Email and password should provide", 400));
    }

    const user = await User.findOne({email}).select('+password');
  //  if (user.status === 'banned' || user.status === 'blocked') {
  //    return res.status(403).json({ message: `Your account is ${user.status}` });
  //  }

    //compare the password
if(!user || !(await user.correctPassword(password,user.password))){
    return next(new AppError("Incorrect email or password", 401));

}

createSendToken(user,200, res, "Logged in successfully")


});

//logged out
export const logout = catchAsync(async(req, res, next)=>{
    res.cookie("token", "loggedout",{
        expires: new Date(Date.now() + 10 * 1000 ),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
});

res.status(200).json({
    status: 'success',
    message: 'logged out successfully'
})
});

//Foregtting password
export const forgetPassword = catchAsync(async(req, res, next) => {
    const {email} = req.body;
    const user = await User.findOne({email});
    if(!user){
        return next(new AppError("Email is not found", 404));
    }

    const otp = generateOtp();
    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpires = Date.now() + 300000;

    await user.save({validateBeforeSave: false});


    try{
      await sendEmail({
        email: user.email,
        subject: "🔑 Password Reset OTP - Buildify",
        html: `
          <div style="font-family: Arial, sans-serif; background-color: #f4f4f7; padding: 30px; text-align: center;">
            <div style="max-width: 500px; margin: auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
              <h2 style="color: #7C3AED;">Reset Your Password</h2>
              <p style="font-size: 16px; color: #333;">You requested to reset your password for <strong>Buildify</strong>.</p>
              <p style="font-size: 16px; color: #333;">Please use the following OTP to proceed:</p>
              <div style="margin: 20px 0; font-size: 32px; font-weight: bold; color: #7C3AED;">${otp}</div>
              <p style="font-size: 14px; color: #666;">This OTP is valid for 10 minutes. Do not share it with anyone.</p>
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
              <p style="font-size: 12px; color: #999;">If you did not request a password reset, you can safely ignore this email.</p>
            </div>
          </div>
        `,
      });
      

        res.status(200).json({
            status: "success",
            mesage: 'Password reset otp sent successfully'
        })

    }catch(error){
        user.resetPasswordOTP= undefined;
        user.resetPasswordOTPExpires = undefined;
        await user.save({validateBeforeSave: false});

        return next(new AppError("There is an error in sending password reset otp"));

    }
});

//resetting password
export const resetPassword = catchAsync(async(req, res, next) => {
    const{email, otp, password, passwordConfirm} = req.body;

    const user = await User.findOne({
        email : email,
        resetPasswordOTP: otp,
        resetPasswordOTPExpires: { $gt : Date.now()}
    });
    console.log("Request Body - Email:", email);
    console.log("Request Body - OTP:", otp);
    console.log("Current Time:", Date.now());

    if (!user) {
        console.log("No user found with this email or OTP has expired/incorrect");
        return next(new AppError("No user found or OTP is invalid", 400));
    }

    user.password= password;
    user.passwordConfirm = passwordConfirm;
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpires = undefined;

    await user.save();

    createSendToken(user, 200, res, "Password reset successfully");

})

//update the profile in user profie
export const updateProfile = async (req, res) => {
    try {
      // Allowed fields validation
      const allowedUpdates = ['name', 'email', 'firstName', 'lastName', 'address', 'profilePicture'];
      const updates = Object.keys(req.body);
      
      const invalidFields = updates.filter(field => !allowedUpdates.includes(field));
      if (invalidFields.length > 0) {
        return res.status(400).json({
          error: `Invalid fields: ${invalidFields.join(', ')}`,
          allowedFields: allowedUpdates
        });
      }
  
      // Schema validation
      const user = await User.findByIdAndUpdate(
        req.user._id,
        req.body,
        { new: true, runValidators: true, context: 'query' }
      ).select('-password -refreshToken');
  
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      res.status(200).json({
        status: 'success',
        data: { user }
      });
  
    } catch (error) {
      // Enhanced error handling
      const errors = {};
      
      if (error.name === 'ValidationError') {
        Object.keys(error.errors).forEach(field => {
          errors[field] = error.errors[field].message;
        });
      }
  
      res.status(400).json({
        status: 'fail',
        error: error.message,
        fields: Object.keys(errors),
        detailedErrors: errors
      });
    }
  };

//changing current password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    console.log('Request Body:', req.body); // Log request body to verify

    // Validate the required fields
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Ensure new and confirm passwords match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "New password and confirm password do not match" });
    }

    // Check if the new password is strong enough (optional)
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    // Find the user in the database
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Log the stored password for debugging
    console.log('User Stored Password:', user.password); 

    // Check if the current password is correct using comparePassword method
    const isMatch = await user.correctPassword(currentPassword);
    console.log('Password Match:', isMatch); // Log whether passwords match or not

    if (!isMatch) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Check if the new password was used previously
    const usedPassword = await user.hasUsedPassword(newPassword);
    if (usedPassword) {
      return res.status(400).json({ error: "You have used this password previously. Please choose a new one." });
    }

    // Update the password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully'
    });

  } catch (error) {
    // Handle any errors
    console.error('Error changing password:', error); // Log error for debugging
    res.status(500).json({
      status: 'fail',
      error: error.message
    });
  }
};

//2fa still not debug
export const generate2FASecret = async (req, res) => {
  try {
    const user = req.user;
    
    // Generate the secret
    const secret = speakeasy.generateSecret({ length: 20 });

    // Ensure the correct secret is assigned
    user.twoFASecret = secret.base32;
    await user.save(); // Save user with the correct secret

    console.log("Generated 2FA Secret (to be saved):", secret.base32);
    console.log("Stored 2FA Secret in DB:", user.twoFASecret);

    // Ensure the secret is correctly retrieved
    const retrievedUser = await User.findById(user._id);
    console.log("Retrieved Secret After Save:", retrievedUser.twoFASecret);

    // Generate OTP Auth URL
    const otpauthUrl = speakeasy.otpauthURL({
      secret: secret.base32,
      label: `MyApp:${user.email.substring(0, 10)}`, // Shortened label
      issuer: 'MyApp'
    });

    // Check the length of the URL
    console.log('OTPAUTH URL Length:', otpauthUrl.length);

    // Generate QR code
    QRCode.toDataURL(otpauthUrl, (err, dataUrl) => {
      if (err) {
        console.error("QR Code Generation Error:", err);
        return res.status(500).json({ message: 'Failed to generate QR code' });
      }
      res.json({ qr: dataUrl });
    });

  } catch (err) {
    console.error("Error generating 2FA secret:", err);
    res.status(500).json({ message: 'Failed to generate 2FA secret' });
  }
};

export const enable2FA = async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user._id); // Ensure fresh data from DB

    console.log("Received Token:", token);
    console.log("Stored 2FA Secret in DB:", user.twoFASecret);

    if (user.is2FAEnabled) {
      return res.status(400).json({ message: '2FA is already enabled' });
    }

    // Generate expected token
    const expectedToken = speakeasy.totp({
      secret: user.twoFASecret.trim(), // Ensure trimming of spaces
      encoding: 'base32'
    });
    console.log("Expected Token:", expectedToken);

    // Verify provided token
    const verified = speakeasy.totp.verify({
      secret: user.twoFASecret.trim(),
      encoding: 'base32',
      token,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({ message: 'Invalid token' });
    }

    // Enable 2FA
    user.is2FAEnabled = true;
    await user.save();

    res.json({ message: '2FA enabled successfully' });

  } catch (err) {
    console.error('Error enabling 2FA:', err);
    res.status(500).json({ message: '2FA enable failed' });
  }
};

export const disable2FA = async (req, res) => {
  try {
    const user = req.user;
    
    user.is2FAEnabled = false;
    user.twoFASecret = undefined;
    await user.save();
    
    res.json({ message: '2FA disabled successfully' });
  } catch (err) {
    res.status(500).json({ message: '2FA disable failed' });
  }
};

//updating status by admin in user management
export const updatestatus = async (req, res) => {
  const { status } = req.body;  // 'active', 'blocked', 'banned', etc.

  if (!['active', 'blocked', 'banned', 'inactive', 'suspended', 'pending'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  try {
    const user = await User.findByIdAndUpdate(req.params.userId, { status }, { new: true });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: `User status updated to ${status}`, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

