import { Router } from 'express';
import authRoutes from './auth.routes.js';
import meRoutes from './me.routes.js';
import adminRoutes from './admin.routes.js';
import workerRoutes from './worker.routes.js';
import agentRoutes from './agent.routes.js';
import workerSelfRoutes from './workerSelf.routes.js';
import filesRoutes from './files.routes.js';
import { isDbConnected } from '../config/db.js';
import { isFirebaseReady } from '../config/firebase.js';

const router = Router();

// Friendly index for `GET /api` (avoids a confusing 404).
router.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'GhorKaj API.',
    data: {
      endpoints: ['/api/health', '/api/auth/register', '/api/auth/login', '/api/me'],
    },
  });
});

// Liveness / configuration probe.
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'GhorKaj API is healthy.',
    data: {
      uptime: Math.round(process.uptime()),
      database: isDbConnected() ? 'connected' : 'disconnected',
      firebase: isFirebaseReady() ? 'ready' : 'not-configured',
      timestamp: new Date().toISOString(),
    },
  });
});

router.use('/auth', authRoutes);
router.use('/me', meRoutes);
router.use('/workers', workerRoutes);
router.use('/worker', workerSelfRoutes);
router.use('/agent', agentRoutes);
router.use('/admin', adminRoutes);
router.use('/files', filesRoutes);

export default router;
