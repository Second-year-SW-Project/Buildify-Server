const Product = require("../model/productModel");


const searchAll = async (req, res) => {
    try {
        const query = req.query.query;

        // Search in both models

        const productResults = await Product.find({ name: { $regex: query, $options: "i" } });

        // Merge results
        const results = [...productResults];

        res.json(results);
    } catch (error) {
        res.status(500).json({ error: "Error fetching search results" });
    }
};

module.exports = { searchAll };
