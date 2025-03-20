import mongoose from "mongoose";
import Product from "../model/productModel.js";

export const createProduct = async (req, res) => {
    const product = req.body; // user must enter the body of the request

    if (!product.type || !product.name || !product.manufacturer || !product.quantity || !product.price) {
        return res.status(400).json({ Success: false, message: "Please Enter all the required fields" });
    }

    const newProduct = new Product(product);

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
        if (!existingProduct) {
            return res.status(404).json({ Success: false, message: "Product not found" });
        } else {
            await Product.findByIdAndDelete(id);
            res.status(200).json({ Success: true, message: "Cpu Deleted Successfully" });
        }
    } catch (error) {
        console.error("Error in deleting product:", error.message);
        res.status(500).json({ Success: false, message: "Server Error" });
    }
}

