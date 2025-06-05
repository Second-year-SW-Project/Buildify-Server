import mongoose from 'mongoose';
import Product from '../model/productModel.js';
import { toSnakeCase } from '../middleware/camelToSnakeMiddleware.js';
import { toCamelCase } from '../middleware/snakeToCamelMiddleware.js';
import { v2 as cloudinary } from 'cloudinary';

// Clean the object by removing null or empty values
function cleanObject(obj) {

  const cleaned = {};
  for (const key in obj) {
    const value = obj[key];

    // Skip undefined, null, empty strings and empty arrays
    if (value === undefined || value === null || value === '') {
      continue;
    }
    if (Array.isArray(value)) {
      // Skip empty arrays
      if (value.length === 0) {
        continue;
      }
    }
    cleaned[key] = value;
  }
  return cleaned;
}

// Validation utility for product fields
function validateProductFields(product, isUpdate = false) {
  // Define base required fields for all products
  const baseRequiredFields = [
    'type', 'name', 'manufacturer', 'quantity', 'price'
  ];
  // Define unique fields for each type
  const uniqueFieldsByType = {
    processor: ['socket_type', 'core_count', 'thread_count', 'base_clock', 'boost_clock', 'tdp'],
    ram: ['ram_type', 'ram_speed', 'ram_size'],
    gpu: ['gpu_chipset', 'gpu_vram', 'gpu_cores', 'interface_type'],
    motherboard: ['motherboard_chipset', 'motherboard_socket', 'form_factor', 'ram_slots', 'max_ram', 'memory_types', 'pcie_slot_type', 'pcie_version', 'storage_type'],
    storage: ['storage_type', 'storage_capacity'],
    casing: ['form_factor', 'supported_motherboard_sizes'],
    power: ['wattage', 'efficiency_rating', 'modular_type'],
    cooling: ['cooler_type', 'supported_socket', 'max_tdp', 'height'],
    keyboard: ['keyboard_type', 'connectivity'],
    mouse: ['connectivity'],
    monitor: ['display_size', 'resolution', 'refresh_rate', 'panel_type', 'monitor_type'],
    laptop: ['laptop_type', 'cpu', 'ram', 'storage', 'graphic_card', 'display_size', 'refresh_rate'],
    prebuild: ['cpu', 'gpu', 'ram', 'storage', 'desktop_type'],
    expansion_network: ['component_type', 'interface_type'],
    gamepad: ['connectivity'],
    accessories: [],
    externals: [],
    cables_and_connectors: []
  };
  const errors = [];
  const type = product.type;
  if (!type || !uniqueFieldsByType[type]) {
    errors.push('Invalid or missing product type');
    return errors;
  }
  // Merge base and unique fields
  const requiredFields = [...baseRequiredFields, ...uniqueFieldsByType[type]];
  requiredFields.forEach((field) => {
    if (!isUpdate && (product[field] === undefined || product[field] === null || product[field] === '')) {
      errors.push(`Missing required field: ${field}`);
    }
  });
  return errors;
}

// Create a new product
export const createProduct = async (req, res) => {
  try {
    let product;
    try {
      product = JSON.parse(req.body.product || '{}');
    } catch (error) {
      return res.status(400).json({ Success: false, message: 'Invalid product data format' });
    }
    product = cleanObject(product);
    // Validate product fields
    const validationErrors = validateProductFields(product);
    if (validationErrors.length > 0) {
      return res.status(400).json({ Success: false, message: 'Validation error', errors: validationErrors });
    }

    // Initialize images
    const images = [
      req.files.image1?.[0],
      req.files.image2?.[0],
      req.files.image3?.[0],
      req.files.image4?.[0],
    ].filter((item) => item !== undefined);

    // Validate images
    // Initialize imagesUrl array
    let imagesUrl = [];
    if (images.length > 0) {
      try {
        imagesUrl = await Promise.all(
          images.map(async (item) => {
            try {
              // Upload image to Cloudinary
              const result = await cloudinary.uploader.upload(item.path, {
                folder: 'Products',
                resource_type: 'image',
              });
              return {
                // Extracting public_id and url from the result
                public_id: result.public_id,
                url: result.secure_url,
              };
            } catch (uploadError) {
              console.error(`Error uploading image: ${item.path}`, uploadError.message);// Debugging
              throw new Error(`Image upload failed: ${uploadError.message}`);
            }
          })
        );
      } catch (error) {
        console.error('Error in image uploads:', error.message);
        return res.status(500).json({ Success: false, message: `Failed to upload images: ${error.message}` });
      }
    }

    //Add images to product object
    const newProduct = new Product({
      ...product,
      img_urls: imagesUrl,
    });

    //Save product to database
    await newProduct.save();
    res.status(201).json({ Success: true, data: toCamelCase(newProduct.toObject()) });

  } catch (error) {
    console.error('Error in createProduct:', error.message, error.stack);// Debugging
    res.status(500).json({ Success: false, message: `Server Error: ${error.message}` });
  }
};

// Get all products
export const getProducts = async (req, res) => {
  try {
    // Validate page
    if (req.query.page && (isNaN(parseInt(req.query.page)) || parseInt(req.query.page) <= 0)) {
      return res.status(400).json({ Success: false, message: "Invalid page number" });
    }
    // Validate limit
    if (req.query.limit && (isNaN(parseInt(req.query.limit)) || parseInt(req.query.limit) <= 0)) {
      return res.status(400).json({ Success: false, message: "Invalid limit" });
    }
    // Validate statusFilter
    const allowedStatus = ['In Stock', 'Low Stock', 'Out of Stock'];
    if (req.query.statusFilter && !allowedStatus.includes(req.query.statusFilter)) {
      return res.status(400).json({ Success: false, message: "Invalid status filter" });
    }
    // Validate date
    if (req.query.date && isNaN(new Date(req.query.date).getTime())) {
      return res.status(400).json({ Success: false, message: "Invalid date format" });
    }

    // Extract search query and pagination parameters
    const {
      search,
      query,
      page = 1,
      limit = 5,
      statusFilter,
      date,
      subCategory
    } = req.query;
    const searchQuery = search || query; // Support both search and query parameters
    const queryObj = {};

    // Add status filter
    if (statusFilter) {
      switch (statusFilter) {
        case 'In Stock':
          queryObj.quantity = { $gt: 5 };
          break;
        case 'Low Stock':
          queryObj.quantity = { $gt: 0, $lte: 5 };
          break;
        case 'Out of Stock':
          queryObj.quantity = 0;
          break;
      }
    }
    // Add date filter
    if (date) {
      const filterDate = new Date(date);
      const nextDay = new Date(filterDate);
      nextDay.setDate(nextDay.getDate() + 1);

      // Filter products updated within the date range
      queryObj.updatedAt = {
        $gte: filterDate,
        $lt: nextDay
      };
    }
    // Add category filters
    if (subCategory) {
      queryObj.type = subCategory;
    }

    // Check if the search query is provided
    if (searchQuery) {
      queryObj.$or = [
        { name: { $regex: searchQuery, $options: 'i' } },
        { type: { $regex: searchQuery, $options: 'i' } },
        { manufacturer: { $regex: searchQuery, $options: 'i' } },
        { motherboard_chipset: { $regex: searchQuery, $options: 'i' } },
        { gpu_chipset: { $regex: searchQuery, $options: 'i' } },
        { cooler_type: { $regex: searchQuery, $options: 'i' } },
        { storage_type: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } }
      ];
    }

    // Calculate skip value for pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get total count of products
    const totalProducts = await Product.countDocuments(queryObj);

    // Get paginated products
    const products = await Product.find(queryObj)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    //Map through the products and convert to camelCase
    const formattedProducts = products.map((product) => {
      const productObj = product.toObject();
      return {
        ...toCamelCase(productObj),
        _id: productObj._id,
        createdAt: productObj.createdAt,
        updatedAt: productObj.updatedAt,
      };
    });

    res.status(200).json({
      Success: true, data: formattedProducts,
      pagination: {
        total: totalProducts, // Total number of products
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalProducts / parseInt(limit)) //Round up to the nearest whole number
      }
    });

  } catch (error) {
    console.error('Error in getProducts:', error.message, error.stack); // Debugging
    res.status(500).json({ Success: false, message: `Server Error: ${error.message}` });
  }
};

// Update a product
export const updateProduct = async (req, res) => {
  try {
    let product = JSON.parse(req.body.product || '{}');
    const cleanedProduct = cleanObject(product);
    //Prevents modification of the Id by remove it
    delete cleanedProduct._id;
    // Validate product fields (allow partial for update, but check type if present)
    if (cleanedProduct.type) {
      const validationErrors = validateProductFields(cleanedProduct, true);
      if (validationErrors.length > 0) {
        return res.status(400).json({ Success: false, message: 'Validation error', errors: validationErrors });
      }
    }

    //Extrat 4 images from the files
    const images = [
      req.files.image1?.[0],
      req.files.image2?.[0],
      req.files.image3?.[0],
      req.files.image4?.[0],
    ].filter(Boolean);

    //Fetch the existing product
    const existingProduct = await Product.findById(req.params.id);
    if (!existingProduct) {
      return res.status(404).json({ Success: false, message: 'Product not found' });
    }

    let imagesUrl = [...(existingProduct.img_urls || [])];

    if (images.length > 0) {

      //Destroy the existing images
      const imagesToDelete = imagesUrl.slice(0, images.length);
      await Promise.all(
        imagesToDelete.map(img => cloudinary.uploader.destroy(img.public_id))
      );

      //Upload new images
      const newImages = await Promise.all(
        images.map(async (item) => {
          const result = await cloudinary.uploader.upload(item.path, {
            folder: 'Products',
            resource_type: 'image',
          });
          return { public_id: result.public_id, url: result.secure_url };
        })
      );

      //Replace existing images with new ones
      imagesUrl.splice(0, images.length, ...newImages);

    }

    //Update product
    const updatedProduct = await Product.findOneAndUpdate(
      { _id: req.params.id },
      { ...cleanedProduct, img_urls: imagesUrl },
      { new: true, runValidators: true }//Returns Updated images and Scheme Validation
    );

    res.status(200).json({ Success: true, data: toCamelCase(updatedProduct.toObject()) });

  } catch (error) {
    console.error('Error in updateProduct:', error.message); // Debugging
    res.status(500).json({ Success: false, message: `Server Error: ${error.message}` });
  }
};

// Delete a product
export const deleteProduct = async (req, res) => {
  try {
    // ID validation is now handled by middleware
    const { id } = req.params;

    // Find and delete the product
    const existingProduct = await Product.findByIdAndDelete(id);
    if (!existingProduct) {
      return res.status(404).json({ Success: false, message: 'Product not found' });
    }

    // Delete images from Cloudinary
    if (existingProduct.img_urls?.length) {
      try {
        await Promise.all(
          existingProduct.img_urls.map((img) =>
            cloudinary.uploader.destroy(img.public_id).catch((err) => {
              console.error(`Error deleting image: ${img.public_id}`, err.message);
            })
          )
        );
      } catch (error) {
        console.error('Error deleting images:', error.message);
        // Continue with deletion even if image cleanup fails
      }
    }
    res.status(200).json({
      Success: true,
      message: `${existingProduct.type} Deleted Successfully`,
    });
  } catch (error) {
    console.error('Error in deleteProduct:', error.message, error.stack);// Debugging
    res.status(500).json({ Success: false, message: `Server Error: ${error.message}` });
  }
};

// Get products by attribute
export const getProductsByAttribute = async (req, res) => {
  try {
    // Validate that at least one attribute/value pair is provided
    const attributes = Object.keys(req.query).filter(key => key.startsWith('attribute'));
    if (attributes.length === 0) {
      return res.status(400).json({ Success: false, message: 'No attribute filters provided' });
    }
    // Extract query parameters
    const query = {};

    // Extract search query and initialize query object
    attributes.forEach((attrKey, index) => {
      const valueKey = `value${index === 0 ? '' : index + 1}`;
      const attr = req.query[attrKey];
      const value = req.query[valueKey];

      // Check if both attribute and value are provided
      if (attr && value) {
        query[toSnakeCase(attr)] = value;
      }
    });

    // Check if the query is empty
    const products = await Product.find(query);

    // Convert to camelCase and format the response
    const formattedProducts = products.map((product) => {
      const productObj = product.toObject();
      const camelCasedProduct = toCamelCase(productObj);

      return {
        ...camelCasedProduct,
        _id: productObj._id,
      }
    });
    res.status(200).json(formattedProducts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a product by ID
export const getProductById = async (req, res) => {
  try {
    // ID validation is now handled by middleware
    const { id } = req.params; // Extracts Product Id
    console.log(`Fetching product with ID: ${id}`); // Debugging

    // Fetch product
    const s_product = await Product.findById(id);
    if (!s_product) {
      return res.status(404).json({ Success: false, message: `Product not found for ID: ${id}` });
    }

    // Convert to camelCase
    const camelCasedProduct = toCamelCase(s_product.toObject());

    res.status(200).json({ Success: true, ...camelCasedProduct, _id: s_product._id, });

  } catch (error) {
    console.error('Error in getProductById:', { message: error.message });// Debugging
    res.status(500).json({ Success: false, message: `Server error: ${error.message}` });
  }
};

// Pie chart data: Get product counts by main category (for dashboard)
export const getProductCountsByMainCategory = async (req, res) => {
  try {
    // Validate mainCategory
    const subCategories = {
      Necessary: [
        "ram", "gpu", "processor", "motherboard", "storage", "casing", "power"
      ],
      Optional: [
        "cooling", "keyboard", "mouse", "monitor", "ups", "expansion_network", "gamepad"
      ],
      Common: [
        "laptop", "prebuild", "accessories", "externals", "cables_and_connectors"
      ]
    };
    const { mainCategory } = req.query;
    if (!mainCategory || !subCategories[mainCategory]) {
      return res.status(400).json({ Success: false, message: 'Invalid main category' });
    }
    const subCats = subCategories[mainCategory];
    // For each subcategory, count products
    const counts = await Promise.all(
      subCats.map(async (sub) => {
        const count = await Product.countDocuments({ type: sub });
        return { value: sub, count };
      })
    );
    res.status(200).json({ Success: true, data: counts });
  } catch (error) {
    res.status(500).json({ Success: false, message: error.message });
  }
};