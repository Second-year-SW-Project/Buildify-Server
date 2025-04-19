import mongoose from 'mongoose';

// Assuming toCamelCase is defined elsewhere or imported


const productSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    manufacturer: { type: String, required: true },
    img_urls: [
      {
        public_id: { type: String, required: false },
        url: { type: String, required: false },
      },
    ],
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    // CPU (for processors and prebuilds)
    socket_type: { type: String, required: false },
    core_count: { type: Number, required: false },
    thread_count: { type: Number, required: false },
    base_clock: { type: String, required: false }, // Changed to String to allow "3.2 GHz"
    boost_clock: { type: String, required: false }, // Changed to String
    tdp: { type: Number, required: false },
    integrated_graphics: { type: Boolean, default: false },
    includes_cooler: { type: Boolean, default: false },
    // Cooler
    cooler_type: { type: String, required: false },
    supported_socket: [{ type: String }], // Array for multiple sockets
    max_tdp: { type: Number, required: false },
    height: { type: Number, required: false }, // In mm
    // Motherboard
    motherboard_chipset: { type: String, required: false },
    form_factor: { type: String, required: false },
    ram_slots: { type: Number, required: false },
    max_ram: { type: Number, required: false },
    supported_memory_types: [{ type: String }], // Array
    pcie_slots: [
      {
        type: { type: String }, // e.g., "x16"
        version: { type: String }, // e.g., "4.0"
      },
    ],
    storage_interfaces: [
      {
        type: { type: String }, // e.g., "SATA"
        count: { type: Number, default: 1 },
      },
    ],
    // RAM
    memory_type: { type: String, required: false },
    memory_speed: { type: String, required: false }, // Changed to String for "3200 MHz"
    memory_capacity: { type: String, required: false }, // Changed to String for "16 GB"
    // Storage
    storage_type: { type: String, required: false },
    storage_capacity: { type: String, required: false }, // Changed to String for "1 TB"
    // GPU
    interface_type: { type: String, required: false },
    length: { type: Number, required: false }, // In mm
    power_connectors: [{ type: String }], // Array
    vram: { type: String, required: false }, // Changed to String for "8 GB"
    gpu_chipset: { type: String, required: false },
    // Case
    supported_motherboard_sizes: [{ type: String }], // Array
    max_gpu_length: { type: Number, required: false }, // In mm
    max_cooler_height: { type: Number, required: false }, // In mm
    // Power Supply
    wattage: { type: String, required: false }, // Changed to String for "750 W"
    efficiency_rating: { type: String, required: false },
    modular_type: { type: String, required: false },
    // Laptops
    display_size: { type: String, required: false }, // Changed to String for "15.6 inch"
    resolution: { type: String, required: false },
    cpu: { type: String, required: false },
    ram: { type: String, required: false }, // Changed to String for "16 GB"
    storage: { type: String, required: false }, // Changed to String for "512 GB"
    laptop_type: { type: String, required: false },
    graphic_card: { type: String, required: false },
    // Prebuilds
    desktop_type: { type: String, required: false },
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
  },
  { timestamps: true }
);

// Convert snake_case to camelCase for responses
productSchema.set('toJSON', {
  transform: (doc, ret) => toCamelCase(ret),
});

const Product = mongoose.model('Product', productSchema);
export default Product;