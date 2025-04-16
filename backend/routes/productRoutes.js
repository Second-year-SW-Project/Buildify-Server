import express from 'express';
import {
  createProduct,
  getProductsBySearch,
  getProductsByAttribute,
  getProductById,
  deleteProduct,
  getProducts,
  updateProduct,
} from '../controller/productController.js';
import { camelToSnakeMiddleware } from '../middleware/camelToSnakeMiddleware.js';
import upload from '../middleware/multer.js';

const prouter = express.Router();

prouter.post(
  '/add',
  upload.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 },
    { name: 'image4', maxCount: 1 },
  ]),
  camelToSnakeMiddleware,
  createProduct
);
prouter.get('/all', getProducts);
prouter.get('/search', getProductsBySearch);
prouter.get('/filter', getProductsByAttribute);
prouter.get('/:id', getProductById);
prouter.put('/:id', upload.fields([
  { name: 'image1', maxCount: 1 },
  { name: 'image2', maxCount: 1 },
  { name: 'image3', maxCount: 1 },
  { name: 'image4', maxCount: 1 },
]), camelToSnakeMiddleware, updateProduct);
prouter.delete('/:id', deleteProduct);

export default prouter;