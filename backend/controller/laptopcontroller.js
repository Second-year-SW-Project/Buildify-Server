const Laptop = require('../Model/laptopModel');





//search products...

const searchLaptops = async (req, res) => {
  try {
    const query = req.query.query;
    if (!query) {
      return res.status(400).json({ message: "Query parameter is required" });
    }

    console.log("Search query:", query); // Debugging

    const laptops = await Laptop.find({
      $or: [
        { name: { $regex: query, $options: "i" } }, 
        { description: { $regex: query, $options: "i" } }
      ],
    });

    console.log("Found laptops:", laptops); // Debugging

    res.json(laptops);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Add a laptop
const addLaptop = async (req, res) => {
  try {
    const { name, price, stock , description,image1,image2,brand,warranty } = req.body;
    const laptop = new Laptop({ name, price, stock , description,image1,image2,brand,warranty});
    await laptop.save();
    res.status(201).json(laptop);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};





// Get all products
const getAllLaptops = async (req, res) => {
  try {
    const laptops = await Laptop.find();
    res.status(200).json(laptops);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//Get Product by specific attribute

const getLaptopsByAttribute = async (req, res) => {
    try {
      const { attribute, value } = req.query;
      const query = { [attribute]: value };
      const laptops = await Laptop.find(query);
      res.status(200).json(laptops);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };



// Get a laptop by ID
const getlaptopById = async (req, res) => {
  try {
    const laptop = await Laptop.findById(req.params.id);
    if (!laptop) {
      return res.status(404).json({ message: 'Laptop not found' });
    }
    res.status(200).json(laptop);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a laptop by ID
const updateLaptop = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, stock , description,image1,image2,brand,warranty } = req.body;

    // Find the product by ID and update it
    const updatedLaptop = await Laptop.findByIdAndUpdate(
      id,
      { name, price, stock , description,image1,image2,brand,warranty },
      { new: true } // Return the updated product
    );

    if (!updatedLaptop) {
      return res.status(404).json({ message: 'Laptop not found' });
    }

    res.status(200).json(updatedLaptop);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Delete a Laptop by ID
const deleteLaptop = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the product by ID and delete it
    const deletedLaptop = await Laptop.findByIdAndDelete(id);

    if (!deletedLaptop) {
      return res.status(404).json({ message: 'laptop not found' });
    }

    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


module.exports = {
  addLaptop,
  getAllLaptops,
  searchLaptops,
  getlaptopById,
  getLaptopsByAttribute,
  updateLaptop,
  deleteLaptop

};