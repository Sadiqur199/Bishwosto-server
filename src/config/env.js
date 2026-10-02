import dotenv from 'dotenv';

dotenv.config();

/** A value is considered "not configured" when empty or still a <placeholder>. */
const isMissing = (value) => !value || value.trim() === '' || /<[^>]+>/.test(value);

const rawFirebaseKey = process.env.FIREBASE_PRIVATE_KEY || '';

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

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    // Service account JSON stores newlines as "\n" - convert back to real newlines.
    privateKey: rawFirebaseKey.replace(/\\n/g, '\n'),
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
    !isMissing(process.env.FIREBASE_PROJECT_ID) &&
    !isMissing(process.env.FIREBASE_CLIENT_EMAIL) &&
    !isMissing(rawFirebaseKey),
  nidEncryptionConfigured:
    !isMissing(process.env.NID_ENCRYPTION_KEY) && process.env.NID_ENCRYPTION_KEY.length === 64,
};

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
