import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, trim: true }, // e.g. 'bua', 'cook'
    nameEn: { type: String, required: true, trim: true },
    nameBn: { type: String, required: true, trim: true },
    emoji: { type: String, default: '🛠️' },
    description: { type: String, default: '' },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'categories' }
);

const Category = mongoose.model('Category', categorySchema);

export default Category;
