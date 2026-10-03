import fs from 'node:fs';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

dotenv.config();

/** A value is considered "not configured" when empty or still a <placeholder>. */
const isMissing = (value) => !value || value.trim() === '' || /<[^>]+>/.test(value);

const rawFirebaseKey = process.env.FIREBASE_PRIVATE_KEY || '';

// Optional: path to the downloaded service-account JSON (easiest setup method).
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || '';
const serviceAccountFileExists = Boolean(serviceAccountPath) && fs.existsSync(serviceAccountPath);

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  isProd: (process.env.NODE_ENV || 'development') === 'production',

  // CORS whitelist can hold several comma separated origins.
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean),

  mongoUri: process.env.MONGO_URI || '',

  // Optional DNS override. Some ISPs/routers refuse SRV lookups needed by
  // mongodb+srv:// URIs; set e.g. DNS_SERVERS=8.8.8.8,1.1.1.1 to fix that.
  dnsServers: (process.env.DNS_SERVERS || '')
    .split(',')
    .map((server) => server.trim())
    .filter(Boolean),

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    // Service account JSON stores newlines as "\n" - convert back to real newlines.
    privateKey: rawFirebaseKey.replace(/\\n/g, '\n'),
    // Alternative: path to the downloaded service-account .json file.
    serviceAccountPath: serviceAccountFileExists ? serviceAccountPath : '',
  },

  // Secret for local (non-Firebase) sessions. Change this in production!
  jwtSecret: process.env.JWT_SECRET || 'ghorkaj-dev-secret-change-me',

  // Bootstrap account. On startup (when the DB is connected) if this phone has
  // no account it is created with the 'admin' role. Admins never self-register.
  superAdmin: {
    phone: process.env.SUPER_ADMIN_PHONE || '',
    password: process.env.SUPER_ADMIN_PASSWORD || '',
  },

  nidEncryptionKey: process.env.NID_ENCRYPTION_KEY || '',

  cloudinaryUrl: process.env.CLOUDINARY_URL || '',

  payment: {
    storeId: process.env.PAYMENT_STORE_ID || '',
    storePassword: process.env.PAYMENT_STORE_PASSWORD || '',
    sandbox: (process.env.PAYMENT_SANDBOX || 'true') === 'true',
  },
};

/**
 * Feature flags so the API can start cleanly even before every key is set.
 * Endpoints that need a missing service respond with a clear 503 instead of crashing.
 */
export const features = {
  mongoConfigured: !isMissing(process.env.MONGO_URI),
  firebaseConfigured:
    serviceAccountFileExists ||
    (!isMissing(process.env.FIREBASE_PROJECT_ID) &&
      !isMissing(process.env.FIREBASE_CLIENT_EMAIL) &&
      !isMissing(rawFirebaseKey)),
  nidEncryptionConfigured:
    !isMissing(process.env.NID_ENCRYPTION_KEY) && process.env.NID_ENCRYPTION_KEY.length === 64,
};

/**
 * In production, refuse to start if required secrets are missing - fail fast
 * rather than silently running a degraded/demo server.
 */
export function assertProductionEnv() {
  if (!env.isProd) return;
  const problems = [];
  if (!features.mongoConfigured) problems.push('MONGO_URI');
  if (!features.nidEncryptionConfigured) problems.push('NID_ENCRYPTION_KEY');
  if (!env.jwtSecret || env.jwtSecret === 'ghorkaj-dev-secret-change-me') {
    problems.push('JWT_SECRET (must not be the default)');
  }
  if (!env.clientUrls.length) problems.push('CLIENT_URL');

  if (problems.length) {
    const message = `Missing/invalid production env vars: ${problems.join(', ')}`;
    logger.error(message);
    throw new Error(message);
  }
}

/** Print a friendly startup report about what is / is not configured yet. */
export function logStartupReport(logger) {
  logger.info('Environment:', env.nodeEnv);
  logger.info(`CORS whitelist: ${env.clientUrls.join(', ')}`);
  if (!features.mongoConfigured) {
    logger.warn('MONGO_URI is not set -> database features are disabled (demo mode).');
  }
  if (!features.firebaseConfigured) {
    logger.warn('Firebase Admin is not configured -> auth endpoints will return 503.');
  }
  if (!features.nidEncryptionConfigured) {
    logger.warn('NID_ENCRYPTION_KEY is missing/short -> NID encryption disabled until set.');
  }
}
