import admin from 'firebase-admin';
import { env, features } from './env.js';
import { logger } from '../utils/logger.js';

let initialized = false;

/**
 * Initialise the Firebase Admin SDK once, using a service account.
 * Get these values from the Firebase console -> Project settings -> Service accounts.
 * If they are missing, auth routes return 503 instead of crashing the server.
 */
export function initFirebase() {
  if (initialized) return true;

  if (!features.firebaseConfigured) {
    logger.warn('Skipping Firebase Admin init (credentials not set). Auth routes disabled.');
    return false;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.firebase.projectId,
        clientEmail: env.firebase.clientEmail,
        privateKey: env.firebase.privateKey,
      }),
    });
    initialized = true;
    logger.success('Firebase Admin initialized');
    return true;
  } catch (err) {
    logger.error(`Firebase Admin init failed: ${err.message}`);
    return false;
  }
}

/** Verify a Firebase ID token. Throws if Firebase is not configured. */
export async function verifyIdToken(idToken) {
  return admin.auth().verifyIdToken(idToken);
}

export const isFirebaseReady = () => initialized;
