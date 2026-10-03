import { authenticate, loadUser } from './auth.js';

/**
 * Runs auth if Authorization header is provided, otherwise silently continues.
 */
export async function optionalAuth(req, res, next) {
  if (req.headers.authorization) {
    return authenticate(req, res, (err) => {
      if (err) return next(); // Continue as guest if token invalid
      return loadUser(req, res, () => next());
    });
  }
  return next();
}
