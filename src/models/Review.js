import mongoose from 'mongoose';

export const REVIEW_TAGS = [
  'on_time',
  'clean',
  'trustworthy',
  'good_behavior',
  'expensive',
  'skilled',
];

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
    comment: { type: String, trim: true, required: true, maxlength: 600 },
    tags: { type: [String], default: [] },
    // How long the reviewer actually employed the worker (optional detail).
    workDuration: { type: String, trim: true, maxlength: 80, default: '' },
    isHidden: { type: Boolean, default: false, index: true },
    adminNote: { type: String, trim: true, default: '' },
    workerReply: { type: String, trim: true, maxlength: 400, default: '' },
  },
  { timestamps: true, collection: 'reviews' }
);

// One review per user per worker.
reviewSchema.index({ worker: 1, user: 1 }, { unique: true });

const Review = mongoose.model('Review', reviewSchema);

export default Review;
