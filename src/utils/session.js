import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const EXPIRES_IN = '30d';

/**
 * Local session token (used when Firebase Admin is unavailable, e.g. while
 * phone OTP is disabled). Mirrors the data we need to load the user.
 */
export function signSession(user) {
  return jwt.sign(
    { sub: String(user._id), uid: user.firebaseUid, role: user.role },
    env.jwtSecret,
    { expiresIn: EXPIRES_IN }
  );
}

/** Verify a local session token. Throws when invalid/expired. */
export function verifySession(token) {
  return jwt.verify(token, env.jwtSecret);
}
