const mongoose = require('mongoose');

const laptopSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },

    image1: {
        type: String, // URL or file path for product image
        required: true,
        
    },

    image2: {
        type: String, // URL or file path for product image
        required: true,
        
    },


    stock: {
        type: Number,
        required: true,
        default: 0
    },

    brand: {
        type: String,
        required: true,
        default: 0
    },





    warranty: {
        type: Number,
        required: true,
        default: 0
    },





    //////////////////////........for all.........
    createdAt: {
        type: Date,
        default: Date.now
    }



});

const Laptop = mongoose.model('Laptop', laptopSchema);

module.exports = Laptop;
