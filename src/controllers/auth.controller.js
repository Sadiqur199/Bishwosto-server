import User from '../models/User.js';
import { sendSuccess } from '../utils/response.js';

/** Shape a user document for API output (never expose internal/secret fields). */
function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
    credits: user.credits,
    planExpiresAt: user.planExpiresAt,
    area: user.area,
    referralCode: user.referralCode,
    isBlocked: user.isBlocked,
    createdAt: user.createdAt,
  };
}

/**
 * POST /api/auth/sync
 * Called by the client right after Firebase phone OTP login.
 * Creates the local user on first call, otherwise fetches/updates it.
 * Role can never be self-escalated here (always 'user' on create).
 */
export async function syncUser(req, res, next) {
  try {
    const { name, area, referredBy } = req.body;
    const { uid, phone, email, name: firebaseName } = req.firebase;

    let user = await User.findOne({ firebaseUid: uid });
    let created = false;

    if (!user) {
      user = await User.create({
        firebaseUid: uid,
        phone: phone || '',
        email: email || '',
        name: name || firebaseName || '',
        area: area || '',
        referralCode: User.generateReferralCode(),
        referredBy: referredBy || null,
      });
      created = true;
    } else {
      if (typeof name === 'string' && name.trim()) user.name = name.trim();
      if (typeof area === 'string') user.area = area.trim();
      if (!user.phone && phone) user.phone = phone;
      if (!user.email && email) user.email = email;
      await user.save();
    }

    return sendSuccess(res, {
      status: created ? 201 : 200,
      message: created ? 'Account created.' : 'Account synced.',
      data: { user: publicUser(user), isNewUser: created },
    });
  } catch (err) {
    return next(err);
  }
}
