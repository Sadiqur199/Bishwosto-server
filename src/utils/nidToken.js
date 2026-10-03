import crypto from 'node:crypto';
import { env } from '../config/env.js';

const DEFAULT_TTL_SECONDS = 300; // 5 minutes

/** Create a short-lived signed token that authorises viewing one NID image. */
export function signNidToken(workerId, side, ttlSeconds = DEFAULT_TTL_SECONDS) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${workerId}.${side}.${exp}`;
  const sig = crypto.createHmac('sha256', env.jwtSecret).update(payload).digest('hex');
  return { exp, sig, ttl: ttlSeconds };
}

/** Verify a signed NID token (constant-time compare + expiry check). */
export function verifyNidToken(workerId, side, exp, sig) {
  if (!exp || !sig) return false;
  if (Number(exp) < Math.floor(Date.now() / 1000)) return false;

  const expected = crypto
    .createHmac('sha256', env.jwtSecret)
    .update(`${workerId}.${side}.${Number(exp)}`)
    .digest('hex');

  const a = Buffer.from(String(sig));
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
