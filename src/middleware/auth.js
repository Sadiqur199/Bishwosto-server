import { verifyIdToken, isFirebaseReady } from '../config/firebase.js';
import { verifySession } from '../utils/session.js';
import { ApiError } from '../utils/ApiError.js';
import User from '../models/User.js';

/**
 * Verify the bearer token and attach `req.auth`.
 * Accepts EITHER our own local session token (signed JWT) OR a Firebase ID token.
 * This lets password login work even while Firebase Admin / OTP is not set up.
 */
export async function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(ApiError.unauthorized('Missing or malformed Authorization header.'));
  }

  // 1) Our own local session token first (cheap, no network).
  try {
    const payload = verifySession(token);
    req.auth = { provider: 'local', userId: payload.sub, uid: payload.uid, role: payload.role };
    return next();
  } catch {
    // Not a local token - try Firebase below.
  }

  // 2) Firebase ID token.
  try {
    if (!isFirebaseReady()) {
      throw ApiError.unauthorized('Invalid session. Please login again.');
    }
    const decoded = await verifyIdToken(token);
    req.auth = {
      provider: 'firebase',
      uid: decoded.uid,
      phone: decoded.phone_number || null,
      email: decoded.email || null,
      name: decoded.name || null,
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

/** Like `authenticate`, but allows anonymous requests (used by direct registration). */
export async function optionalAuth(req, res, next) {
  if (!req.headers.authorization) return next();
  return authenticate(req, res, next);
}

/** Load the matching local user for the authenticated session. */
export async function loadUser(req, _res, next) {
  try {
    if (!req.auth) return next(ApiError.unauthorized());

    const user =
      req.auth.provider === 'local'
        ? await User.findById(req.auth.userId)
        : await User.findOne({ firebaseUid: req.auth.uid });

    if (!user) {
      return next(ApiError.unauthorized('No account found for this session. Please register.'));
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
