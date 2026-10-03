import Review from '../models/Review.js';
import Worker from '../models/Worker.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/response.js';

export async function getWorkerReviews(req, res, next) {
  try {
    const reviews = await Review.find({ worker: req.params.workerId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return sendSuccess(res, {
      message: 'Reviews retrieved.',
      data: { reviews },
    });
  } catch (err) {
    return next(err);
  }
}

export async function createReview(req, res, next) {
  try {
    const { workerId, rating, comment } = req.body;
    const user = req.user;

    if (!rating || rating < 1 || rating > 5) {
      throw ApiError.badRequest('Rating must be between 1 and 5.');
    }
    if (!comment || comment.trim().length < 3) {
      throw ApiError.badRequest('Comment must be at least 3 characters.');
    }

    const worker = await Worker.findById(workerId);
    if (!worker) {
      throw ApiError.notFound('Worker not found.');
    }

    const review = await Review.create({
      worker: worker._id,
      user: user._id,
      userName: user.name || 'Anonymous User',
      rating: Number(rating),
      comment: comment.trim(),
    });

    // Re-calculate worker average rating
    const allReviews = await Review.find({ worker: worker._id });
    const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
    worker.rating = Number((totalRating / allReviews.length).toFixed(1));
    worker.reviewCount = allReviews.length;
    await worker.save();

    return sendSuccess(res, {
      status: 201,
      message: 'Review submitted successfully.',
      data: { review, workerRating: worker.rating, reviewCount: worker.reviewCount },
    });
  } catch (err) {
    return next(err);
  }
}
