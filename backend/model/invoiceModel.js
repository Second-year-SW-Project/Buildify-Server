import { Schema, model } from 'mongoose';

const itemSchema = new Schema({
    itemCode: {
        type: String,
        required: true
    },
    itemName: {
        type: String
    },
    SubCategory: {
        type: String
    },
    quantity: {
        type: Number,
        default: 1
    },
    price: {
        type: Number,
        default: 0
    }
})

const invoiceSchema = new Schema({
    fromAddress: {
        type: String,
        default: null
    },
    toAddress: {
        type: String,
        default: null
    },
    items: [itemSchema],
    shippingCost: {
        type: Number,
        default: 0
    },
    discount: {
        type: Number,
        default: 0
    },
    subtotal: {
        type: Number,
        default: 0
    },
    total: {
        type: Number,
        default: 0
    },
    invoiceNumber: {
        type: String,
        required: true
    },
    invoiceStatus: {
        type: String,
        enum: [
            "draft", 
            "sent", 
            "paid", 
            "pending", 
            "partiallyPaid",
            "overdue",
            "cancelled",
            "refunded"
        ],
        default: "draft"
    },
    dateCreated: {
        type: Date
    },
    dueDate: {
        type: Date
    }
});

const Invoice = model("Invoice", invoiceSchema);
export default Invoice;
