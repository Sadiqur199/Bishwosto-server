import { Router } from 'express';
import { z } from 'zod';
import {
  createUser,
  listUsers,
  listUserKyc,
  verifyUserNid,
  rejectUserNid,
  getUserNid,
  listWorkers,
  getWorkerDetail,
  verifyWorker,
  rejectWorker,
  suspendWorker,
  getWorkerNid,
  getPricing,
  updatePricing,
  getStats,
  listAuditLogs,
} from '../controllers/admin.controller.js';
import { authenticate, loadUser } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { requireDb } from '../middleware/requireDb.js';
import { validate } from '../middleware/validate.js';

const createUserSchema = z
  .object({
    name: z.string().trim().min(2, 'Name is too short.').max(80),
    phone: z.string().trim().min(6).max(20),
    password: z.string().min(6, 'Password must be at least 6 characters.').max(72),
    role: z.enum(['user', 'worker', 'agent', 'admin']),
    email: z.union([z.string().trim().email('Invalid email.').max(120), z.literal('')]).optional(),
    address: z.string().trim().max(200).optional(),
  })
  .strict();

const pricingSchema = z
  .object({
    unlockPrice: z.number().min(0).optional(),
    creditPacks: z
      .array(z.object({ id: z.string().min(1).max(40), taka: z.number().min(0), credits: z.number().int().min(1) }))
      .optional(),
    plans: z
      .array(z.object({ id: z.string().min(1).max(40), taka: z.number().min(0), days: z.number().int().min(1) }))
      .optional(),
  })
  .strict();

const router = Router();

// Every admin route requires a logged-in user whose role is 'admin'.
router.use(authenticate, requireDb, loadUser, requireRole('admin'));

// Users
router.get('/users', listUsers);
router.post('/users', validate(createUserSchema), createUser);

// User KYC (NID given at registration)
router.get('/users/kyc', listUserKyc);
router.get('/users/:id/nid', getUserNid);
router.patch('/users/:id/verify-nid', verifyUserNid);
router.patch('/users/:id/reject-nid', rejectUserNid);

// Workers: approval workflow
router.get('/workers', listWorkers);
router.get('/workers/:id', getWorkerDetail);
router.patch('/workers/:id/verify', verifyWorker);
router.patch('/workers/:id/reject', rejectWorker);
router.patch('/workers/:id/suspend', suspendWorker);
router.get('/workers/:id/nid', getWorkerNid);

// Pricing
router.get('/pricing', getPricing);
router.put('/pricing', validate(pricingSchema), updatePricing);

// Stats + audit
router.get('/stats', getStats);
router.get('/audit-logs', listAuditLogs);

export default router;
