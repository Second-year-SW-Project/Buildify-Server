import { Schema, Model, model } from 'mongoose';

const ReviewSchema = new Schema({
    type: { 
        type: String,
        enum: ['product', 'pc_build'],
        required: true
    },
    itemId: {
        type: Schema.Types.ObjectId,
        required: true,
        refPath: 'type'
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
        type: String,
        required: true
    },
    adminResponse: {  
        type: String,
        default: null
    }
}, { timestamps: true });

const Review = model('Review', ReviewSchema);

export default Review;