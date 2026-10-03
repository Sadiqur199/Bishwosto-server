import mongoose from 'mongoose';
import Payment from '../models/Payment.js';
import Unlock from '../models/Unlock.js';
import Worker from '../models/Worker.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/response.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { publicWorker } from '../utils/serializers.js';
import {
  getPricing,
  unlockWorker,
  isPlanActive,
} from '../services/unlock.js';
import {
  createGatewaySession,
  validateTransaction,
  makeTransactionId,
  isPaymentConfigured,
} from '../services/payment.js';

/* ---------------------------- Public pricing ---------------------------- */

/** GET /api/payments/pricing - public prices for the pricing page. */
export async function getPublicPricing(_req, res, next) {
  try {
    const pricing = await getPricing();
    return sendSuccess(res, {
      message: 'Pricing',
      data: {
        unlockPrice: pricing.unlockPrice,
        creditPacks: pricing.creditPacks,
        plans: pricing.plans,
        gatewayConfigured: isPaymentConfigured(),
        sandbox: env.payment.sandbox,
      },
    });
  } catch (err) {
    return next(err);
  }
}

/* ------------------------- Unlock with credits/plan --------------------- */

/**
 * POST /api/payments/unlock/:workerId
 * Unlock using credits, an active plan, or a direct payment.
 * - If the user has an active plan -> free unlock.
 * - Else if they have credits -> deduct credits atomically.
 * - Else -> instruct the client to start a payment (per-unlock).
 */
export async function unlockWithCredits(req, res, next) {
  try {
    const { workerId } = req.params;
    if (!mongoose.isValidObjectId(workerId)) throw ApiError.notFound('Worker not found.');

    const worker = await Worker.findOne({ _id: workerId, status: 'approved' });
    if (!worker) throw ApiError.notFound('Worker not found.');

    const user = req.user;

    // 1) Active monthly plan -> unlock for free.
    if (isPlanActive(user)) {
      const { unlock } = await unlockWorker({ userId: user._id, workerId, method: 'plan' });
      return sendSuccess(res, { message: 'Unlocked with your plan.', data: { unlock, method: 'plan' } });
    }

    // 2) Credits.
    if ((user.credits || 0) >= 1) {
      const { unlock, alreadyUnlocked } = await unlockWorker({
        userId: user._id,
        workerId,
        method: 'credit',
        credits: 1,
      });
      return sendSuccess(res, {
        message: alreadyUnlocked ? 'Already unlocked.' : 'Unlocked with 1 credit.',
        data: { unlock, alreadyUnlocked, method: 'credit' },
      });
    }

    // 3) No credits / plan -> client must pay.
    const pricing = await getPricing();
    return sendSuccess(res, {
      message: 'No credits or plan. Please pay to unlock.',
      data: { needsPayment: true, unlockPrice: pricing.unlockPrice },
    });
  } catch (err) {
    return next(err);
  }
}

/* ----------------------------- Payment init ----------------------------- */

/**
 * POST /api/payments/init
 * Body: { purpose: 'unlock'|'credit_pack'|'plan', workerId?, packId?, planId? }
 * Creates a pending Payment and returns the gateway redirect URL.
 */
export async function initPayment(req, res, next) {
  try {
    const { purpose, workerId, packId, planId } = req.body;
    const user = req.user;
    const pricing = await getPricing();

    let amount = 0;
    let meta = {};

    if (purpose === 'unlock') {
      if (!mongoose.isValidObjectId(workerId)) throw ApiError.badRequest('Worker id is required.');
      const worker = await Worker.findOne({ _id: workerId, status: 'approved' });
      if (!worker) throw ApiError.notFound('Worker not found.');
      const already = await Unlock.exists({ user: user._id, worker: workerId });
      if (already) throw ApiError.conflict('You have already unlocked this worker.');
      amount = pricing.unlockPrice;
      meta = { workerId };
    } else if (purpose === 'credit_pack') {
      const pack = pricing.creditPacks.find((p) => p.id === packId);
      if (!pack) throw ApiError.badRequest('Invalid credit pack.');
      amount = pack.taka;
      meta = { credits: pack.credits };
    } else if (purpose === 'plan') {
      const plan = pricing.plans.find((p) => p.id === planId);
      if (!plan) throw ApiError.badRequest('Invalid plan.');
      amount = plan.taka;
      meta = { days: plan.days };
    } else {
      throw ApiError.badRequest('Invalid payment purpose.');
    }

    const payment = await Payment.create({
      user: user._id,
      amount,
      purpose,
      packId: packId || planId || '',
      status: 'pending',
      meta,
    });

    const transactionId = makeTransactionId(payment._id);
    payment.transactionId = transactionId;

    const { gatewayUrl } = await createGatewaySession({
      amount,
      transactionId,
      customer: { name: user.name, email: user.email, phone: user.phone },
      productName: `GhorKaj ${purpose}`,
      clientUrl: env.clientUrls[0],
    });

    payment.meta = { ...meta, gatewayUrl };
    await payment.save();

    return sendSuccess(res, {
      status: 201,
      message: 'Payment session created.',
      data: { paymentId: payment._id, transactionId, gatewayUrl, amount },
    });
  } catch (err) {
    return next(err);
  }
}

/* --------------------------- Fulfilment (IPN) --------------------------- */

/**
 * Apply a verified successful payment: add credits / activate plan / unlock.
 * Idempotent - ignores payments already marked success.
 */
async function fulfilPayment(payment) {
  if (payment.status === 'success') return;

  payment.status = 'success';
  await payment.save();

  const userId = payment.user;
  const User = mongoose.model('User');

  if (payment.purpose === 'credit_pack') {
    const credits = Number(payment.meta?.credits || 0);
    await User.updateOne({ _id: userId }, { $inc: { credits } });
  } else if (payment.purpose === 'plan') {
    const days = Number(payment.meta?.days || 30);
    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await User.updateOne({ _id: userId }, { $set: { planExpiresAt: expires } });
  } else if (payment.purpose === 'unlock' && payment.meta?.workerId) {
    await unlockWorker({
      userId,
      workerId: payment.meta.workerId,
      method: 'direct',
      paymentId: payment._id,
    });
  }
}

/**
 * POST /api/payments/ipn
 * Gateway server-to-server webhook. We verify with the validation API
 * (signature + amount + transaction id) before fulfilling.
 */
export async function paymentIpn(req, res) {
  try {
    const payload = { ...req.body, ...req.query };
    const transactionId = payload.tran_id;
    const valId = payload.val_id;

    if (!transactionId) return res.status(400).send('Missing tran_id');

    const payment = await Payment.findOne({ transactionId });
    if (!payment) {
      logger.warn(`IPN for unknown transaction ${transactionId}`);
      return res.status(200).send('OK'); // ack to stop retries
    }

    // Verify with the gateway - never trust the raw IPN body alone.
    const validation = await validateTransaction(valId);

    const validStatus = ['VALID', 'VALIDATED'].includes(validation?.status);
    const amountOk = Number(validation?.amount) >= Number(payment.amount);
    const tranOk = validation?.tran_id === payment.transactionId;
    const currencyOk = (validation?.currency || 'BDT') === 'BDT';

    if (!validStatus || !amountOk || !tranOk || !currencyOk) {
      logger.warn(`IPN validation failed for ${transactionId}`, { validStatus, amountOk, tranOk, currencyOk });
      payment.status = 'failed';
      payment.meta = { ...(payment.meta || {}), validation };
      await payment.save();
      return res.status(200).send('OK');
    }

    // Guard transaction id against reuse by a different payment.
    const reused = await Payment.findOne({
      _id: { $ne: payment._id },
      gatewayRef: validation.bank_tran_id,
      status: 'success',
    });
    if (reused) {
      logger.warn(`Duplicate gateway txn ${validation.bank_tran_id}`);
      return res.status(200).send('OK');
    }

    payment.gatewayRef = validation.bank_tran_id || '';
    await fulfilPayment(payment);

    return res.status(200).send('OK');
  } catch (err) {
    logger.error('IPN error:', err.message);
    return res.status(200).send('OK'); // always ack to avoid infinite retries
  }
}

/**
 * Redirect handlers. These are convenience endpoints for the browser; they do
 * NOT grant access by themselves - only the IPN does. We just tell the client
 * the outcome and let it re-fetch state.
 */
async function redirectOutcome(req, res, status) {
  const transactionId = req.body?.tran_id || req.query?.tran_id;
  if (transactionId) {
    const payment = await Payment.findOne({ transactionId });
    if (payment && status === 'failed' && payment.status === 'pending') {
      payment.status = 'failed';
      await payment.save();
    }
  }
  return res.redirect(`${env.clientUrls[0]}/payment/${status}?tran_id=${transactionId || ''}`);
}

export const paymentSuccess = (req, res, next) => redirectOutcome(req, res, 'success').catch(next);
export const paymentFail = (req, res, next) => redirectOutcome(req, res, 'fail').catch(next);
export const paymentCancel = (req, res, next) => redirectOutcome(req, res, 'cancel').catch(next);

/* ------------------------------ My data -------------------------------- */

/** GET /api/me/unlocked - unlocked workers WITH contact (server-gated). */
export async function getMyUnlocked(req, res, next) {
  try {
    const unlocks = await Unlock.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
    const workerIds = unlocks.map((u) => u.worker);

    const workers = await Worker.find({ _id: { $in: workerIds } }).select('+contact');
    const byId = Object.fromEntries(workers.map((w) => [String(w._id), w]));

    const data = unlocks
      .map((u) => {
        const w = byId[String(u.worker)];
        if (!w) return null;
        return {
          ...publicWorker(w),
          contact: w.contact || null,
          unlockedAt: u.createdAt,
          method: u.method,
        };
      })
      .filter(Boolean);

    return sendSuccess(res, { message: 'Unlocked contacts', data: { workers: data } });
  } catch (err) {
    return next(err);
  }
}

/** GET /api/me/payments - the user's payment history / invoices. */
export async function getMyPayments(req, res, next) {
  try {
    const payments = await Payment.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
    return sendSuccess(res, { message: 'My payments', data: { payments } });
  } catch (err) {
    return next(err);
  }
}
