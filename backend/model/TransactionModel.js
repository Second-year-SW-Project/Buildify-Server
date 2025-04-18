import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
    items: [
        {
            _id: String,
            name: String,
            category: String,
            price: Number,
            quantity: Number,
        },
    ],
    user_name: String,
    email: String,
    profile_image: String,
    total: Number,
    status: String,
    user_id: String,
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export const Transaction = mongoose.model("Transaction", transactionSchema);