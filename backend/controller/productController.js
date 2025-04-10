import mongoose from "mongoose";
import Product from "../model/productModel.js";
import { v2 as cloudinary } from "cloudinary";

//clean the object by removing null values
const cleanObject = (obj) => {
    return Object.fromEntries(Object.entries(obj).filter(([_, value]) => value !== ""));
};

const toCamelCase = (obj) => {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
    return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [
            key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
            toCamelCase(value),
        ])
    );
};

export const createProduct = async (req, res) => {

    let product = JSON.parse(req.body.product); // user must enter the body of the request
    product = cleanObject(product);

    // initialize the images
    const image1 = req.files.image1 && req.files.image1[0];
    const image2 = req.files.image2 && req.files.image2[0];
    const image3 = req.files.image3 && req.files.image3[0];
    const image4 = req.files.image4 && req.files.image4[0];

    // Check if any images are provided
    const images = [image1, image2, image3, image4].filter((item) => item !== undefined);
    let imagesUrl = await Promise.all(
        images.map(async (item) => {
            let result = await cloudinary.uploader.upload(
                item.path,
                { folder: "Products", resource_type: "image" },
            );

            return {
                public_id: result.public_id,
                url: result.secure_url,
            }
        })
    )

    const newProduct = new Product({
        ...product,
        img_urls: imagesUrl,

    });

    console.log("New product", newProduct);

    if (!product.type || !product.manufacturer || !product.name || !product.description || !product.quantity || !product.price || !product.img_urls) {
        return res.status(400).json({ Success: false, message: "Please Enter all the required fields" });
    }

    try {
        await newProduct.save();
        res.status(201).json({ Success: true, data: toCamelCase(newProduct.toObject()) });
    } catch (error) {
        console.error("Error in createProduct:", error.message);
        res.status(500).json({ Success: false, message: "Server Error" });
    }
}

export const getProducts = async (req, res) => {
    try {
        const { search } = req.query;
        const query = {};

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },  // Case-insensitive name search
            ];
        }

        const products = await Product.find(query);
        const formattedProducts = products.map((product) => {
            const productObj = product.toObject();
            const camelCasedProduct = toCamelCase(productObj);

            return {
                ...camelCasedProduct,
                _id: productObj._id,
                createdAt: productObj.createdAt,
                updatedAt: productObj.updatedAt
            }
        });
        res.status(200).json({ Success: true, data: formattedProducts });
    } catch (error) {
        console.error("Error in geting product:", error.message);
        res.status(500).json({ Success: false, message: "Server Error" });
    }
}

export const updateProduct = async (req, res) => {
    const { id } = req.params;
    const product = req.body;

    try {
        // Check if ID is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ Success: false, message: "Invalid product ID" });
        }
        // Check if the product exists
        const existingProduct = await Product.findById(id);
        if (!existingProduct) {
            return res.status(404).json({ Success: false, message: "Product not found" });
        } else {
            // Convert camelCase to snake_case before updating
            product = toSnakeCase(product);

            // Update the product with only provided fields
            const updatedProduct = await Product.findByIdAndUpdate(id, { $set: product }, { new: true });
            res.status(200).json({ Success: true, data: updatedProduct });

            // Convert back to camelCase for frontend response
            res.status(200).json({ Success: true, data: toCamelCase(updatedProduct.toObject()) });
        }
    } catch (error) {
        console.error("Error in updating product:", error.message);
        res.status(500).json({ Success: false, message: "Server Error" });
    }
}

export const deleteProduct = async (req, res) => {
    const { id } = req.params;
    console.log("=================================Deleting product with ID:", id);
    try {
        // Check if ID is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ Success: false, message: "Invalid product ID" });
        }
        // Check if the product exists
        const existingProduct = await Product.findByIdAndDelete(id);
        // Get the type of the product
        const productType = existingProduct.type;
        if (!existingProduct) {
            return res.status(404).json({ Success: false, message: "Product not found" });
        }
        // Retrieve image IDs and delete images from Cloudinary
        if (existingProduct.img_urls?.length) {
            await Promise.all(
                existingProduct.img_urls.map((img) =>
                    cloudinary.uploader.destroy(img.public_id).catch((err) => {
                        console.error(`Error deleting image: ${img.public_id}`, err);
                    })
                )
            );
        }
        res.status(200).json({ Success: true, message: `${productType} Deleted Successfully`, });

    } catch (error) {
        console.error("Error in deleting product:", error);
        res.status(500).json({ Success: false, message: "Server Error" });
    }
}

