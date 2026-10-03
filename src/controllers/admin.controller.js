import mongoose from 'mongoose';
import User, { USER_ROLES } from '../models/User.js';
import Worker from '../models/Worker.js';
import Pricing from '../models/Pricing.js';
import AuditLog from '../models/AuditLog.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/response.js';
import { publicUser, staffUser, staffWorker } from '../utils/serializers.js';
import { nidImagePath } from '../services/storage.js';
import { signNidToken } from '../utils/nidToken.js';
import fs from 'node:fs';
import { normalizeBdPhone } from '../utils/phone.js';
import { computeTrustScore } from '../services/workerService.js';

/* ----------------------------- Users ----------------------------- */

/** POST /api/admin/users - create a staff account (admin/agent/etc). */
export async function createUser(req, res, next) {
  try {
    const { name, phone: rawPhone, password, role, email, address } = req.body;

    const phone = normalizeBdPhone(rawPhone);
    if (!phone) return next(ApiError.badRequest('Invalid Bangladeshi phone number.'));
    if (!USER_ROLES.includes(role)) return next(ApiError.badRequest('Invalid role.'));

    const existing = await User.findOne({ phone });
    if (existing) return next(ApiError.conflict('This phone number is already registered.'));

    const user = new User({
      firebaseUid: `staff-${phone.replace('+', '')}`,
      phone,
      name: name.trim(),
      email: email || '',
      address: address || '',
      role,
      referralCode: User.generateReferralCode(),
    });
    await user.setPassword(password);
    await user.save();

    return sendSuccess(res, {
      status: 201,
      message: 'Account created.',
      data: { user: publicUser(user) },
    });
  } catch (err) {
    if (err?.code === 11000) return next(ApiError.conflict('This phone number is already registered.'));
    return next(err);
  }
}

/** GET /api/admin/users?role=&page=&limit= */
export async function listUsers(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const filter = req.query.role ? { role: req.query.role } : {};
    const [items, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      User.countDocuments(filter),
    ]);
    return sendSuccess(res, {
      message: 'Users',
      data: { users: items.map(publicUser) },
      meta: { total, page, limit },
    });
  } catch (err) {
    return next(err);
  }
}

/** GET /api/admin/users/kyc?status=pending - accounts awaiting NID verification. */
export async function listUserKyc(req, res, next) {
  try {
    const status = req.query.status || 'pending';
    const filter = { 'nid.status': status, role: { $ne: 'admin' } };
    const users = await User.find(filter).select('+nid').sort({ createdAt: -1 }).limit(100);
    return sendSuccess(res, { message: 'KYC queue', data: { users: users.map(staffUser) } });
  } catch (err) {
    return next(err);
  }
}

/** PATCH /api/admin/users/:id/verify-nid  (or /reject-nid) */
async function changeNidStatus(req, res, next, status) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.notFound('User not found.');

    const user = await User.findById(req.params.id).select('+nid');
    if (!user) throw ApiError.notFound('User not found.');
    if (!user.nid) throw ApiError.badRequest('This user has no NID on file.');

    user.nid.status = status;
    if (status === 'verified') {
      user.nid.verifiedAt = new Date();
      user.nid.verifiedBy = req.user._id;
    } else {
      user.nid.verifiedAt = null;
      user.nid.verifiedBy = null;
    }
    await user.save();

    // Sync the badge to any worker profile this account owns.
    if (status === 'verified') {
      await Worker.updateMany({ ownerUserId: user._id }, { $set: { isVerified: true } });
    }

    await AuditLog.create({
      actorId: req.user._id,
      action: `user.nid.${status}`,
      targetType: 'User',
      targetId: user._id,
      ip: req.ip,
    });

    return sendSuccess(res, { message: `NID ${status}.`, data: { user: staffUser(user) } });
  } catch (err) {
    return next(err);
  }
}

export const verifyUserNid = (req, res, next) => changeNidStatus(req, res, next, 'verified');
export const rejectUserNid = (req, res, next) => changeNidStatus(req, res, next, 'rejected');

/**
 * GET /api/admin/users/:id/nid
 * Short-lived signed URLs for a user's private NID images + audit log.
 */
export async function getUserNid(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.notFound('User not found.');

    const user = await User.findById(req.params.id).select('+nid');
    if (!user) throw ApiError.notFound('User not found.');
    if (!user.nid) throw ApiError.notFound('No NID on file.');

    const build = (key, side) => {
      if (!key || !fs.existsSync(nidImagePath(key))) return null;
      const { exp, sig, ttl } = signNidToken(`user:${user._id}`, side);
      return `/api/files/user-nid/${user._id}/${side}?exp=${exp}&sig=${sig}&t=${ttl}`;
    };

    await AuditLog.create({
      actorId: req.user._id,
      action: 'user.nid.view',
      targetType: 'User',
      targetId: user._id,
      ip: req.ip,
    });

    return sendSuccess(res, {
      message: 'Signed NID URLs (valid ~5 minutes).',
      data: {
        status: user.nid.status || 'pending',
        last4: user.nid.numberLast4 || '',
        frontUrl: build(user.nid.frontImagePath, 'front'),
        backUrl: build(user.nid.backImagePath, 'back'),
      },
    });
  } catch (err) {
    return next(err);
  }
}

/* ---------------------------- Workers ---------------------------- */

/** GET /api/admin/workers/:id - full worker info (contact + NID meta). */
export async function getWorkerDetail(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.notFound('Worker not found.');

    const worker = await Worker.findById(req.params.id).select('+contact +nid');
    if (!worker) throw ApiError.notFound('Worker not found.');

    await AuditLog.create({
      actorId: req.user._id,
      action: 'worker.view',
      targetType: 'Worker',
      targetId: worker._id,
      ip: req.ip,
    });

    return sendSuccess(res, { message: 'Worker detail', data: { worker: staffWorker(worker) } });
  } catch (err) {
    return next(err);
  }
}

/** GET /api/admin/workers?status=&page=&limit= */
export async function listWorkers(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const filter = req.query.status ? { status: req.query.status } : {};

    const base = Worker.find(filter).select('+contact +nid');
    const [items, total] = await Promise.all([
      base.clone().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Worker.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      message: 'Workers',
      data: { workers: items.map(staffWorker) },
      meta: { total, page, limit },
    });
  } catch (err) {
    return next(err);
  }
}

async function changeStatus(req, res, next, status) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.notFound('Worker not found.');

    const worker = await Worker.findById(req.params.id).select('+contact +nid');
    if (!worker) throw ApiError.notFound('Worker not found.');

    worker.status = status;

    if (status === 'approved') {
      if (worker.nid && (worker.nid.numberEncrypted || worker.nid.frontImagePath)) {
        worker.isVerified = true;
        worker.nid.verifiedAt = new Date();
        worker.nid.verifiedBy = req.user._id;
      }
    }
    if (status === 'rejected') {
      worker.isVerified = false;
    }

    worker.trustScore = computeTrustScore(worker);
    await worker.save();

    await AuditLog.create({
      actorId: req.user._id,
      action: `worker.${status}`,
      targetType: 'Worker',
      targetId: worker._id,
      ip: req.ip,
    });

    return sendSuccess(res, {
      message: `Worker ${status}.`,
      data: { worker: staffWorker(worker) },
    });
  } catch (err) {
    return next(err);
  }
}

export const verifyWorker = (req, res, next) => changeStatus(req, res, next, 'approved');
export const rejectWorker = (req, res, next) => changeStatus(req, res, next, 'rejected');
export const suspendWorker = (req, res, next) => changeStatus(req, res, next, 'suspended');

/**
 * GET /api/admin/workers/:id/nid
 * Returns short-lived signed URLs for the private NID images and writes an audit log.
 */
export async function getWorkerNid(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.notFound('Worker not found.');

    const worker = await Worker.findById(req.params.id).select('+nid');
    if (!worker) throw ApiError.notFound('Worker not found.');

    const hasFront = Boolean(worker.nid?.frontImagePath);
    const hasBack = Boolean(worker.nid?.backImagePath);
    if (!hasFront && !hasBack) throw ApiError.notFound('No NID images on file.');

    const build = (key, side) => {
      if (!key || !fs.existsSync(nidImagePath(key))) return null;
      const { exp, sig, ttl } = signNidToken(String(worker._id), side);
      return `/api/files/nid/${worker._id}/${side}?exp=${exp}&sig=${sig}&t=${ttl}`;
    };

    await AuditLog.create({
      actorId: req.user._id,
      action: 'nid.view',
      targetType: 'Worker',
      targetId: worker._id,
      meta: { hasFront, hasBack },
      ip: req.ip,
    });

    return sendSuccess(res, {
      message: 'Signed NID URLs (valid ~5 minutes).',
      data: {
        last4: worker.nid.numberLast4 || '',
        verifiedAt: worker.nid.verifiedAt || null,
        frontUrl: build(worker.nid.frontImagePath, 'front'),
        backUrl: build(worker.nid.backImagePath, 'back'),
      },
    });
  } catch (err) {
    return next(err);
  }
}

/* ---------------------------- Pricing ---------------------------- */

export async function getPricing(_req, res, next) {
  try {
    let pricing = await Pricing.findOne({ key: 'default' });
    if (!pricing) pricing = await Pricing.create({ key: 'default' });
    return sendSuccess(res, { message: 'Pricing', data: { pricing } });
  } catch (err) {
    return next(err);
  }
}

export async function updatePricing(req, res, next) {
  try {
    const { unlockPrice, creditPacks, plans } = req.body;
    const pricing = await Pricing.findOneAndUpdate(
      { key: 'default' },
      {
        $set: {
          ...(unlockPrice !== undefined ? { unlockPrice } : {}),
          ...(creditPacks ? { creditPacks } : {}),
          ...(plans ? { plans } : {}),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return sendSuccess(res, { message: 'Pricing updated.', data: { pricing } });
  } catch (err) {
    return next(err);
  }
}

/* ----------------------------- Stats ----------------------------- */

export async function getStats(_req, res, next) {
  try {
    const [
      totalUsers,
      totalWorkers,
      pendingWorkers,
      approvedWorkers,
      verifiedWorkers,
      agents,
    ] = await Promise.all([
      User.countDocuments(),
      Worker.countDocuments(),
      Worker.countDocuments({ status: 'pending' }),
      Worker.countDocuments({ status: 'approved' }),
      Worker.countDocuments({ isVerified: true }),
      User.countDocuments({ role: 'agent' }),
    ]);

    // Optional collections (later phases) - safe if they don't exist yet.
    const totalUnlocks = await mongoose.connection
      .collection('unlocks')
      .countDocuments()
      .catch(() => 0);

    return sendSuccess(res, {
      message: 'Stats',
      data: {
        users: { total: totalUsers, agents },
        workers: { total: totalWorkers, pending: pendingWorkers, approved: approvedWorkers, verified: verifiedWorkers },
        unlocks: { total: totalUnlocks },
      },
    });
  } catch (err) {
    return next(err);
  }
}

/* --------------------------- Audit logs -------------------------- */

export async function listAuditLogs(req, res, next) {
  try {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(limit).lean();
    return sendSuccess(res, { message: 'Audit logs', data: { logs } });
  } catch (err) {
    return next(err);
  }
}
