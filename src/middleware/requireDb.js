import { isDbConnected } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';

/** Blocks a route with 503 when MongoDB is not connected yet. */
export function requireDb(_req, _res, next) {
  if (!isDbConnected()) {
    return next(
      ApiError.serviceUnavailable(
        'Database is not connected. Set a valid MONGO_URI in server/.env and restart.'
      )
    );
  }
  next();
}
