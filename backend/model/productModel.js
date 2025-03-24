import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    type: { type: String, required: false },
    name: { type: String, required: true },
    description: { type: String, required: true },
    manufacturer: { type: String, required: false },
    imgUrls: [{
        public_id: { type: String, required: false },
        url: { type: String, required: false }
    }],
    quantity: { type: Number, required: true },
    socket_type: { type: String, required: false },
    core_count: { type: Number, required: false },
    thread_count: { type: Number, required: false },
    base_clock: { type: Number, required: false },
    boost_clock: { type: Number, required: false },
    tdp: { type: Number, required: false },
    integrated_graphics: { type: Boolean, required: false },
    includes_cooler: { type: Boolean, required: false },
    memory_type: { type: String, required: false },
    memory_speed: { type: Number, required: false },
    memory_capacity: { type: Number, required: false },
    price: { type: Number, required: true },

}, { timestamps: true });


const Product = mongoose.model('Product', productSchema);

export default Product;