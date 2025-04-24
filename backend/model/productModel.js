import mongoose from 'mongoose';

const toCamelCase = (obj) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
      toCamelCase(value),
    ])
  );
};

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
    tdp: { type: Number, required: false },
    integrated_graphics: { type: Boolean, required: false },
    includes_cooler: { type: Boolean, required: false },
    // Cooler
    cooler_type: { type: String, required: false },
    supported_socket: { type: String, required: false },
    max_tdp: { type: Number, required: false },
    height: { type: Number, required: false },
    // Motherboard
    motherboard_chipset: { type: String, required: false },
    form_factor: { type: String, required: false },
    ram_slots: { type: Number, required: false },
    max_ram: { type: Number, required: false },
    supported_memory_types: { type: String, required: false },
    pcie_slots: [
      {
        type: { type: String },
        version: { type: String },
        required: { type: Boolean, default: false },
      },
    ],
    storage_interfaces: [
      {
        type: { type: String },
        count: { type: Number, default: 1 },
        required: { type: Boolean, default: false },
      },
    ],
    // RAM
    memory_type: { type: String, required: false },
    memory_speed: { type: String, required: false },
    memory_capacity: { type: String, required: false },
    // Storage
    storage_type: { type: String, required: false },
    storage_capacity: { type: String, required: false },
    // GPU
    interface_type: { type: String, required: false },
    length: { type: Number, required: false },
    power_connectors: { type: String, required: false },
    vram: { type: String, required: false },
    gpu_chipset: { type: String, required: false },
    gpu_cores: { type: String, required: false },
    // Case
    supported_motherboard_sizes: { type: String, required: false },
    max_gpu_length: { type: Number, required: false },
    max_cooler_height: { type: Number, required: false },
    // Power Supply
    wattage: { type: String, required: false },
    efficiency_rating: { type: String, required: false },
    modular_type: { type: String, required: false },
    // Laptops
    display_size: { type: String, required: false },
    resolution: { type: String, required: false },
    cpu: { type: String, required: false },
    ram: { type: String, required: false },
    storage: { type: String, required: false },
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
    // Expansion Network (Sound Card, Wired/Wireless Network Adapters)
    component_type: { type: String, required: false },
    sound_card_channels: { type: String, required: false },
    wired_network_speed: { type: String, required: false },
    wifi_standard: { type: String, required: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        return toCamelCase(ret);
      }
    },
    toObject: { virtuals: true }
  }
);

// Pre-save middleware to clean up document
productSchema.pre('save', function (next) {
  const doc = this;

  // Remove empty arrays
  ['pcie_slots', 'storage_interfaces'].forEach(field => {
    if (doc[field] && Array.isArray(doc[field]) && doc[field].length === 0) {
      delete doc[field];
    }
  });

  // Remove undefined fields
  Object.keys(doc.toObject()).forEach(key => {
    if (doc[key] === undefined) {
      delete doc[key];
    }
  });

  next();
});

// Indexes for better query performance
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ type: 1 });
productSchema.index({ price: 1 });
productSchema.index({ manufacturer: 1 });

const Product = mongoose.model('Product', productSchema);
export default Product;