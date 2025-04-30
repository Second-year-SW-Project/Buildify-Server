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

    // Skip undefined, null, empty strings
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

// Create a new product
export const createProduct = async (req, res) => {
  try {
    let product;
    try {
      product = JSON.parse(req.body.product || '{}');
    } catch (error) {
      console.error('Error parsing req.body.product:', error.message);
      return res.status(400).json({ Success: false, message: 'Invalid product data format' });
    }

    product = cleanObject(product);

    // Initialize images
    const images = [
      req.files.image1?.[0],
      req.files.image2?.[0],
      req.files.image3?.[0],
      req.files.image4?.[0],
    ].filter((item) => item !== undefined);

    // Validate images
    let imagesUrl = [];
    if (images.length > 0) {
      try {
        imagesUrl = await Promise.all(
          images.map(async (item) => {
            try {
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
              console.error(`Error uploading image: ${item.path}`, uploadError.message);
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
    console.error('Error in createProduct:', error.message, error.stack);
    res.status(500).json({ Success: false, message: `Server Error: ${error.message}` });
  }
};

// Get all products
export const getProducts = async (req, res) => {
  try {
    const { search } = req.query;
    const query = {};

    // Check if the search query is provided
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { type: { $regex: search, $options: 'i' } },
        { manufacturer: { $regex: search, $options: 'i' } },
        { motherboard_chipset: { $regex: search, $options: 'i' } },
        { gpu_chipset: { $regex: search, $options: 'i' } },
        { cooler_type: { $regex: search, $options: 'i' } },
        { wattage: { $regex: search, $options: 'i' } },
        { modular_type: { $regex: search, $options: 'i' } },
        { storage_type: { $regex: search, $options: 'i' } },
      ];
    }


    const products = await Product.find(query).sort({ updatedAt: 1 });

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

    res.status(200).json({ Success: true, data: formattedProducts });

  } catch (error) {
    console.error('Error in getProducts:', error.message, error.stack);
    res.status(500).json({ Success: false, message: `Server Error: ${error.message}` });
  }
};

// Update a product
export const updateProduct = async (req, res) => {
  try {

    let product = JSON.parse(req.body.product || '{}');

    //Initialize images
    const images = [
      req.files.image1?.[0],
      req.files.image2?.[0],
      req.files.image3?.[0],
      req.files.image4?.[0],
    ].filter(Boolean);

    // Clean the empty attributes from the product object
    const cleanedProduct = cleanObject(product);
    delete cleanedProduct._id;

    // Fetch the existing product
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
      { new: true, runValidators: true }
    );

    res.status(200).json({ Success: true, data: toCamelCase(updatedProduct.toObject()) });

  } catch (error) {
    console.error('Error in updateProduct:', error.message);
    res.status(500).json({ Success: false, message: `Server Error: ${error.message}` });
  }
};

// Delete a product
export const deleteProduct = async (req, res) => {
  try {

    const { id } = req.params;

    // Check if ID is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ Success: false, message: 'Invalid product ID' });
    }

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
    console.error('Error in deleteProduct:', error.message, error.stack);
    res.status(500).json({ Success: false, message: `Server Error: ${error.message}` });
  }
};

// Get products by search
export const getProductsBySearch = async (req, res) => {
  try {
    const query = req.query.query;
    if (!query) {
      return res.status(400).json({ message: "Query parameter is required" });
    }

    console.log("Search query:", query); // Debugging

    const products = await Product.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { type: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } }
      ],
    });

    console.log("Found products:", products); // Debugging

    const formattedProducts = products.map((product) => {
      const productObj = product.toObject();
      const camelCasedProduct = toCamelCase(productObj);

      return {
        ...camelCasedProduct,
        _id: productObj._id,
      }
    });

    res.json(formattedProducts);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get products by attribute
export const getProductsByAttribute = async (req, res) => {
  try {
    const query = {};
    const attributes = Object.keys(req.query).filter(key => key.startsWith('attribute'));

    attributes.forEach((attrKey, index) => {
      const valueKey = `value${index === 0 ? '' : index + 1}`;
      const attr = req.query[attrKey];
      const value = req.query[valueKey];

      if (attr && value) {
        query[toSnakeCase(attr)] = value;
      }
    });

    const products = await Product.find(query);

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
    const { id } = req.params;
    console.log(`Fetching product with ID: ${id}`); // Debug log

    // Check if ID is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log(`Invalid product ID format: ${id}`);
      return res.status(400).json({ Success: false, message: `Invalid product ID: ${id}` });
    }

    // Fetch product
    const s_product = await Product.findById(id);
    if (!s_product) {
      // console.log(`Product not found for ID: ${id}`);
      return res.status(404).json({ Success: false, message: `Product not found for ID: ${id}` });
    }

    // Convert to camelCase
    // console.log('Converting product to camelCase:', s_product._id.toString());
    const camelCasedProduct = toCamelCase(s_product.toObject());

    res.status(200).json({ Success: true, ...camelCasedProduct, _id: s_product._id, });
  } catch (error) {
    console.error('Error in getProductById:', {
      message: error.message,
      stack: error.stack,
      id: req.params.id,
      mongoConnection: mongoose.connection.readyState, // 0=disconnected, 1=connected
    });
    res.status(500).json({
      Success: false,
      message: `Server error: ${error.message}`,
      details: {
        mongoConnection: mongoose.connection.readyState,
        errorName: error.name,
      }
    });
  }
};