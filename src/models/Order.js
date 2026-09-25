import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    validate: { validator: Number.isInteger, message: 'La quantité doit être un entier.' },
  },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  items: {
    type: [orderItemSchema],
    validate: { validator: items => items.length > 0, message: 'La commande doit contenir un produit.' },
  },
  status: { type: String, default: 'PENDING', required: true },
  createdAt: { type: Date, default: Date.now, required: true },
});

export default mongoose.model('Order', orderSchema);
