import { Router } from 'express';
import { z } from 'zod';
import { listWorkers, getWorker, updateAvailability } from '../controllers/worker.controller.js';
import { authenticate, loadUser } from '../middleware/auth.js';
import { requireDb } from '../middleware/requireDb.js';
import { validate } from '../middleware/validate.js';
import { strictLimiter } from '../middleware/rateLimit.js';

const availabilitySchema = z.object({ availability: z.enum(['available', 'busy']) }).strict();

const router = Router();

// Public (contact/nid are never returned here).
router.get('/', strictLimiter, requireDb, listWorkers);
router.get('/:id', requireDb, getWorker);

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
