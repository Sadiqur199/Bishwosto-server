import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import mongoose from 'mongoose';
import Worker from '../models/Worker.js';
import { verifyNidToken } from '../utils/nidToken.js';
import { nidImagePath } from '../services/storage.js';
import { ApiError } from '../utils/ApiError.js';

const router = Router();

/**
 * GET /api/files/nid/:workerId/:side?exp=&sig=
 * Streams a PRIVATE NID image. Access is authorised ONLY by the short-lived
 * signed token issued to an admin (see GET /api/admin/workers/:id/nid).
 */
router.get('/nid/:workerId/:side', async (req, res, next) => {
  try {
    const { workerId, side } = req.params;
    const { exp, sig } = req.query;

    if (!['front', 'back'].includes(side)) throw ApiError.notFound('Image not found.');
    if (!mongoose.isValidObjectId(workerId)) throw ApiError.notFound('Image not found.');
    if (!verifyNidToken(workerId, side, exp, sig)) {
      throw ApiError.forbidden('This link is invalid or has expired.');
    }

    const worker = await Worker.findById(workerId).select('+nid');
    if (!worker) throw ApiError.notFound('Image not found.');

    const key = side === 'front' ? worker.nid?.frontImagePath : worker.nid?.backImagePath;
    if (!key) throw ApiError.notFound('Image not found.');

    const filePath = nidImagePath(key);
    if (!fs.existsSync(filePath)) throw ApiError.notFound('Image file missing.');

    res.setHeader('Cache-Control', 'private, no-store');
    return res.sendFile(path.resolve(filePath));
  } catch (err) {
    return next(err);
  }
});

export default router;
