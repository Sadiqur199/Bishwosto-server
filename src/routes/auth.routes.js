import { Router } from 'express';
import { z } from 'zod';
import { registerUser, loginUser, syncUser } from '../controllers/auth.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { requireDb } from '../middleware/requireDb.js';
import { validate } from '../middleware/validate.js';
import { uploadWorkerFiles } from '../middleware/upload.js';
import { strictLimiter } from '../middleware/rateLimit.js';

const loginSchema = z
  .object({
    phone: z.string().trim().min(6).max(20),
    password: z.string().min(1).max(72),
  })
  .strict();

const syncSchema = z
  .object({
    name: z.string().trim().max(80).optional(),
    area: z.string().trim().max(120).optional(),
  })
  .strict();

const router = Router();

// Registration: multipart (photo + NID). Validated in the controller after upload.
router.post('/register', strictLimiter, optionalAuth, requireDb, uploadWorkerFiles, registerUser);

// Login: phone + password -> Firebase custom token, or a local session token.
router.post('/login', strictLimiter, requireDb, validate(loginSchema), loginUser);

// Return / lightly update the local account for an authenticated session.
router.post('/sync', strictLimiter, authenticate, requireDb, validate(syncSchema), syncUser);

export default router;
