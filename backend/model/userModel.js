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
    firstName: { type: String },
    lastName: { type: String },
    address: { type: String },
    province: { type: String },
    district: { type: String },
    profilePicture: { type: String, default: "" },
    password: {
      type: String,
      minlength: 8,
      select: false, // Ensures password is not returned in queries
    },
    passwordConfirm: {
      type: String,
      select: false, // Ensures this field is not saved in the database
      validate: {
        validator: function (el) {
          return el === this.password;
        },
        message: "Passwords do not match",
      },
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Allows both Google and regular login for a user
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
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
    status: {
      type: String,
      enum: ['active', 'blocked', 'banned', 'inactive', 'suspended', 'pending'],
      default: 'pending',
    },
    twoFASecret: {
      type: String
    },
    is2FAEnabled: {
      type: Boolean,
      default: false,
    },
    passwordChangedAt: {
      type: Date,
      select: false, // Track when password was last changed
    },
    passwordHistory: [{
      hash: String,
      changedAt: Date
    }],
  },
  {
    timestamps: true,
  }
);

// 🔹 Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  console.log('Before Hashing:', this.password); // Log before hashing
  this.password = await bcrypt.hash(this.password, 12);
  console.log('After Hashing:', this.password); // Log after hashing

  this.passwordConfirm = undefined; // Remove confirmation field
  next();
});


// 🔹 Check password validity
userSchema.methods.correctPassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);  // 'this.password' should be the hashed password
};



// 🔹 Method to compare new password with password history
userSchema.methods.hasUsedPassword = async function (newPassword) {
  const results = await Promise.allSettled(
    this.passwordHistory.map(async (oldPassword) => bcrypt.compare(newPassword, oldPassword.hash))
  );
  return results.some((result) => result.status === "fulfilled" && result.value);
};

// 🔹 Check password validity
userSchema.methods.comparePassword = async function (password, userPassword) {
  return await bcrypt.compare(password, userPassword);
};


// 🔹 Check if the password was changed after token issue
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

const User = mongoose.model("User", userSchema);
export default User;
