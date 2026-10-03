import mongoose from 'mongoose';

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
    creditsUsed: { type: Number, default: 1 },
  },
  { timestamps: true, collection: 'unlocks' }
);

// One unlock record per user per worker
unlockSchema.index({ user: 1, worker: 1 }, { unique: true });

const Unlock = mongoose.model('Unlock', unlockSchema);

export default Unlock;
