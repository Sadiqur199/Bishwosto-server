import Review, { REVIEW_TAGS } from '../models/Review.js';
import Worker from '../models/Worker.js';
import Unlock from '../models/Unlock.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/response.js';
import { computeTrustScore } from '../services/workerService.js';

/** Recalculate a worker's rating aggregates from visible reviews. */
export async function recalcWorkerRating(workerId) {
  const visible = await Review.find({ worker: workerId, isHidden: false });
  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  for (const r of visible) {
    sum += r.rating;
    breakdown[r.rating] = (breakdown[r.rating] || 0) + 1;
  }
  const count = visible.length;
  const avg = count ? Number((sum / count).toFixed(2)) : 0;

  const worker = await Worker.findById(workerId);
  if (worker) {
    worker.ratingAvg = avg;
    worker.ratingCount = count;
    worker.ratingBreakdown = breakdown;
    worker.trustScore = computeTrustScore(worker);
    await worker.save();
  }
  return { avg, count, breakdown };
}

/** GET /api/workers/:workerId/reviews - public (hides moderated reviews). */
export async function getWorkerReviews(req, res, next) {
  try {
    const worker = await Worker.findById(req.params.workerId).select('ratingAvg ratingCount ratingBreakdown');
    if (!worker) throw ApiError.notFound('Worker not found.');

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));

    const [reviews, total] = await Promise.all([
      Review.find({ worker: req.params.workerId, isHidden: false })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Review.countDocuments({ worker: req.params.workerId, isHidden: false }),
    ]);

    return sendSuccess(res, {
      message: 'Reviews',
      data: {
        reviews,
        summary: {
          avg: worker.ratingAvg,
          count: worker.ratingCount,
          breakdown: worker.ratingBreakdown,
        },
      },
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return next(err);
  }
}

/** GET /api/workers/:workerId/my-review - the current user's review (if any). */
export async function getMyReview(req, res, next) {
  try {
    const review = await Review.findOne({ worker: req.params.workerId, user: req.user._id });
    const unlocked = Boolean(await Unlock.exists({ worker: req.params.workerId, user: req.user._id }));
    return sendSuccess(res, { message: 'My review', data: { review, unlocked } });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/workers/:workerId/reviews
 * Only users who have UNLOCKED this worker's contact may review (server-side).
 */
export async function createReview(req, res, next) {
  try {
    const { workerId } = req.params;
    const { rating, comment, tags, workDuration } = req.body;

    const worker = await Worker.findById(workerId);
    if (!worker) throw ApiError.notFound('Worker not found.');

    const unlocked = await Unlock.exists({ worker: workerId, user: req.user._id });
    if (!unlocked) {
      throw ApiError.forbidden('You can only review a worker after unlocking their contact.');
    }

    const existing = await Review.findOne({ worker: workerId, user: req.user._id });
    if (existing) throw ApiError.conflict('You have already reviewed this worker. Edit your review instead.');

    const review = await Review.create({
      worker: workerId,
      user: req.user._id,
      userName: req.user.name || 'Anonymous User',
      rating: Number(rating),
      comment: comment.trim(),
      tags: Array.isArray(tags) ? tags.filter((t) => REVIEW_TAGS.includes(t)) : [],
      workDuration: workDuration || '',
    });

    const summary = await recalcWorkerRating(workerId);
    return sendSuccess(res, {
      status: 201,
      message: 'Review submitted.',
      data: { review, summary },
    });
  } catch (err) {
    return next(err);
  }
}

/** PUT /api/reviews/:id - only the author can edit their own review. */
export async function updateReview(req, res, next) {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) throw ApiError.notFound('Review not found.');
    if (String(review.user) !== String(req.user._id)) {
      throw ApiError.forbidden('You can only edit your own review.');
    }

    const { rating, comment, tags, workDuration } = req.body;
    if (rating !== undefined) review.rating = Number(rating);
    if (comment !== undefined) review.comment = comment.trim();
    if (tags !== undefined) review.tags = Array.isArray(tags) ? tags.filter((t) => REVIEW_TAGS.includes(t)) : [];
    if (workDuration !== undefined) review.workDuration = workDuration;

    // An edited re-submission clears any prior hide flag for re-moderation.
    review.isHidden = false;
    await review.save();

    const summary = await recalcWorkerRating(review.worker);
    return sendSuccess(res, { message: 'Review updated.', data: { review, summary } });
  } catch (err) {
    return next(err);
  }
}

/** DELETE /api/reviews/:id - author (or admin) can delete. */
export async function deleteReview(req, res, next) {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) throw ApiError.notFound('Review not found.');

    const isAuthor = String(review.user) === String(req.user._id);
    if (!isAuthor && req.user.role !== 'admin') {
      throw ApiError.forbidden('You can only delete your own review.');
    }

    const workerId = review.worker;
    await review.deleteOne();
    const summary = await recalcWorkerRating(workerId);
    return sendSuccess(res, { message: 'Review deleted.', data: { summary } });
  } catch (err) {
    return next(err);
  }
}
