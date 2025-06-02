import express from 'express';
import {
  createProduct,
  getProductsByAttribute,
  getProductById,
  deleteProduct,
  getProducts,
  updateProduct,
  getProductCountsByMainCategory,
} from '../controller/productController.js';
import { camelToSnakeMiddleware } from '../middleware/camelToSnakeMiddleware.js';
import upload from '../middleware/multer.js';

const prouter = express.Router();

//Create a new product
prouter.post('/add',
  upload.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 },
    { name: 'image4', maxCount: 1 },
  ]),
  camelToSnakeMiddleware,
  createProduct
);
//Update a product
prouter.put('/:id',
  upload.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 },
    { name: 'image4', maxCount: 1 },
  ]),
  camelToSnakeMiddleware,
  updateProduct
);

//Get all products with queries
prouter.get('/all', getProducts);

//Get products by attribute
prouter.get('/filter', getProductsByAttribute);

//Get products by id
prouter.get('/:id', getProductById);

//Delete a product
prouter.delete('/:id', deleteProduct);

// Pie chart: product counts by main category
prouter.get('/counts/by-main-category', getProductCountsByMainCategory);

export default prouter;