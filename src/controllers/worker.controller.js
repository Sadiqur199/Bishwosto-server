import mongoose from 'mongoose';
import Worker, { AVAILABILITY } from '../models/Worker.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/response.js';
import { publicWorker } from '../utils/serializers.js';

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * GET /api/workers
 * Public list with filters. NEVER returns contact/nid (select:false + publicWorker).
 */
export async function listWorkers(req, res, next) {
  try {
    const {
      q,
      category,
      district,
      thana,
      area,
      minRating,
      availability,
      verifiedOnly,
      gender,
      workType,
      minSalary,
      maxSalary,
      sort = 'top_rated',
      page = 1,
      limit = 12,
    } = req.query;

    const filter = { status: 'approved' };
    if (category) filter.categories = category;
    if (district) filter['location.district'] = district;
    if (thana) filter['location.thana'] = thana;
    if (area) filter['location.area'] = new RegExp(escapeRegex(area), 'i');
    if (availability) filter.availability = availability;
    if (gender) filter.gender = gender;
    if (workType) filter.workType = workType;
    if (verifiedOnly === 'true') filter.isVerified = true;
    if (minRating) filter.ratingAvg = { $gte: Number(minRating) };

    if (minSalary || maxSalary) {
      filter['salaryExpectation.min'] = {};
      if (minSalary) filter['salaryExpectation.min'].$gte = Number(minSalary);
      if (maxSalary) filter['salaryExpectation.min'].$lte = Number(maxSalary);
    }

    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ name: rx }, { skills: rx }, { 'location.area': rx }, { categories: rx }];
    }

    const sortMap = {
      top_rated: { ratingAvg: -1, ratingCount: -1 },
      newest: { createdAt: -1 },
      price_low: { 'salaryExpectation.min': 1 },
      price_high: { 'salaryExpectation.min': -1 },
    };

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(50, Math.max(1, Number(limit) || 12));

    const [items, total] = await Promise.all([
      Worker.find(filter)
        .sort(sortMap[sort] || sortMap.top_rated)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Worker.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      message: 'Workers',
      data: { workers: items.map((w) => publicWorker(w)) },
      meta: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/workers/:id
 * Public profile. Contact is included ONLY for unlocked users (Phase 5).
 */
export async function getWorker(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.notFound('Worker not found.');

    const worker = await Worker.findOne({ _id: req.params.id, status: 'approved' });
    if (!worker) throw ApiError.notFound('Worker not found.');

    // Phase 5 will check the Unlock collection here.
    const unlocked = false;

    return sendSuccess(res, {
      message: 'Worker profile',
      data: {
        worker: publicWorker(worker),
        unlocked,
        reviewsSummary: { avg: worker.ratingAvg, count: worker.ratingCount },
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/workers/:id/availability
 * Allowed for the owning worker, the creating agent, or an admin.
 */
export async function updateAvailability(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.notFound('Worker not found.');
    const { availability } = req.body;
    if (!AVAILABILITY.includes(availability)) throw ApiError.badRequest('Invalid availability.');

    const worker = await Worker.findById(req.params.id);
    if (!worker) throw ApiError.notFound('Worker not found.');

    const isAdmin = req.user.role === 'admin';
    const isOwner = worker.ownerUserId && String(worker.ownerUserId) === String(req.user._id);
    const isCreator = String(worker.createdBy) === String(req.user._id);
    if (!isAdmin && !isOwner && !isCreator) {
      throw ApiError.forbidden('You cannot change this worker.');
    }

    worker.availability = availability;
    await worker.save();

    return sendSuccess(res, { message: 'Availability updated.', data: { worker: publicWorker(worker) } });
  } catch (err) {
    return next(err);
  }
}
