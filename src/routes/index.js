import { Router } from 'express';
import authRoutes from './auth.routes.js';
import meRoutes from './me.routes.js';
import adminRoutes from './admin.routes.js';
import workerRoutes from './worker.routes.js';
import agentRoutes from './agent.routes.js';
import workerSelfRoutes from './workerSelf.routes.js';
import filesRoutes from './files.routes.js';
import reviewRoutes from './review.routes.js';
import requestRoutes from './request.routes.js';
import reportRoutes from './report.routes.js';
import categoryRoutes from './category.routes.js';
import paymentRoutes from './payment.routes.js';
import favoriteRoutes from './favorite.routes.js';
import { isDbConnected } from '../config/db.js';
import { isFirebaseReady } from '../config/firebase.js';

const router = Router();

// Friendly index for `GET /api` (avoids a confusing 404).
router.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'GhorKaj API.',
    data: {
      endpoints: [
        '/api/health',
        '/api/auth/register',
        '/api/auth/login',
        '/api/me',
        '/api/workers',
        '/api/categories',
        '/api/requests',
        '/api/reports',
      ],
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
router.use('/reviews', reviewRoutes);
router.use('/worker', workerSelfRoutes);
router.use('/agent', agentRoutes);
router.use('/admin', adminRoutes);
router.use('/files', filesRoutes);
router.use('/requests', requestRoutes);
router.use('/reports', reportRoutes);
router.use('/categories', categoryRoutes);
router.use('/payments', paymentRoutes);
router.use('/favorites', favoriteRoutes);

export default router;
