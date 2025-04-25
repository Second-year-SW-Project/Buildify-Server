
import express from 'express';
import {
  addProductComment,
  updateProductComment,
  deleteProductComment,
  getAllProductComments,
  respondToComment,
  deleteAdminComment
} from '../controller/commentController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const commentrouter = express.Router();
// User Routes
commentrouter.post('/:productId', protect, addProductComment);
commentrouter.put('/:productId/:commentId', protect, updateProductComment);
commentrouter.delete('/:productId/:commentId', protect, deleteProductComment);

// Admin Routes
commentrouter.get('/admin', protect, getAllProductComments);
commentrouter.put('/:productId/:commentId/response', protect, respondToComment);
commentrouter.delete('/admin/:productId/:commentId', protect,deleteAdminComment);

export default commentrouter;