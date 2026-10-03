import { Router } from 'express';
import { z } from 'zod';
import {
  getMyProfile,
  createMyProfile,
  updateMyProfile,
  setMyAvailability,
} from '../controllers/workerSelf.controller.js';
import { authenticate, loadUser } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { requireDb } from '../middleware/requireDb.js';
import { validate } from '../middleware/validate.js';
import { uploadWorkerFiles } from '../middleware/upload.js';

const availabilitySchema = z.object({ availability: z.enum(['available', 'busy']) }).strict();

const router = Router();

// Logged-in workers (and admins acting as workers) only.
router.use(authenticate, requireDb, loadUser, requireRole('worker', 'admin'));

router.get('/me', getMyProfile);
router.post('/me', uploadWorkerFiles, createMyProfile);
router.put('/me', uploadWorkerFiles, updateMyProfile);
router.patch('/me/availability', validate(availabilitySchema), setMyAvailability);

export default router;
