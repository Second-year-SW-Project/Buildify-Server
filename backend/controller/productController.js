import mongoose from 'mongoose';
import Product from '../model/productModel.js';
import { v2 as cloudinary } from 'cloudinary';

// Clean the object by removing null or empty values
const cleanObject = (obj) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== null && value !== '' && value !== undefined)
  );
};

// Convert snake_case to camelCase
const toCamelCase = (obj) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
      toCamelCase(value),
    ])
  );
};

// Convert camelCase to snake_case
const toSnakeCase = (obj) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`),
      toSnakeCase(value),
    ])
  );
};

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

    // Define allowed fields for each product type
    const allowedFieldsByType = {
      processor: [
        'type', 'name', 'description', 'manufacturer', 'quantity', 'price',
        'socket_type', 'tdp', 'core_count', 'thread_count', 'base_clock',
        'boost_clock', 'integrated_graphics', 'includes_cooler', 'img_urls'
      ],
      cooling: [
        'type', 'name', 'description', 'manufacturer', 'quantity', 'price',
        'cooler_type', 'supported_socket', 'max_tdp', 'height', 'tdp', 'img_urls'
      ],
      motherboard: [
        'type', 'name', 'description', 'manufacturer', 'quantity', 'price',
        'socket_type', 'motherboard_chipset', 'form_factor', 'ram_slots',
        'max_ram', 'supported_memory_types', 'pcie_slots', 'storage_interfaces',
        'tdp', 'img_urls'
      ],
      ram: [
        'type', 'name', 'description', 'manufacturer', 'quantity', 'price',
        'memory_type', 'memory_capacity', 'memory_speed', 'tdp', 'img_urls'
      ],
      storage: [
        'type', 'name', 'description', 'manufacturer', 'quantity', 'price',
        'storage_type', 'storage_capacity', 'tdp', 'img_urls'
      ],
      gpu: [
        'type', 'name', 'description', 'manufacturer', 'quantity', 'price',
        'interface_type', 'tdp', 'length', 'power_connectors', 'vram',
        'gpu_chipset', 'gpu_cores', 'img_urls'
      ],
      casing: [
        'type', 'name', 'description', 'manufacturer', 'quantity', 'price',
        'form_factor', 'supported_motherboard_sizes', 'max_gpu_length',
        'max_cooler_height', 'img_urls'
      ],
      power: [
        'type', 'name', 'description', 'manufacturer', 'quantity', 'price',
        'wattage', 'efficiency_rating', 'modular_type', 'img_urls'
      ],
      laptop: [
        'type', 'name', 'description', 'manufacturer', 'quantity', 'price',
        'display_size', 'resolution', 'cpu', 'ram', 'storage', 'graphic_card',
        'laptop_type', 'img_urls'
      ],
      prebuild: [
        'type', 'name', 'description', 'manufacturer', 'quantity', 'price',
        'cpu', 'cpu_cores', 'cpu_threads', 'cpu_base_clock', 'cpu_boost_clock',
        'graphic_card', 'gpu_series', 'gpu_vram_gb', 'gpu_boost_clock_mhz',
        'gpu_cores', 'ram_size_gb', 'ram_speed_mhz', 'ram_type', 'storage',
        'desktop_type', 'img_urls'
      ],
      expansion_network: [
        'type', 'name', 'description', 'manufacturer', 'quantity', 'price',
        'component_type', 'sound_card_channels', 'network_speed', 'wifi_standard',
        'interface_type', 'img_urls'
      ],
      default: [
        'type', 'name', 'description', 'manufacturer', 'quantity', 'price', 'img_urls'
      ],
    };

    // Filter product object to include only allowed fields for the product type
    const productType = product.type || 'default';
    const allowedFields = allowedFieldsByType[productType] || allowedFieldsByType.default;
    const filteredProduct = Object.fromEntries(
      Object.entries(product).filter(([key]) => allowedFields.includes(key))
    );

    // Add images to filtered product
    filteredProduct.img_urls = imagesUrl;

    // Validation for required fields by type
    const requiredFields = {
      processor: [
        'type', 'name', 'description', 'manufacturer', 'quantity', 'price',
        'socket_type', 'tdp', 'core_count', 'thread_count', 'base_clock', 'boost_clock'
      ],
      cooling: [
        'type', 'name', 'description', 'manufacturer', 'quantity', 'price',
        'cooler_type', 'supported_socket', 'max_tdp', 'height', 'tdp'
      ],
      motherboard: [
        'type', 'name', 'description', 'manufacturer', 'quantity', 'price',
        'socket_type', 'motherboard_chipset', 'form_factor', 'ram_slots',
        'max_ram', 'supported_memory_types', 'pcie_slots', 'storage_interfaces', 'tdp'
      ],
      ram: [
        'type', 'name', 'description', 'manufacturer', 'quantity', 'price',
        'memory_type', 'memory_capacity', 'memory_speed', 'tdp'
      ],
      storage: [
        'type', 'name', 'description', 'manufacturer', 'quantity', 'price',
        'storage_type', 'storage_capacity', 'tdp'
      ],
      gpu: [
        'type', 'name', 'description', 'manufacturer', 'quantity', 'price',
        'interface_type', 'tdp', 'length', 'power_connectors', 'vram', 'gpu_chipset'
      ],
      casing: [
        'type', 'name', 'description', 'manufacturer', 'quantity', 'price',
        'form_factor', 'supported_motherboard_sizes', 'max_gpu_length', 'max_cooler_height'
      ],
      power: [
        'type', 'name', 'description', 'manufacturer', 'quantity', 'price',
        'wattage', 'efficiency_rating', 'modular_type'
      ],
      laptop: [
        'type', 'name', 'description', 'manufacturer', 'quantity', 'price',
        'display_size', 'resolution', 'cpu', 'ram', 'storage', 'graphic_card'
      ],
      prebuild: [
        'type', 'name', 'description', 'manufacturer', 'quantity', 'price',
        'cpu', 'cpu_cores', 'cpu_threads', 'cpu_base_clock', 'cpu_boost_clock',
        'graphic_card', 'gpu_series', 'gpu_vram_gb', 'gpu_boost_clock_mhz',
        'gpu_cores', 'ram_size_gb', 'ram_speed_mhz', 'ram_type', 'storage', 'desktop_type'
      ],
      expansion_network: ['type', 'name', 'description', 'manufacturer', 'quantity', 'price'],
      default: ['type', 'name', 'description', 'manufacturer', 'quantity', 'price'],
    };

    if (productType === 'expansion_network') {
      if (filteredProduct.component_type === 'sound_card') {
        requiredFields.expansion_network.push('sound_card_channels');
      } else if (filteredProduct.component_type === 'wired_network_adapter') {
        requiredFields.expansion_network.push('network_speed');
      } else if (filteredProduct.component_type === 'wireless_network_adapter') {
        requiredFields.expansion_network.push('wifi_standard');
      }
    }

    const fieldsToCheck = requiredFields[productType] || requiredFields.default;
    const missingFields = fieldsToCheck.filter((field) => {
      if (field === 'img_urls') return imagesUrl.length === 0;
      if (['supported_socket', 'supported_memory_types', 'power_connectors', 'supported_motherboard_sizes', 'pcie_slots', 'storage_interfaces'].includes(field)) {
        return !filteredProduct[field] || filteredProduct[field].length === 0;
      }
      return !filteredProduct[field];
    });

    if (missingFields.length > 0 || imagesUrl.length === 0) {
      return res.status(400).json({
        Success: false,
        message: `Please provide all required fields: ${missingFields.join(', ')}${imagesUrl.length === 0 ? ', images' : ''}`,
      });
    }

    const newProduct = new Product(filteredProduct);
    await newProduct.save();
    res.status(201).json({ Success: true, data: toCamelCase(newProduct.toObject()) });
  } catch (error) {
    console.error('Error in createProduct:', error.message, error.stack);
    res.status(500).json({ Success: false, message: `Server Error: ${error.message}` });
  }
};

export const getProducts = async (req, res) => {
  try {
    const { search } = req.query;
    const query = {};

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

    const products = await Product.find(query);
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

export const updateProduct = async (req, res) => {
  try {
    let product = JSON.parse(req.body.product || '{}');
    const images = [
      req.files.image1?.[0],
      req.files.image2?.[0],
      req.files.image3?.[0],
      req.files.image4?.[0],
    ].filter(Boolean);
    let imagesUrl = [];

    // Handle image uploads
    if (images.length > 0) {
      imagesUrl = await Promise.all(
        images.map(async (item) => {
          const result = await cloudinary.uploader.upload(item.path, {
            folder: 'Products',
            resource_type: 'image',
          });
          return { public_id: result.public_id, url: result.secure_url };
        })
      );
    }

    // Remove _id from product payload
    delete product._id;

    // Update product
    const updatedProduct = await Product.findOneAndUpdate(
      { _id: req.params.id },
      { ...product, ...(imagesUrl.length > 0 && { img_urls: imagesUrl }) },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ Success: false, message: 'Product not found' });
    }

    res.status(200).json({ Success: true, data: toCamelCase(updatedProduct.toObject()) });
  } catch (error) {
    console.error('Error in updateProduct:', error.message);
    res.status(500).json({ Success: false, message: `Server Error: ${error.message}` });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ Success: false, message: 'Invalid product ID' });
    }

    const existingProduct = await Product.findByIdAndDelete(id);
    if (!existingProduct) {
      return res.status(404).json({ Success: false, message: 'Product not found' });
    }

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
      console.log(`Product not found for ID: ${id}`);
      return res.status(404).json({ Success: false, message: `Product not found for ID: ${id}` });
    }

    // Convert to camelCase
    console.log('Converting product to camelCase:', s_product._id.toString());
    const camelCasedProduct = toCamelCase(s_product.toObject());

    res.status(200).json({ Success: true, data: camelCasedProduct });
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