import { Schema, Model, model } from 'mongoose';

const ReviewSchema = new Schema({
    productId: { 
        type: String,
        required: true
    },
    orderId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Transaction'
    },
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    comment: {
        type: String        
    },
    adminResponse: {  
        type: String,
        default: null
    }
}, { timestamps: true });

const Review = model('Review', ReviewSchema);

export default Review;