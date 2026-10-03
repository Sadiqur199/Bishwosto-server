import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Worker',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userName: { type: String, trim: true, default: 'Anonymous' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, required: true },
  },
  { timestamps: true, collection: 'reviews' }
);

const Review = mongoose.model('Review', reviewSchema);

export default Review;
