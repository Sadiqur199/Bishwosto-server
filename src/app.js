import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env.js';
import { ApiError } from './utils/ApiError.js';
import { generalLimiter } from './middleware/rateLimit.js';
import { notFound, errorHandler } from './middleware/error.js';
import routes from './routes/index.js';

const app = express();

// Behind a proxy (Render/Railway) so rate limiting sees the real client IP.
if (env.isProd) app.set('trust proxy', 1);

// Security headers. crossOriginResourcePolicy is relaxed so profile photos load in the client.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS whitelist - only origins listed in CLIENT_URL (comma separated) are allowed.
app.use(
  cors({
    origin(origin, callback) {
      // Allow same-origin / tools (no origin header) and any whitelisted origin.
      if (!origin || env.clientUrls.includes(origin)) return callback(null, true);
      return callback(ApiError.forbidden(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

if (!env.isProd) app.use(morgan('dev'));

// All API routes live under /api and share the general rate limiter.
app.use('/api', generalLimiter, routes);

app.use(notFound);
app.use(errorHandler);

export default app;
