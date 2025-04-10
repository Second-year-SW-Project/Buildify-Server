import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    type: { type: String, required: false },
    name: { type: String, required: true },
    description: { type: String, required: true },
    manufacturer: { type: String, required: true },
    img_urls: [{
        public_id: { type: String, required: false },
        url: { type: String, required: false }
    }],
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    //cpu
    socket_type: { type: String, required: false },
    core_count: { type: Number, required: false },
    thread_count: { type: Number, required: false },
    base_clock: { type: Number, required: false },
    boost_clock: { type: Number, required: false },
    tdp: { type: Number, required: false },
    integrated_graphics: { type: Boolean, required: false },
    includes_cooler: { type: Boolean, required: false },
    //ram
    memory_type: { type: String, required: false },
    memory_speed: { type: Number, required: false },
    memory_capacity: { type: Number, required: false },
    //laptops
    display_size: { type: Number, required: false },
    resolution: { type: String, required: false },
    cpu: { type: String, required: false },
    ram: { type: Number, required: false },
    storage: { type: Number, required: false },
    laptop_type: { type: String, required: false },
    graphic_card: { type: String, required: false },
    //prebuilds
    desktop_type: { type: String, required: false },
}, { timestamps: true });

// Convert snake_case to camelCase for responses
productSchema.set("toJSON", {
    transform: (doc, ret) => toCamelCase(ret),
});

const Product = mongoose.model('Product', productSchema);
export default Product;
