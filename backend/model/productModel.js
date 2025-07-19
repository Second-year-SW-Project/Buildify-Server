import mongoose from 'mongoose';
import { toCamelCase } from '../middleware/snakeToCamelMiddleware.js';

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
    base_clock: { type: String, required: false },
    boost_clock: { type: String, required: false },
    integrated_graphics: { type: Boolean, required: false },
    includes_cooler: { type: Boolean, required: false },
    tdp: { type: Number, required: false },
    // Cooler
    cooler_type: { type: String, required: false },
    supported_socket: { type: String, required: false },
    max_tdp: { type: Number, required: false },
    height: { type: Number, required: false },
    // Motherboard
    motherboard_chipset: { type: String, required: false },
    socket_type: { type: String, required: false },
    form_factor: { type: String, required: false },
    ram_slots: { type: Number, required: false },
    max_ram: { type: Number, required: false },
    supported_memory_types: { type: String, required: false },
    tdp: { type: Number, required: false },
    pcie_slots: {
      type: [
        {
          type: { type: String },
          version: { type: String },
          count: { type: Number, default: null },
          required: { type: Boolean, default: false },
        },
      ],
      default: undefined,
    },
    storage_interfaces: {
      type: [
        {
          type: { type: String },
          count: { type: Number, default: null },
          required: { type: Boolean, default: false },
        },
      ],
      default: undefined,
    },
    // RAM
    memory_type: { type: String, required: false },
    memory_speed: { type: String, required: false },
    memory_capacity: { type: String, required: false },
    tdp: { type: Number, required: false },
    // Storage
    storage_type: { type: String, required: false },
    storage_capacity: { type: String, required: false },
    tdp: { type: Number, required: false },
    // GPU
    interface_type: { type: String, required: false },
    length: { type: Number, required: false },
    power_connectors: { type: String, required: false },
    vram: { type: String, required: false },
    tdp: { type: Number, required: false },
    gpu_chipset: { type: String, required: false },
    gpu_cores: { type: String, required: false },
    // Case
    form_factor: { type: String, required: false },
    supported_motherboard_sizes: { type: String, required: false },
    max_gpu_length: { type: Number, required: false },
    max_cooler_height: { type: Number, required: false },
    // Power Supply
    wattage: { type: String, required: false },
    efficiency_rating: { type: String, required: false },
    modular_type: { type: String, required: false },
    // keyboard
    keyboard_type: { type: String, required: false },
    connectivity: { type: String, required: false },
    // mouse
    mouse_type: { type: String, required: false },
    // Laptops
    display_size: { type: String, required: false },
    refresh_rate: { type: String, required: false },
    laptop_type: { type: String, required: false },
    cpu: { type: String, required: false },
    ram: { type: String, required: false },
    storage: { type: String, required: false },
    graphic_card: { type: String, required: false },
    // monitor
    resolution: { type: String, required: false },
    panel_type: { type: String, required: false },
    monitor_type: { type: String, required: false },
    // Prebuilds
    cpu_cores: { type: String, required: false },
    cpu_threads: { type: String, required: false },
    cpu_base_clock: { type: String, required: false },
    cpu_boost_clock: { type: String, required: false },
    gpu_series: { type: String, required: false },
    gpu_vram: { type: String, required: false },
    gpu_boost_clock: { type: String, required: false },
    gpu_cores: { type: String, required: false },
    prebuild_gpu_cores: { type: String, required: false },
    ram_size: { type: String, required: false },
    ram_speed: { type: String, required: false },
    ram_type: { type: String, required: false },
    desktop_type: { type: String, required: false },
    // Expansion Network (Sound Card, Wired/Wireless Network Adapters)
    component_type: { type: String, required: false },
    sound_card_channels: { type: String, required: false },
    wired_network_speed: { type: String, required: false },
    wifi_standard: { type: String, required: false },
    network_speed: { type: String, required: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret._id = ret._id.toString();
        delete ret.__v;
        return toCamelCase(ret);
      }
    },
    toObject: { virtuals: true }
  }
);

// Indexes for better query performance
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ type: 1 });
productSchema.index({ price: 1 });
productSchema.index({ manufacturer: 1 });

const Product = mongoose.model('Product', productSchema);
export default Product;