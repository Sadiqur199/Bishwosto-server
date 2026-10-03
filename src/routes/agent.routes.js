import { Router } from 'express';
import { createMyWorker, updateMyWorker, listMyWorkers } from '../controllers/agent.controller.js';
import { authenticate, loadUser } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { requireDb } from '../middleware/requireDb.js';
import { uploadWorkerFiles } from '../middleware/upload.js';

const router = Router();

// Agents and admins only.
router.use(authenticate, requireDb, loadUser, requireRole('agent', 'admin'));

router.get('/workers', listMyWorkers);
router.post('/workers', uploadWorkerFiles, createMyWorker);
router.put('/workers/:id', uploadWorkerFiles, updateMyWorker);

export default router;
