/**
 * Every API response uses one consistent JSON shape:
 *   success: { success: true,  message, data }
 *   error:   { success: false, message, error: { code, details? } }
 */

export function sendSuccess(res, { status = 200, message = 'OK', data = null, meta = undefined }) {
  const body = { success: true, message, data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

export function sendError(res, { status = 500, message = 'Something went wrong', code, details }) {
  const body = { success: false, message, error: { code: code || 'ERROR' } };
  if (details !== undefined) body.error.details = details;
  return res.status(status).json(body);
}
