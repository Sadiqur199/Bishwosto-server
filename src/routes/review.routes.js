import { Router } from 'express';
import { getWorkerReviews, createReview } from '../controllers/review.controller.js';
import { authenticate, loadUser } from '../middleware/auth.js';
import { requireDb } from '../middleware/requireDb.js';

const router = Router();

router.get('/:workerId', requireDb, getWorkerReviews);
router.post('/', requireDb, authenticate, loadUser, createReview);

export default router;
