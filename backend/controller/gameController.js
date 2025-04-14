import gameModel from '../model/gameModel.js';
import { v2 as cloudinary } from "cloudinary";
import mongoose from 'mongoose';

// Helper to safely parse JSON
const parseJSON = (data) => {
    try {
        return JSON.parse(data);
    } catch (err) {
        return null;
    }
};

// Add Game
const addGames = async (req, res) => {
    try {
        const { name, description } = req.body;
        let { cpu, gpu, ram } = req.body;
        const image = req.file;

        // Log the incoming data for debugging
        console.log('Received data:', { name, description, cpu, gpu, ram });

        // Parse JSON strings if they're strings
        if (typeof cpu === 'string') cpu = JSON.parse(cpu);
        if (typeof gpu === 'string') gpu = JSON.parse(gpu);
        if (typeof ram === 'string') ram = JSON.parse(ram);
        
        // Validate required fields
        if (!name || !description || !cpu || !gpu || !ram || !image) {
            return res.status(400).json({ success: false, message: 'All fields are required, including an image' });
        }

        // Validate nested objects
        if (!cpu.cores || !cpu.threads || !cpu.baseClock || !cpu.boostClock ||
            !gpu.series || !gpu.vramGB || !gpu.boostClockMHz || !gpu.cores ||
            !ram.sizeGB || !ram.speedMHz || !ram.type) {
            return res.status(400).json({ success: false, message: 'All hardware specifications must be complete' });
        }

        // Upload image to Cloudinary
        const result = await cloudinary.uploader.upload(image.path, { resource_type: 'image' });
        const imageUrl = result.secure_url;
        const imagePublicId = result.public_id;

        // Create and save the game
        const newGame = await gameModel.create({
            name,
            description,
            cpu,
            gpu,
            ram,
            image: imageUrl,
            imagePublicId: imagePublicId
        });

        console.log('Game added successfully:', newGame);
        res.status(201).json({ success: true, message: 'Game added successfully', game: newGame });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// List Games
const listGames = async (req, res) => {
    try {
        const games = await gameModel.find({});
        res.json({ success: true, games });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update Game
const updateGames = async (req, res) => {
    try {
        const { id } = req.params;
        let updateData = { ...req.body };

        if (updateData.cpu) updateData.cpu = parseJSON(updateData.cpu);
        if (updateData.gpu) updateData.gpu = parseJSON(updateData.gpu);
        if (updateData.ram) updateData.ram = parseJSON(updateData.ram);

        if (req.file) {
            const existingGame = await gameModel.findById(id);
            if (existingGame?.imagePublicId) {
                await cloudinary.uploader.destroy(existingGame.imagePublicId);
            }

            const result = await cloudinary.uploader.upload(req.file.path, { resource_type: 'image' });
            updateData.image = result.secure_url;
            updateData.imagePublicId = result.public_id;
        }

        const updatedGame = await gameModel.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true
        });

        if (!updatedGame) {
            return res.status(404).json({ success: false, message: 'Game not found' });
        }

        res.json({ success: true, message: 'Game updated successfully', game: updatedGame });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete Game
const removeGames = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if ID is valid
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid game ID' });
        }

        // Find the game to delete and retrieve the public_id
        const game = await gameModel.findById(id);
        if (!game) {
            return res.status(404).json({ success: false, message: 'Game not found' });
        }

        // Delete image from Cloudinary
        await cloudinary.uploader.destroy(game.imagePublicId);

        // Delete the game from the database
        const deletedGame = await gameModel.findByIdAndDelete(id);
        if (!deletedGame) {
            return res.status(404).json({ success: false, message: 'Game not found' });
        }

        console.log('Game removed successfully:', deletedGame);
        res.json({ success: true, message: 'Game removed successfully', game: deletedGame });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Add this function to gameController.js
const getGameById = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if ID is valid
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid game ID format' });
        }

        const game = await gameModel.findById(id);
        
        if (!game) {
            return res.status(404).json({ success: false, message: 'Game not found' });
        }

        res.json({ success: true, game });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update your export statement to include getGameById
export { addGames, listGames, updateGames, removeGames, getGameById };
