import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    type: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: false },
    manufacturer: { type: String, required: true },
    imgUrls: { type: Array, required: false }, //this should be true
    quantity: { type: Number, required: true },
    socket_type: { type: String, required: false },
    core_count: { type: Number, required: false },
    thread_count: { type: Number, required: false },
    base_clock: { type: Number, required: false },
    boost_clock: { type: Number, required: false },
    tdp: { type: Number, required: false },
    integrated_graphics: { type: Boolean, required: false },
    includes_cooler: { type: Boolean, required: false },
    price: { type: Number, required: true },

}, { timestamps: true });


const Product = mongoose.model('Product', productSchema);

export default Product;