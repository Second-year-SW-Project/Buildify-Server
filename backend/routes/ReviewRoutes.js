import express from 'express';
import {
  createReview,
  getProductReviews,
  getMyReviews,
  updateReview,
  deleteReview,
  getAllReviewsAdmin,
  respondToReview,
  adminDeleteReview
} from '../controller/reviewController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const reviewrouter = express.Router();

// Protected routes
reviewrouter.post('/', protect, createReview); // Create review
reviewrouter.get('/my', protect, getMyReviews); // Get my reviews
reviewrouter.put('/:id', protect, updateReview); // Update my review
reviewrouter.delete('/:id', protect, deleteReview); // Delete my review

// Public route
reviewrouter.get('/:productId', getProductReviews); // Get all reviews for a product


// Admin side


reviewrouter.get('/admin/all', protect, getAllReviewsAdmin);          // ✅ Get all reviews
reviewrouter.put('/admin/respond/:id', protect, respondToReview);     // ✅ Admin respond
reviewrouter.delete('/admin/:id', protect, adminDeleteReview);        // ✅ Delete review


export default reviewrouter;
