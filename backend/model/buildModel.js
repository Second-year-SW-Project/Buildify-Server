import mongoose from "mongoose";

const buildSchema = new mongoose.Schema({
  name: { type: String, default: "" },
  userId: { type: String, default: "" },
  userName: { type: String, default: "" },
  userEmail: { type: String, default: "" },
  userAddress: { type: String, default: "" },
  userPhone: { type: String, default: "" },
  orderId: { type: String, default: "" },
  image: { type: String, default: "" },
  buildStatus: { type: String, default: "pending" },
  published: { type: Boolean, default: false },
  components: [{
    componentId: { type: mongoose.Schema.Types.ObjectId, default: null },
    quantity: { type: Number, default: 1 }
  }],
  componentsPrice: { type: Number, default: 0 },
  paymentMethod: { type: String, default: "" },
  deliveryMethod: { type: String, default: "" },
  serviceCharge: { type: Number, default: 0 },
  deliveryCharge: { type: Number, default: 0 },
  totalCharge: { type: Number, default: 0 },
  stepTimestamps: {
    Pending: { type: Date },
    Successful: { type: Date },
    Shipped: { type: Date },
    Delivered: { type: Date },
    Refunded: { type: Date },
  }
}, { timestamps: true });

const buildModel = mongoose.models.build || mongoose.model("build", buildSchema);

export default buildModel;
