import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
    items: [
        {
            _id: String,
            name: String,
            product_image: String,
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
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export const Transaction = mongoose.model("Transaction", transactionSchema);