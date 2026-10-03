import Worker from '../models/Worker.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/response.js';
import { staffWorker } from '../utils/serializers.js';
import { createWorker, updateWorker } from '../services/workerService.js';

/**
 * POST /api/agent/workers  (agent or admin)
 * Multipart: `payload` JSON + photo/nidFront/nidBack images.
 * Agents create 'pending' workers; admins create 'approved' directly.
 */
export async function createMyWorker(req, res, next) {
  try {
    const worker = await createWorker({
      payload: req.body.payload,
      files: req.files,
      createdBy: req.user._id,
      status: req.user.role === 'admin' ? 'approved' : 'pending',
    });

    return sendSuccess(res, {
      status: 201,
      message:
        req.user.role === 'admin'
          ? 'Worker created and approved.'
          : 'Worker submitted for admin approval.',
      data: { worker: staffWorker(worker) },
    });
  } catch (err) {
    return next(err);
  }
}

/** PUT /api/agent/workers/:id */
export async function updateMyWorker(req, res, next) {
  try {
    const worker = await Worker.findById(req.params.id).select('+contact +nid');
    if (!worker) throw ApiError.notFound('Worker not found.');

    const isAdmin = req.user.role === 'admin';
    if (!isAdmin && String(worker.createdBy) !== String(req.user._id)) {
      throw ApiError.forbidden('This worker does not belong to you.');
    }

    const updated = await updateWorker(worker, { payload: req.body.payload, files: req.files });
    return sendSuccess(res, { message: 'Worker updated.', data: { worker: staffWorker(updated) } });
  } catch (err) {
    return next(err);
  }
}

/** GET /api/agent/workers */
export async function listMyWorkers(req, res, next) {
  try {
    const workers = await Worker.find({ createdBy: req.user._id })
      .select('+contact +nid')
      .sort({ createdAt: -1 });
    return sendSuccess(res, { message: 'My workers', data: { workers: workers.map(staffWorker) } });
  } catch (err) {
    return next(err);
  }
}
