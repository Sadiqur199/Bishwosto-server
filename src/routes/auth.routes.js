import { Router } from 'express';
import { z } from 'zod';
import { registerUser, loginUser, syncUser } from '../controllers/auth.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { requireDb } from '../middleware/requireDb.js';
import { validate } from '../middleware/validate.js';
import { strictLimiter } from '../middleware/rateLimit.js';

const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Name is too short.').max(80),
    phone: z.string().trim().optional(),
    email: z
      .union([z.string().trim().email('Invalid email.').max(120), z.literal('')])
      .optional(),
    address: z.string().trim().min(3, 'Address is too short.').max(200),
    password: z.string().min(6, 'Password must be at least 6 characters.').max(72),
    role: z.enum(['user', 'worker']),
  })
  .strict();

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

// Registration: with a verified Firebase phone session OR directly (OTP disabled).
router.post('/register', strictLimiter, optionalAuth, requireDb, validate(registerSchema), registerUser);

// Login: phone + password -> Firebase custom token, or a local session token.
router.post('/login', strictLimiter, requireDb, validate(loginSchema), loginUser);

// Return / lightly update the local account for an authenticated session.
router.post('/sync', strictLimiter, authenticate, requireDb, validate(syncSchema), syncUser);

export default router;
