import { findByIdAndUpdate } from '../model/Complaint';
import AppError from '../utils/appError';  // Custom error handling

// Update complaint response and status
const updateComplaintResponse = async (req, res, next) => {
  const { complaintId } = req.params;
  const { response, status } = req.body;

  try {
    // Find the complaint and update its response and status
    const complaint = await findByIdAndUpdate(
      complaintId,
      { response, status },
      { new: true } // return the updated complaint
    );

    if (!complaint) {
      return next(new AppError('Complaint not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: complaint,
    });
  } catch (error) {
    next(error);  // Pass the error to error handling middleware
  }
};

export default { updateComplaintResponse };
