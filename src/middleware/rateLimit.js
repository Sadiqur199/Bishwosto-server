import rateLimit from 'express-rate-limit';

const errorBody = (message) => ({
  success: false,
  message,
  error: { code: 'TOO_MANY_REQUESTS' },
});

/** General limiter for the whole API. */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json(errorBody('Too many requests. Please slow down.')),
});

/**
 * Stricter limiter for sensitive / scrape-prone endpoints
 * (worker lists, auth sync, and later unlock + payment init).
 */
export const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) =>
    res.status(429).json(errorBody('Too many attempts. Please try again in a minute.')),
});
