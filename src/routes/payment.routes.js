import { Router } from 'express';
import { z } from 'zod';
import {
  getPublicPricing,
  unlockWithCredits,
  initPayment,
  paymentIpn,
  paymentSuccess,
  paymentFail,
  paymentCancel,
} from '../controllers/payment.controller.js';
import { authenticate, loadUser } from '../middleware/auth.js';
import { requireDb } from '../middleware/requireDb.js';
import { validate } from '../middleware/validate.js';
import { strictLimiter } from '../middleware/rateLimit.js';

const initSchema = z
  .object({
    purpose: z.enum(['unlock', 'credit_pack', 'plan']),
    workerId: z.string().trim().max(40).optional(),
    packId: z.string().trim().max(40).optional(),
    planId: z.string().trim().max(40).optional(),
  })
  .strict();

const router = Router();

// Public pricing (for the pricing page).
router.get('/pricing', requireDb, getPublicPricing);

// Unlock using credits/plan (no gateway).
router.post('/unlock/:workerId', strictLimiter, authenticate, requireDb, loadUser, unlockWithCredits);

// Start a payment session.
router.post('/init', strictLimiter, authenticate, requireDb, loadUser, validate(initSchema), initPayment);

// Gateway server-to-server webhook (no auth - verified by signature).
router.post('/ipn', paymentIpn);

// Browser redirect handlers.
router.get('/success', paymentSuccess);
router.get('/fail', paymentFail);
router.get('/cancel', paymentCancel);

export default router;
