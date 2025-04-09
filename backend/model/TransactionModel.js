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
    total: Number,
    status: String,
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export const Transaction = mongoose.model("Transaction", transactionSchema);