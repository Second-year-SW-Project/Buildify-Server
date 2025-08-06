
import express from 'express';
import {
  addProductComment,
  updateProductComment,
  deleteProductComment,
  getAllProductComments,
  respondToComment,
  deleteAdminComment,
  getProductCommentsForProduct,
  postProductCommentSafe
} from '../controller/commentController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const commentrouter = express.Router();

// Admin Routes
commentrouter.get('/admin',  getAllProductComments);

// User Routes
commentrouter.get('/:productId', getProductCommentsForProduct);
commentrouter.post('/:productId/safe', protect, postProductCommentSafe);
commentrouter.post('/:productId', protect, addProductComment);
commentrouter.put('/:productId/:commentId', updateProductComment);
commentrouter.delete('/:productId/:commentId', deleteProductComment);



commentrouter.put('/:productId/:commentId/response',  respondToComment);
commentrouter.delete('/admin/:productId/:commentId', deleteAdminComment);

export default commentrouter;