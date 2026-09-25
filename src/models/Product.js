import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: {
    type: Number,
    required: true,
    validate: { validator: value => value > 0, message: 'Le prix doit être strictement positif.' },
  },
  stock: { type: Number, default: 0, required: true, min: 0 },
  category: String,
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Product', productSchema);
