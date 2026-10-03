import { sendSuccess } from '../utils/response.js';
import { publicUser } from '../utils/serializers.js';
import Unlock from '../models/Unlock.js';

/**
 * GET /api/me
 * Returns the authenticated user's own profile.
 */
export async function getMe(req, res) {
  return sendSuccess(res, {
    message: 'Current user',
    data: { user: publicUser(req.user) },
  });
}

/**
 * GET /api/me/unlocks
 * Returns all workers unlocked by the user with their contacts.
 */
export async function getMyUnlocks(req, res, next) {
  try {
    const unlocks = await Unlock.find({ user: req.user._id })
      .populate({
        path: 'worker',
        select: '+phone',
      })
      .sort({ createdAt: -1 })
      .lean();

    return sendSuccess(res, {
      message: 'Unlocked workers retrieved.',
      data: { unlocks },
    });
  } catch (err) {
    return next(err);
  }
}
