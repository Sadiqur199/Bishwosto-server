import mongoose from 'mongoose';

const favoriteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    worker: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true, index: true },
  },
  { timestamps: true, collection: 'favorites' }
);

// One favorite per user per worker.
favoriteSchema.index({ user: 1, worker: 1 }, { unique: true });

const Favorite = mongoose.model('Favorite', favoriteSchema);
export default Favorite;
