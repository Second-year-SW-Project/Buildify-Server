import express from 'express';
import { createProduct } from '../controller/productController.js';
import { getProductsBySearch } from '../controller/productController.js';

import { getProductsByAttribute } from '../controller/productController.js';
import { getProductById } from '../controller/productController.js';
import { deleteProduct } from '../controller/productController.js';
import { getProducts } from '../controller/productController.js';
import { updateProduct } from '../controller/productController.js';
import { camelToSnakeMiddleware } from '../middleware/camelToSnakeMiddleware.js';
import upload from '../middleware/multer.js';

const prouter = express.Router();

prouter.post('/add', upload.fields([{ name: "image1", maxCount: 1 }, { name: "image2", maxCount: 1 }, { name: "image3", maxCount: 1 }, { name: "image4", maxCount: 1 }]), camelToSnakeMiddleware, createProduct);
prouter.get('/search', getProductsBySearch);

prouter.get('/all', getProducts);
prouter.put('/:id', updateProduct);
prouter.delete('/:id', deleteProduct);


//Customer
prouter.get('/filter', getProductsByAttribute);

prouter.get('/:id', getProductById);

export default prouter;