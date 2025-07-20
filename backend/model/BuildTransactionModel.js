// model/BuildTransactionModel.js
import mongoose from "mongoose";

const buildTransactionSchema = new mongoose.Schema({
  buildName: { type: String, default: "" },
  buildType: {
    type: String,
    enum: ['custom', 'pre-configured', 'gaming-optimized'],
    default: 'custom'
  },
  userId: { type: String, default: "" },
  userName: { type: String, default: "" },
  userEmail: { type: String, default: "" },
  userAddress: { type: String, default: "" },
  warrantyPeriod: { type: Number, default: 24 }, // months
  orderId: { type: String, default: "" },
  buildImage: { type: String, default: "" },
  buildStatus: { type: String, default: "Pending" },
  buildStatus: { type: String, default: "Pending" },
  published: { type: Boolean, default: false },
  components: [{
    componentId: { type: mongoose.Schema.Types.ObjectId, default: null },
    quantity: { type: Number, default: 1 }
  }],
  TotalPrice: { type: Number, default: 0 },
  province: { type: String },
  district: { type: String },
  paymentMethod: { type: String, default: "" },
  deliveryMethod: { type: String, default: "" },
  serviceCharge: { type: Number, default: 0 },
  deliveryCharge: { type: Number, default: 0 },
  totalCharge: { type: Number, default: 0 },
  stepTimestamps: {
    Pending: { type: Date },
    Confirmed: { type: Date },
    Building: { type: Date },
    Completed: { type: Date },
    Shipped: { type: Date },
    Delivered: { type: Date },
    Canceled: { type: Date },
    Successful: { type: Date },
  }
}, { timestamps: true });

// Index for better query performance
buildTransactionSchema.index({ userId: 1 });
buildTransactionSchema.index({ buildStatus: 1 });
buildTransactionSchema.index({ province: 1, district: 1 });
buildTransactionSchema.index({ createdAt: -1 });

export const BuildTransaction = mongoose.model("BuildTransaction", buildTransactionSchema);