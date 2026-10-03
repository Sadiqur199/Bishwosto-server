import mongoose from 'mongoose';

const creditPackSchema = new mongoose.Schema(
  { id: { type: String, required: true }, taka: { type: Number, required: true }, credits: { type: Number, required: true } },
  { _id: false }
);
const planSchema = new mongoose.Schema(
  { id: { type: String, required: true }, taka: { type: Number, required: true }, days: { type: Number, required: true } },
  { _id: false }
);

const pricingSchema = new mongoose.Schema(
  {
    // Single configuration document.
    key: { type: String, default: 'default', unique: true },
    unlockPrice: { type: Number, default: 30, min: 0 },
    creditPacks: {
      type: [creditPackSchema],
      default: [
        { id: 'pack5', taka: 100, credits: 5 },
        { id: 'pack15', taka: 250, credits: 15 },
      ],
    },
    plans: {
      type: [planSchema],
      default: [{ id: 'monthly', taka: 299, days: 30 }],
    },
  },
  { timestamps: true }
);

const Pricing = mongoose.model('Pricing', pricingSchema);
export default Pricing;
