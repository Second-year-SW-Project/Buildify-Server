// productModel.js
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
    // CPU (for processors and prebuilds)
    socket_type: { type: String, required: false },
    core_count: { type: Number, required: false },
    thread_count: { type: Number, required: false },
    base_clock: { type: Number, required: false },
    boost_clock: { type: Number, required: false },
    tdp: { type: Number, required: false },
    integrated_graphics: { type: Boolean, required: false },
    includes_cooler: { type: Boolean, required: false },
    // RAM (for RAM and prebuilds)
    memory_type: { type: String, required: false },
    memory_speed: { type: Number, required: false },
    memory_capacity: { type: Number, required: false },
    // Laptops
    display_size: { type: Number, required: false },
    resolution: { type: String, required: false },
    cpu: { type: String, required: false },
    ram: { type: Number, required: false },
    storage: { type: Number, required: false },
    laptop_type: { type: String, required: false },
    graphic_card: { type: String, required: false },
    // Prebuilds
    desktop_type: { type: String, required: false },
    // New prebuild-specific fields (added in snake_case)
    cpu_cores: { type: String, required: false },
    cpu_threads: { type: String, required: false },
    cpu_base_clock: { type: String, required: false },
    cpu_boost_clock: { type: String, required: false },
    gpu_series: { type: String, required: false },
    gpu_vram_gb: { type: String, required: false },
    gpu_boost_clock_mhz: { type: String, required: false },
    gpu_cores: { type: String, required: false },
    ram_size_gb: { type: String, required: false },
    ram_speed_mhz: { type: String, required: false },
    ram_type: { type: String, required: false },
}, { timestamps: true });

// Convert snake_case to camelCase for responses
productSchema.set("toJSON", {
    transform: (doc, ret) => toCamelCase(ret),
});

const Product = mongoose.model('Product', productSchema);
export default Product;