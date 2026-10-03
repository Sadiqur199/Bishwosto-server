import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env.js';
import { ApiError } from './utils/ApiError.js';
import { generalLimiter } from './middleware/rateLimit.js';
import { notFound, errorHandler } from './middleware/error.js';
import routes from './routes/index.js';
import { PHOTO_DIR } from './services/storage.js';

const app = express();

// Behind a proxy (Render/Railway) so rate limiting sees the real client IP.
if (env.isProd) app.set('trust proxy', 1);

// Disable the X-Powered-By header (minor fingerprinting hardening).
app.disable('x-powered-by');

// Security headers. crossOriginResourcePolicy is relaxed so profile photos load in the client.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    // HSTS only matters over HTTPS (production).
    hsts: env.isProd ? { maxAge: 15552000, includeSubDomains: true } : false,
  })
);

// Decide whether a browser origin may call the API.
// Allowed: no-origin (server-to-server / tools), any origin listed in
// CLIENT_URL, any localhost/127.0.0.1 (so local dev works against the deployed
// API), and any *.vercel.app preview/production domain (so Vercel works too).
function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (env.clientUrls.includes(origin)) return true;
  try {
    const { hostname, protocol } = new URL(origin);
    if (['localhost', '127.0.0.1', '0.0.0.0'].includes(hostname)) return true;
    if (hostname.endsWith('.vercel.app')) return true;
    // In development, allow any http origin (e.g. LAN IP on a phone).
    if (!env.isProd && protocol.startsWith('http')) return true;
  } catch {
    return false;
  }
  return false;
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(ApiError.forbidden(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

// Body size limits keep large/abusive payloads out.
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

if (!env.isProd) app.use(morgan('dev'));

// Public profile photos only. NID images live in a separate private folder that
// is NEVER served statically (admin signed URL only).
app.use('/uploads/photos', express.static(PHOTO_DIR, { maxAge: '7d' }));

// Friendly root so opening http://localhost:5000/ is not a confusing 404.
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'GhorKaj API is running.',
    data: { api: '/api', health: '/api/health' },
  });
});

// All API routes live under /api and share the general rate limiter.
app.use('/api', generalLimiter, routes);

app.use(notFound);
app.use(errorHandler);

export default app;
