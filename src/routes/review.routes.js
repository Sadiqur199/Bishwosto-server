import { Router } from 'express';
import { z } from 'zod';
import { updateReview, deleteReview } from '../controllers/review.controller.js';
import { authenticate, loadUser } from '../middleware/auth.js';
import { requireDb } from '../middleware/requireDb.js';
import { validate } from '../middleware/validate.js';

const updateSchema = z
  .object({
    rating: z.number().int().min(1).max(5).optional(),
    comment: z.string().trim().min(3).max(600).optional(),
    tags: z.array(z.string().trim().max(30)).optional(),
    workDuration: z.string().trim().max(80).optional(),
  })
  .strict();

const router = Router();

// Edit / delete your own review.
router.put('/:id', authenticate, requireDb, loadUser, validate(updateSchema), updateReview);
router.delete('/:id', authenticate, requireDb, loadUser, deleteReview);

export default router;
