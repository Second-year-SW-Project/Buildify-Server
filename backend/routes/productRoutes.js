import express from 'express';
import { createProduct } from '../controller/productController.js';
import { deleteProduct } from '../controller/productController.js';
import { getProducts } from '../controller/productController.js';
import { updateProduct } from '../controller/productController.js';

const prouter = express.Router();

prouter.post('/', createProduct);
prouter.get('/cpu', getProducts);
prouter.put('/:id', updateProduct);
prouter.delete('/:id', deleteProduct);


export default prouter;