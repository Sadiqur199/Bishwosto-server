import { Router } from 'express';
import { getMe } from '../controllers/me.controller.js';
import { authenticate, loadUser } from '../middleware/auth.js';
import { requireDb } from '../middleware/requireDb.js';

const router = Router();

// GET /api/me  -> authenticated user's own profile
router.get('/', authenticate, requireDb, loadUser, getMe);

export default router;
