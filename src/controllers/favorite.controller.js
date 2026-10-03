import mongoose from 'mongoose';
import Favorite from '../models/Favorite.js';
import Worker from '../models/Worker.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/response.js';
import { publicWorker } from '../utils/serializers.js';

/** GET /api/favorites - the user's saved workers. */
export async function listFavorites(req, res, next) {
  try {
    const favorites = await Favorite.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
    const ids = favorites.map((f) => f.worker);
    const workers = await Worker.find({ _id: { $in: ids }, status: 'approved' });
    const byId = Object.fromEntries(workers.map((w) => [String(w._id), w]));

    const data = favorites
      .map((f) => {
        const w = byId[String(f.worker)];
        return w ? { ...publicWorker(w), favoritedAt: f.createdAt } : null;
      })
      .filter(Boolean);

    return sendSuccess(res, { message: 'Favorites', data: { workers: data } });
  } catch (err) {
    return next(err);
  }
}

/** POST /api/favorites/:workerId - save a worker (idempotent). */
export async function addFavorite(req, res, next) {
  try {
    const { workerId } = req.params;
    if (!mongoose.isValidObjectId(workerId)) throw ApiError.notFound('Worker not found.');

    const worker = await Worker.findOne({ _id: workerId, status: 'approved' });
    if (!worker) throw ApiError.notFound('Worker not found.');

    await Favorite.updateOne(
      { user: req.user._id, worker: workerId },
      { $setOnInsert: { user: req.user._id, worker: workerId } },
      { upsert: true }
    );

    return sendSuccess(res, { status: 201, message: 'Saved to favorites.', data: { workerId } });
  } catch (err) {
    return next(err);
  }
}

/** DELETE /api/favorites/:workerId - remove a saved worker. */
export async function removeFavorite(req, res, next) {
  try {
    const { workerId } = req.params;
    if (!mongoose.isValidObjectId(workerId)) throw ApiError.notFound('Worker not found.');

    await Favorite.deleteOne({ user: req.user._id, worker: workerId });
    return sendSuccess(res, { message: 'Removed from favorites.', data: { workerId } });
  } catch (err) {
    return next(err);
  }
}
