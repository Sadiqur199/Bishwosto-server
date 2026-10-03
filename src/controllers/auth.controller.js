import User, { SELF_REGISTER_ROLES } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/response.js';
import { publicUser } from '../utils/serializers.js';
import { normalizeBdPhone } from '../utils/phone.js';
import { signSession } from '../utils/session.js';
import { createCustomToken, isFirebaseReady } from '../config/firebase.js';

/**
 * POST /api/auth/register
 * Requires a valid Firebase ID token (the client completed phone OTP).
 * The phone number is taken from the verified token - never from the body.
 * The password is bcrypt-hashed before storage.
 */
export async function registerUser(req, res, next) {
  try {
    const { name, email, address, password, role } = req.body;

    // Phone can come from a verified Firebase phone session (OTP path) OR,
    // while OTP is disabled, directly from the request body (direct path).
    const isFirebase = req.auth?.provider === 'firebase';
    const phone = normalizeBdPhone(isFirebase ? req.auth.phone : req.body.phone);

    if (!phone) {
      return next(ApiError.badRequest('A valid Bangladeshi phone number is required.'));
    }

    // Synthetic, stable id for direct registrations so sessions still work.
    const firebaseUid = isFirebase ? req.auth.uid : `bd-${phone.replace('+', '')}`;

    const existing = await User.findOne({ $or: [{ firebaseUid }, { phone }] });
    if (existing) {
      return next(
        ApiError.conflict('An account already exists for this phone number. Please login instead.')
      );
    }

    const user = new User({
      firebaseUid,
      phone,
      email: email || '',
      name: name.trim(),
      address: address.trim(),
      role: SELF_REGISTER_ROLES.includes(role) ? role : 'user',
      referralCode: User.generateReferralCode(),
    });
    await user.setPassword(password);
    await user.save();

    return sendSuccess(res, {
      status: 201,
      message: 'Registration successful. Please login.',
      data: { user: publicUser(user) },
    });
  } catch (err) {
    if (err?.code === 11000) {
      return next(ApiError.conflict('An account already exists for this phone number.'));
    }
    return next(err);
  }
}

/**
 * POST /api/auth/login
 * Phone + password login. On success returns a Firebase custom token which the
 * client exchanges for a real Firebase session (keeps server ID-token security).
 */
export async function loginUser(req, res, next) {
  try {
    const phone = normalizeBdPhone(req.body.phone);
    if (!phone) return next(ApiError.badRequest('Invalid phone number.'));

    const user = await User.findOne({ phone }).select('+passwordHash');
    const passwordOk = user && user.passwordHash ? await user.verifyPassword(req.body.password) : false;

    // Generic message on purpose (avoids revealing which phone numbers exist).
    if (!user || !passwordOk) {
      return next(ApiError.unauthorized('Invalid phone number or password.'));
    }
    if (user.isBlocked) {
      return next(ApiError.forbidden('Your account has been blocked.'));
    }

    // Prefer a Firebase session when Admin is configured; otherwise fall back to
    // our own signed session token so password login works without Firebase.
    if (isFirebaseReady()) {
      const customToken = await createCustomToken(user.firebaseUid);
      return sendSuccess(res, {
        message: 'Login successful.',
        data: { customToken, user: publicUser(user) },
      });
    }

    const token = signSession(user);
    return sendSuccess(res, {
      message: 'Login successful.',
      data: { token, user: publicUser(user) },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/auth/sync
 * Returns the local account for the authenticated Firebase session.
 * It no longer auto-creates accounts (registration is explicit via /register).
 * Also lets an existing user update a few safe profile fields.
 */
export async function syncUser(req, res, next) {
  try {
    const { name, area } = req.body;
    const user = await User.findOne({ firebaseUid: req.auth.uid });

    if (!user) {
      return next(ApiError.notFound('No account found for this number. Please register first.'));
    }

    if (typeof name === 'string' && name.trim()) user.name = name.trim();
    if (typeof area === 'string') user.area = area.trim();
    await user.save();

    return sendSuccess(res, { message: 'Account synced.', data: { user: publicUser(user) } });
  } catch (err) {
    return next(err);
  }
}
