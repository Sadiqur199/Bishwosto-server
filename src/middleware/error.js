import { ApiError } from '../utils/ApiError.js';
import { sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

/** 404 handler for unmatched routes. */
export function notFound(req, _res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found.`));
}

/** Central error handler. Always returns the consistent error JSON shape. */
export function errorHandler(err, _req, res, _next) {
  let error = err;

  // Map upload errors to clean 400s.
  if (error?.name === 'MulterError') {
    error = ApiError.badRequest(
      error.code === 'LIMIT_FILE_SIZE' ? 'Image is too large (maximum 5MB).' : `Upload error: ${error.message}`
    );
  } else if (typeof error?.message === 'string' && error.message.includes('images are allowed')) {
    error = ApiError.badRequest(error.message);

    // Map common Mongoose errors to clean ApiErrors.
  } else if (error?.name === 'CastError') {
    error = ApiError.badRequest(`Invalid value for "${error.path}".`);
  } else if (error?.code === 11000) {
    const field = Object.keys(error.keyValue || {})[0] || 'field';
    error = ApiError.conflict(`Duplicate value for ${field}.`);
  } else if (error?.name === 'ValidationError') {
    const details = Object.values(error.errors || {}).map((e) => ({
      path: e.path,
      message: e.message,
    }));
    error = ApiError.badRequest('Validation failed.', details);
  }

  const status = error instanceof ApiError ? error.statusCode : 500;
  const message =
    error instanceof ApiError ? error.message : 'Internal server error. Please try again later.';

  if (status >= 500) {
    logger.error(err?.stack || err?.message || err);
  }

  return sendError(res, {
    status,
    message,
    code: error.code,
    details: error.details,
  });
}
