import http from 'node:http';
import app from './app.js';
import { env, logStartupReport } from './config/env.js';
import { connectDB } from './config/db.js';
import { initFirebase } from './config/firebase.js';
import { ensureSuperAdmin } from './services/superAdmin.js';
import { logger } from './utils/logger.js';

async function bootstrap() {
  logStartupReport(logger);

  // Both are safe to call even when keys are missing (demo mode).
  initFirebase();
  await connectDB();

  // Create the super-admin account from env once the DB is available.
  await ensureSuperAdmin();

  const server = http.createServer(app);

  server.listen(env.port, () => {
    logger.success(`GhorKaj API listening on http://localhost:${env.port}/api`);
    logger.info(`Health check: http://localhost:${env.port}/api/health`);
  });

  const shutdown = (signal) => {
    logger.warn(`${signal} received. Shutting down gracefully...`);
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap();

process.on('unhandledRejection', (reason) => logger.error('Unhandled promise rejection:', reason));
process.on('uncaughtException', (err) => logger.error('Uncaught exception:', err));
