import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import mongoose from 'mongoose';
import Worker from '../models/Worker.js';
import User from '../models/User.js';
import { verifyNidToken } from '../utils/nidToken.js';
import { nidImagePath } from '../services/storage.js';
import { ApiError } from '../utils/ApiError.js';

const router = Router();

function streamNidImage(res, next, key) {
  if (!key) throw ApiError.notFound('Image not found.');
  const filePath = nidImagePath(key);
  if (!fs.existsSync(filePath)) throw ApiError.notFound('Image file missing.');
  res.setHeader('Cache-Control', 'private, no-store');
  return res.sendFile(path.resolve(filePath));
}

/**
 * GET /api/files/nid/:workerId/:side?exp=&sig=
 * Streams a PRIVATE worker NID image. Authorised only by a short-lived signed
 * token issued to an admin (see GET /api/admin/workers/:id/nid).
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

    return streamNidImage(res, next, side === 'front' ? worker.nid?.frontImagePath : worker.nid?.backImagePath);
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/files/user-nid/:userId/:side?exp=&sig=
 * Streams a PRIVATE user (account) NID image via an admin signed token.
 * Note: the token's owner id is prefixed as "user:<id>" (see getUserNid).
 */
router.get('/user-nid/:userId/:side', async (req, res, next) => {
  try {
    const { userId, side } = req.params;
    const { exp, sig } = req.query;

    if (!['front', 'back'].includes(side)) throw ApiError.notFound('Image not found.');
    if (!mongoose.isValidObjectId(userId)) throw ApiError.notFound('Image not found.');
    if (!verifyNidToken(`user:${userId}`, side, exp, sig)) {
      throw ApiError.forbidden('This link is invalid or has expired.');
    }

    const user = await User.findById(userId).select('+nid');
    if (!user) throw ApiError.notFound('Image not found.');

    return streamNidImage(res, next, side === 'front' ? user.nid?.frontImagePath : user.nid?.backImagePath);
  } catch (err) {
    return next(err);
  }
});

export default router;
