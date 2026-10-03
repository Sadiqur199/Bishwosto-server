import mongoose from 'mongoose';

export const PAYMENT_PURPOSES = ['unlock', 'credit_pack', 'plan'];
export const PAYMENT_STATUS = ['pending', 'success', 'failed', 'refunded'];

const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    purpose: { type: String, enum: PAYMENT_PURPOSES, required: true },
    packId: { type: String, default: '' },
    gateway: { type: String, enum: ['bkash', 'nagad', 'sslcommerz', 'aamarpay'], default: 'sslcommerz' },
    // Unique idempotency key from the gateway (prevents double-processing).
    transactionId: { type: String, trim: true, index: true, default: '' },
    gatewayRef: { type: String, trim: true, default: '' },
    status: { type: String, enum: PAYMENT_STATUS, default: 'pending', index: true },
    meta: { type: Object, default: {} },
  },
  { timestamps: true, collection: 'payments' }
);

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
