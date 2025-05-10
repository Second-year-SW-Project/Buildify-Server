import mongoose from "mongoose";

const buildSchema = new mongoose.Schema({
  name: { type: String, required: true },
  userId: { type: String, default: "" },
  userName: { type: String, default: "" },
  userEmail: { type: String, default: "" },
  orderId: { type: String, default: "" },
  type: { type: String, required: true },
  image: { type: String, required: true },
  buildStatus: { type: String, default: "pending" },
  published: { type: Boolean, default: false },
  components: [{
    componentName: { type: String, required: true },
    type: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
    price: { type: Number, required: true },
    image: { type: String, required: true },
    _id: { type: mongoose.Schema.Types.ObjectId, required: true }
  }],//Defines the components array. The components are an array of objects
  totalPrice: { type: Number, required: true }
}, { timestamps: true });//Adds createdAt and updatedAt fields to the schema

const buildModel = mongoose.models.build || mongoose.model("build", buildSchema);

export default buildModel;//Exports the buildModel to be used in the controller
