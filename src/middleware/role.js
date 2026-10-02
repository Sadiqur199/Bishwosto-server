import { ApiError } from '../utils/ApiError.js';

/**
 * Route guard: only allow the listed roles (e.g. requireRole('admin')).
 * Requires `req.user` set by the `loadUser` middleware.
 */
export function requireRole(...roles) {
  const allowed = roles.flat();
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!allowed.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to perform this action.'));
    }
    return next();
  };
}
