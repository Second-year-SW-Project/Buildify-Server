import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
    items: [
        {
            _id: String,
            quantity: Number,
        },
    ],
    total: Number,
    status: String,
    user_id: String,
    user_name: String,
    email: String,
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export const Transaction = mongoose.model("Transaction", transactionSchema);