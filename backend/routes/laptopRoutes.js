const express = require('express');
const router = express.Router();
const Product = require('../Model/laptopModel');




const {
    addLaptop,
    getAllLaptops,
    searchLaptops,
    getlaptopById,
    getLaptopsByAttribute,
    updateLaptop,
    deleteLaptop
} = require('../Controllers/laptopcontroller');

// Routes
router.post('/laptops', addLaptop);

router.get('/laptops', getAllLaptops);

// Add the /filter route BEFORE the /:id route
router.get('/laptops/filter', getLaptopsByAttribute);

router.get("/laptops/search", searchLaptops);

// This should come after the /filter route
router.get('/laptops/:id', getlaptopById);

router.put('/laptops/:id', updateLaptop); // Update product by ID


router.delete('/laptops/:id', deleteLaptop); // Delete product by ID




module.exports = router;