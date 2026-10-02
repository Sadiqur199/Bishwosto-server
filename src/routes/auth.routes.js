import { Router } from 'express';
import { z } from 'zod';
import { syncUser } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireDb } from '../middleware/requireDb.js';
import { validate } from '../middleware/validate.js';
import { strictLimiter } from '../middleware/rateLimit.js';

const syncSchema = z
  .object({
    name: z.string().trim().max(80).optional(),
    area: z.string().trim().max(120).optional(),
    referredBy: z.string().trim().max(40).optional(),
  })
  .strict();

const router = Router();

// Firebase token -> create/fetch local user. Strictly rate limited.
router.post('/sync', strictLimiter, authenticate, requireDb, validate(syncSchema), syncUser);

export default router;
