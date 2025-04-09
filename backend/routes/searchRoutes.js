const express = require("express");
const { searchProducts } = require("../Controllers/searchController"); 
const router = express.Router();

// Ensure the correct API path is used for searching
router.get("/search", searchProducts);

module.exports = router;
