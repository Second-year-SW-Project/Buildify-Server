import { Schema, model } from 'mongoose';

const complaintSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  complaintType: {
    type: String,
    required: true,
    enum: [
      'Technical', 
      'Billing', 
      'Customer Service', 
      'Other', 
      'Product Quality', 
      'Delivery Issue', 
      'Refund Issue', 
      'Warranty Claim', 
      'Account Issue', 
      'Shipping Delay', 
      'Service Request', 
      'Feedback', 
      'Policy Clarification',
      'Security Concern', 
      'Privacy Issue'
    ], // Expanded list of complaint types
  },
  status: {
    type: String,
    default: 'Pending',
    enum: ['Pending', 'In Progress', 'Resolved'],
  },
  response: { type: String, default: '' },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { timestamps: true }); // Enables createdAt and updatedAt

const Complaint = model('Complaint', complaintSchema);

export default Complaint;

