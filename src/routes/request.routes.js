import { Router } from 'express';
import { createWorkerRequest, getMyRequests } from '../controllers/request.controller.js';
import { authenticate, loadUser } from '../middleware/auth.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { requireDb } from '../middleware/requireDb.js';

const router = Router();

router.post('/', requireDb, optionalAuth, createWorkerRequest);
router.get('/me', requireDb, authenticate, loadUser, getMyRequests);

export default router;
