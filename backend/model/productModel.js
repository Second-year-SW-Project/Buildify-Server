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
    // ... (rest of your schema fields remain the same)
  },
  { timestamps: true }
);

// Convert snake_case to camelCase for responses
productSchema.set('toJSON', {
  transform: (doc, ret) => toCamelCase(ret),
});

// Combined pre-save middleware
productSchema.pre('save', function (next) {
  const doc = this;
  
  // Remove empty arrays
  if (doc.pcie_slots && doc.pcie_slots.length === 0) {
    delete doc.pcie_slots;
  }
  if (doc.storage_interfaces && doc.storage_interfaces.length === 0) {
    delete doc.storage_interfaces;
  }

  // Remove undefined fields
  Object.keys(doc.toObject()).forEach((key) => {
    if (doc[key] === undefined) {
      delete doc[key];
    }
  });

  next();
});

const Product = mongoose.model('Product', productSchema);
export default Product;