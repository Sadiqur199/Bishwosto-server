import mongoose from 'mongoose';
import Unlock from '../models/Unlock.js';
import Worker from '../models/Worker.js';
import User from '../models/User.js';
import Pricing from '../models/Pricing.js';
import { ApiError } from '../utils/ApiError.js';

/** Load (or lazily create) the single pricing configuration. */
export async function getPricing() {
  let pricing = await Pricing.findOne({ key: 'default' });
  if (!pricing) pricing = await Pricing.create({ key: 'default' });
  return pricing;
}

export const isPlanActive = (user) => Boolean(user.planExpiresAt && user.planExpiresAt > new Date());

/**
 * Unlock a worker for a user.
 * - Idempotent: an existing unlock is returned as-is.
 * - Atomic: for credit unlocks the credit is deducted with a conditional
 *   `$inc` (fails if not enough), and rolled back if the unlock insert fails
 *   (e.g. a concurrent request already created it).
 *
 * `method` is 'credit' | 'plan' | 'direct' | 'free'.
 */
export async function unlockWorker({ userId, workerId, method = 'credit', credits = 1, paymentId = null }) {
  // 1) Already unlocked? Return it (idempotent, no double charge).
  const existing = await Unlock.findOne({ user: userId, worker: workerId });
  if (existing) return { unlock: existing, alreadyUnlocked: true };

  const worker = await Worker.findById(workerId);
  if (!worker) throw ApiError.notFound('Worker not found.');
  if (worker.status !== 'approved') throw ApiError.badRequest('This worker is not available.');

  let deducted = false;

  // 2) Deduct credits atomically (only if enough balance exists).
  if (method === 'credit' && credits > 0) {
    const res = await User.updateOne(
      { _id: userId, credits: { $gte: credits } },
      { $inc: { credits: -credits } }
    );
    if (res.modifiedCount === 0) {
      throw ApiError.badRequest('Not enough credits. Please buy a credit pack or pay to unlock.');
    }
    deducted = true;
  }

  // 3) Create the unlock record.
  try {
    const unlock = await Unlock.create({
      user: userId,
      worker: workerId,
      method,
      creditsUsed: method === 'credit' ? credits : 0,
      payment: paymentId,
    });

    await Worker.updateOne({ _id: workerId }, { $inc: { unlockCount: 1 } });
    return { unlock, alreadyUnlocked: false };
  } catch (err) {
    // Roll back the credit deduction if we lost a race or the insert failed.
    if (deducted) {
      await User.updateOne({ _id: userId }, { $inc: { credits } });
    }
    if (err?.code === 11000) {
      const unlock = await Unlock.findOne({ user: userId, worker: workerId });
      return { unlock, alreadyUnlocked: true };
    }
    throw err;
  }
}

/** True when the user has unlocked the worker. */
export async function isUnlocked(userId, workerId) {
  if (!mongoose.isValidObjectId(workerId)) return false;
  return Boolean(await Unlock.exists({ user: userId, worker: workerId }));
}
