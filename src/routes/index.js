import { Router } from 'express';
import authRoutes from './auth.routes.js';
import meRoutes from './me.routes.js';
import { isDbConnected } from '../config/db.js';
import { isFirebaseReady } from '../config/firebase.js';

const router = Router();

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

export default router;
