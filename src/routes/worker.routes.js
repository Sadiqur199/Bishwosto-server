import { Router } from 'express';
import { z } from 'zod';
import { listWorkers, getWorker, updateAvailability } from '../controllers/worker.controller.js';
import {
  getWorkerReviews,
  getMyReview,
  createReview,
} from '../controllers/review.controller.js';
import { authenticate, loadUser } from '../middleware/auth.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { requireDb } from '../middleware/requireDb.js';
import { validate } from '../middleware/validate.js';
import { strictLimiter } from '../middleware/rateLimit.js';

const availabilitySchema = z.object({ availability: z.enum(['available', 'busy']) }).strict();

const reviewSchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().min(3).max(600),
    tags: z.array(z.string().trim().max(30)).optional(),
    workDuration: z.string().trim().max(80).optional(),
  })
  .strict();

const router = Router();

// Public (contact/nid are never returned here).
router.get('/', strictLimiter, requireDb, listWorkers);
// Optional auth so unlocked users get the contact on the profile.
router.get('/:id', requireDb, optionalAuth, getWorker);

// Reviews (Phase 4): public read, unlocked-user write.
router.get('/:workerId/reviews', requireDb, getWorkerReviews);
router.get('/:workerId/my-review', authenticate, requireDb, loadUser, getMyReview);
router.post('/:workerId/reviews', authenticate, requireDb, loadUser, validate(reviewSchema), createReview);

// Owner / agent / admin only.
router.patch(
  '/:id/availability',
  authenticate,
  requireDb,
  loadUser,
  validate(availabilitySchema),
  updateAvailability
);

export default router;
