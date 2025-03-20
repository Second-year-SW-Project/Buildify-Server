import { Schema, model } from 'mongoose';

const rmaSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    subject: { 
        type: String, 
        required: true
    },
    orderId: { 
        type: String, 
        required: true 
    },
    reason: { 
        type: String, 
        required: true 
    },
    message: { 
        type: String, 
        required: true 
    },
    status: {
        type: String,
        enum: ["Awaiting User", "Processing", "Resolved", "Rejected"],
        default: "Processing",
      }
}, { timestamps: true });

const RMA = model('RMA', rmaSchema, "rma_requests");

export default RMA;