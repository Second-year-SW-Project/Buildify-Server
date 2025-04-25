import { Schema, model } from 'mongoose';


const CommentSchema = new Schema({
    productId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Product'  // Reference to Product model
    },
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'User'  // Reference to User model
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

const Comment = model('Comment', CommentSchema);

export default Comment;
