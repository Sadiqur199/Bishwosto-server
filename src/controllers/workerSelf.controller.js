import Worker, { AVAILABILITY } from '../models/Worker.js';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/response.js';
import { staffWorker, publicWorker } from '../utils/serializers.js';
import { createWorker, updateWorker } from '../services/workerService.js';

/** Build default contact details from the user's own account (phone + address). */
function contactDefaults(user) {
  return {
    phone: user.phone || '',
    presentAddress: user.address || '',
    permanentAddress: '',
    whatsapp: '',
    referenceName: '',
    referencePhone: '',
  };
}

/**
 * NID + photo to inherit into a worker profile.
 * A verified account NID makes the worker auto-verified; a pending one is
 * carried over so it can be verified later (no re-upload needed).
 */
function accountIdentity(user) {
  return {
    photoUrl: user.photoUrl || '',
    nid: user.nid
      ? {
          numberEncrypted: user.nid.numberEncrypted || '',
          numberLast4: user.nid.numberLast4 || '',
          frontImagePath: user.nid.frontImagePath || '',
          backImagePath: user.nid.backImagePath || '',
          nidVerified: user.nid.status === 'verified',
          verifiedAt: user.nid.status === 'verified' ? user.nid.verifiedAt : null,
          verifiedBy: user.nid.status === 'verified' ? user.nid.verifiedBy : null,
        }
      : null,
  };
}

/** GET /api/worker/me - the logged-in worker's own profile (with contact + NID meta). */
export async function getMyProfile(req, res, next) {
  try {
    const worker = await Worker.findOne({ ownerUserId: req.user._id }).select('+contact +nid');
    return sendSuccess(res, {
      message: 'My worker profile',
      data: {
        worker: worker ? staffWorker(worker) : null,
        defaults: contactDefaults(req.user),
      },
    });
  } catch (err) {
    return next(err);
  }
}

/** POST /api/worker/me - a worker submits their own profile (needs admin approval). */
export async function createMyProfile(req, res, next) {
  try {
    const existing = await Worker.findOne({ ownerUserId: req.user._id });
    if (existing) throw ApiError.conflict('You already have a profile.');

    // Account NID must be loaded explicitly (select:false).
    const account = await User.findById(req.user._id).select('+nid');

    const worker = await createWorker({
      payload: req.body.payload,
      files: req.files,
      createdBy: req.user._id,
      ownerUserId: req.user._id,
      status: 'pending',
      // Auto-fill the worker's contact from the account they registered with.
      contactDefaults: contactDefaults(req.user),
      // Inherit the account's photo + verified/pending NID (no re-upload).
      identity: accountIdentity(account),
    });

    return sendSuccess(res, {
      status: 201,
      message: 'Profile submitted for admin approval.',
      data: { worker: staffWorker(worker) },
    });
  } catch (err) {
    return next(err);
  }
}

/** PUT /api/worker/me - a worker edits their own profile. */
export async function updateMyProfile(req, res, next) {
  try {
    const worker = await Worker.findOne({ ownerUserId: req.user._id }).select('+contact +nid');
    if (!worker) throw ApiError.notFound('You do not have a profile yet.');

    const updated = await updateWorker(worker, {
      payload: req.body.payload,
      files: req.files,
    });

    // Any edit sends the profile back for admin re-approval.
    if (updated.status === 'rejected') updated.status = 'pending';
    await updated.save();

    return sendSuccess(res, { message: 'Profile updated.', data: { worker: staffWorker(updated) } });
  } catch (err) {
    return next(err);
  }
}

/** PATCH /api/worker/me/availability */
export async function setMyAvailability(req, res, next) {
  try {
    const { availability } = req.body;
    if (!AVAILABILITY.includes(availability)) throw ApiError.badRequest('Invalid availability.');

    const worker = await Worker.findOne({ ownerUserId: req.user._id });
    if (!worker) throw ApiError.notFound('You do not have a profile yet.');

    worker.availability = availability;
    await worker.save();
    return sendSuccess(res, { message: 'Availability updated.', data: { worker: publicWorker(worker) } });
  } catch (err) {
    return next(err);
  }
}
