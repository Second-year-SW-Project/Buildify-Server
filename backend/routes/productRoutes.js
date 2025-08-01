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
  getPrebuildRamSizes,
  getLaptopGraphicCards,
  getMotherboardChipsets,
  getPowerWattages,
  getPowerEfficiencyRatings,
  getStorageCapacities,
  getStorageTypes,
  getMaxGpuLengths,
  getMonitorDisplaySizes,
  getMonitorPanelTypes,
  getMonitorRefreshRates,
  getExpansionComponentTypes,
  getTopProducts,
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
prouter.get('/prebuild-ram-sizes', getPrebuildRamSizes);
prouter.get('/laptop-graphic-cards', getLaptopGraphicCards);
prouter.get('/motherboard-chipsets', getMotherboardChipsets);
prouter.get('/power-wattages', getPowerWattages);
prouter.get('/power-efficiency-ratings', getPowerEfficiencyRatings);
prouter.get('/storage-capacities', getStorageCapacities);
prouter.get('/storage-types', getStorageTypes);
prouter.get('/max-gpu-lengths', getMaxGpuLengths);
prouter.get('/monitor-display-sizes', getMonitorDisplaySizes);
prouter.get('/monitor-panel-types', getMonitorPanelTypes);
prouter.get('/monitor-refresh-rates', getMonitorRefreshRates);
prouter.get('/expansion-component-types', getExpansionComponentTypes);



//Get products by attribute
prouter.get('/filter', getProductsByAttribute);

// Get top products with highest ratings (>3) and sales
prouter.get('/top-products', protect, isAdmin, getTopProducts);

//Get products by id
prouter.get('/:id', validateObjectId, getProductById);

//Delete a product
prouter.delete('/:id', protect, isAdmin, validateObjectId, deleteProduct);

// Pie chart: product counts by main category
prouter.get('/counts/by-main-category', protect, isAdmin, getProductCountsByMainCategory);

export default prouter;