import { ApiError } from '../utils/ApiError.js';

/**
 * Validate `req[source]` against a zod schema.
 * Usage: router.post('/', validate(schema), controller)
 */
export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join('.') || source,
        message: issue.message,
      }));
      return next(ApiError.badRequest('Validation failed.', details));
    }
    // Replace with parsed/coerced values.
    req[source] = result.data;
    return next();
  };
}
