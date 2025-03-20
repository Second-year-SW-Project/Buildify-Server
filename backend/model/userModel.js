import mongoose from "mongoose";
import validator from "validator";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a username"],
      trim: true,
      minlength: 3,
      maxlength: 30,
      index: true,
    },
    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, "Please provide a valid email"],
    },
    password: {
      type: String,
      //required: [true, "Please provide a password"],
      minlength: 8,
      select: false, // Ensures password is not returned in queries
    },
    passwordConfirm: {
      type: String,
      // required: [true, "Please confirm your password"],
      select: false, // Ensures this field is not saved in the database
      validate: {
        validator: function (el) {
          return el === this.password;
        },
        message: "Passwords do not match",
      },
    },
    googleId: {
      type: String,  // Store googleId when the user logs in via Google
      unique: true,
      sparse: true,  // Allows both Google and regular login for a user
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
      default: null,
    },
    otpExpires: {
      type: Date,
      default: null,
    },
    resetPasswordOTP: {
      type: String,
      default: null,
    },
    resetPasswordOTPExpires: {
      type: Date,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    Role: {
      type: String, enum: ["admin", "user"], default: "user",
    },
  },
  {
    timestamps: true,
  }
);

// 🔹 Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined; // Remove confirmation field
  next();
});

// 🔹 Check password validity
userSchema.methods.correctPassword = async function (password, userPassword) {
  return await bcrypt.compare(password, userPassword);
};

const User = mongoose.model("User", userSchema);
export default User;
