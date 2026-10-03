import mongoose from 'mongoose';

export const UNLOCK_METHODS = ['credit', 'direct', 'plan', 'free'];

const unlockSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Worker',
      required: true,
      index: true,
    },
    method: { type: String, enum: UNLOCK_METHODS, default: 'credit' },
    creditsUsed: { type: Number, default: 0 },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
  },
  { timestamps: true, collection: 'unlocks' }
);

// One unlock record per user per worker (idempotency guarantee).
unlockSchema.index({ user: 1, worker: 1 }, { unique: true });

const Unlock = mongoose.model('Unlock', unlockSchema);

export default Unlock;
