import { Router } from 'express';
import { z } from 'zod';
import { createReport, getMyReports } from '../controllers/report.controller.js';
import { authenticate, loadUser } from '../middleware/auth.js';
import { requireDb } from '../middleware/requireDb.js';
import { validate } from '../middleware/validate.js';

const reportSchema = z
  .object({
    targetType: z.enum(['worker', 'review', 'wrong_number']),
    targetId: z.string().trim().max(40).optional(),
    reason: z.string().trim().min(5).max(500),
  })
  .strict();

const router = Router();

router.use(authenticate, requireDb, loadUser);
router.post('/', validate(reportSchema), createReport);
router.get('/me', getMyReports);

export default router;
