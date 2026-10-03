import { Router } from 'express';
import { getMe } from '../controllers/me.controller.js';
import { getMyUnlocked, getMyPayments } from '../controllers/payment.controller.js';
import { authenticate, loadUser } from '../middleware/auth.js';
import { requireDb } from '../middleware/requireDb.js';

const router = Router();

// Every /me route requires a logged-in user.
router.use(authenticate, requireDb, loadUser);

// GET /api/me -> authenticated user's own profile
router.get('/', getMe);

// Phase 5: unlocked contacts (with contact) + payment history.
router.get('/unlocked', getMyUnlocked);
router.get('/payments', getMyPayments);

export default router;
