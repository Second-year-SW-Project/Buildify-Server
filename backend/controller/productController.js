import mongoose from "mongoose";
import Product from "../model/productModel.js";
import { v2 as cloudinary } from "cloudinary";

export const createProduct = async (req, res) => {
    const product = req.body; // user must enter the body of the request

    const image1 = req.files.image1 && req.files.image1[0];
    const image2 = req.files.image2 && req.files.image2[0];
    const image3 = req.files.image3 && req.files.image3[0];
    const image4 = req.files.image4 && req.files.image4[0];

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
        imgUrls: imagesUrl,

    });

    if (!product.name || !product.description || !product.quantity || !product.price) {
        return res.status(400).json({ Success: false, message: "Please Enter all the required fields" });
    }

    try {
        await newProduct.save();
        res.status(201).json({ Success: true, data: newProduct });
    } catch (error) {
        console.error("Error in create product:", error.message);
        res.status(500).json({ Success: false, message: "Server Error" });
    }
}

export const getProducts = async (req, res) => {
    try {
        const products = await Product.find();
        res.status(200).json({ Success: true, data: products });
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
            const updatedProduct = await Product.findByIdAndUpdate(id, product, { new: true });
            res.status(200).json({ Success: true, data: updatedProduct });
        }
    } catch (error) {
        console.error("Error in updating product:", error.message);
        res.status(500).json({ Success: false, message: "Server Error" });
    }
}

export const deleteProduct = async (req, res) => {
    const { id } = req.params;

    try {
        // Check if ID is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ Success: false, message: "Invalid product ID" });
        }
        // Check if the product exists
        const existingProduct = await Product.findById(id);
        // Get the type of the product
        const productType = existingProduct.type;
        if (!existingProduct) {
            return res.status(404).json({ Success: false, message: "Product not found" });
        }
        // Retrieve image IDs and delete images from Cloudinary
        if (existingProduct.imgUrls && existingProduct.imgUrls.length > 0) {
            const imageDeletePromises = existingProduct.imgUrls.map(async (img) => {
                try {
                    const result = await cloudinary.uploader.destroy(img.public_id);

                    if (result.result !== 'ok') {
                        throw new Error(`Failed to delete image: ${img.public_id}`);
                    }
                } catch (error) {
                    console.error(`Error deleting image with public_id: ${img.public_id}`, error);
                }
            });

            //all images deletions
            await Promise.all(imageDeletePromises);
        }


        await Product.findByIdAndDelete(id);
        res.status(200).json({ Success: true, message: `${productType} Deleted Successfully`, });

    } catch (error) {
        console.error("Error in deleting product:", error.message);
        res.status(500).json({ Success: false, message: "Server Error" });
    }
}

