import { Schema, model } from 'mongoose';

const complaintSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  status: { 
    type: String, 
    default: 'Pending', 
    enum: ['Pending', 'In Progress', 'Resolved']
  },
  response: { type: String, default: '' },
  user: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }
}, { timestamps: true }); // Enables createdAt and updatedAt

const Complaint = model('Complaint', complaintSchema);

export default Complaint;
