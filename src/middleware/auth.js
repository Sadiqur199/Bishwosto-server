import { verifyIdToken, isFirebaseReady } from '../config/firebase.js';
import { ApiError } from '../utils/ApiError.js';
import User from '../models/User.js';

/**
 * Verify the Firebase ID token from the `Authorization: Bearer <token>` header
 * and attach the decoded token to `req.firebase`.
 */
export async function authenticate(req, _res, next) {
  try {
    if (!isFirebaseReady()) {
      throw ApiError.serviceUnavailable(
        'Authentication is not configured. Add Firebase Admin keys in server/.env.'
      );
    }

    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw ApiError.unauthorized('Missing or malformed Authorization header.');
    }

    const decoded = await verifyIdToken(token);
    req.firebase = {
      uid: decoded.uid,
      phone: decoded.phone_number || null,
      email: decoded.email || null,
      name: decoded.name || null,
      picture: decoded.picture || null,
    };
    return next();
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    if (err.code === 'auth/id-token-expired') {
      return next(ApiError.unauthorized('Session expired. Please login again.'));
    }
    if (typeof err.code === 'string' && err.code.startsWith('auth/')) {
      return next(ApiError.unauthorized('Invalid authentication token.'));
    }
    return next(err);
  }
}

/**
 * Load the matching local Mongo user for the authenticated Firebase account.
 * Must run AFTER `authenticate`.
 */
export async function loadUser(req, _res, next) {
  try {
    if (!req.firebase) return next(ApiError.unauthorized());

    const user = await User.findOne({ firebaseUid: req.firebase.uid });
    if (!user) {
      return next(ApiError.unauthorized('Account not synced yet. Call POST /api/auth/sync.'));
    }
    if (user.isBlocked) {
      return next(ApiError.forbidden('Your account has been blocked.'));
    }

    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
}
