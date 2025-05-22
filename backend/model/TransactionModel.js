import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
    items: [
        {
            _id: String,
            quantity: Number,
        },
    ],
    user_name: String,
    address: String,
    number: Number,
    email: String,
    total: Number,
    status: String,
    user_id: String,
    stepTimestamps: {
        Pending: { type: Date },
        Successful: { type: Date },
        Shipped: { type: Date },
        Delivered: { type: Date },
        Refunded: { type: Date },
        Canceled: { type: Date },
    },
},
    {
        timestamps: true,
    }
);


export const Transaction = mongoose.model("Transaction", transactionSchema);