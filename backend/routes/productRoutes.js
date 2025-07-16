import express from 'express';
import {
  createProduct,
  getProductsByAttribute,
  getProductById,
  deleteProduct,
  getProducts,
  updateProduct,
  getProductCountsByMainCategory,
  getManufacturersByCategory,
} from '../controller/productController.js';
import { camelToSnakeMiddleware } from '../middleware/camelToSnakeMiddleware.js';
import upload from '../middleware/multer.js';
import { validateObjectId } from '../middleware/validateObjectId.js';
import protect from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/roleMiddleware.js';

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
  protect,
  isAdmin,
  createProduct
);
//Update a product
prouter.put('/:id',
  validateObjectId,
  upload.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 },
    { name: 'image4', maxCount: 1 },
  ]),
  camelToSnakeMiddleware,
  validateObjectId,
  protect,
  isAdmin,
  updateProduct
);

//Get all products with queries
prouter.get('/all', getProducts);

// Get products by main category
prouter.get('/manufacturers', getManufacturersByCategory);

//Get products by attribute
prouter.get('/filter', getProductsByAttribute);

//Get products by id
prouter.get('/:id', validateObjectId, getProductById);

//Delete a product
prouter.delete('/:id', protect, isAdmin, validateObjectId, deleteProduct);

// Pie chart: product counts by main category
prouter.get('/counts/by-main-category', protect, isAdmin, getProductCountsByMainCategory);

export default prouter;