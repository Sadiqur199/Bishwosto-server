import User, { SELF_REGISTER_ROLES } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/response.js';
import { publicUser } from '../utils/serializers.js';
import { normalizeBdPhone } from '../utils/phone.js';
import { signSession } from '../utils/session.js';
import { encryptNid, nidLast4 } from '../utils/nidCrypto.js';
import { savePhoto, saveNidImage } from '../services/storage.js';
import { createCustomToken, isFirebaseReady } from '../config/firebase.js';

/**
 * POST /api/auth/register
 * Multipart: profile fields + optional `photo`, `nidFront`, `nidBack` images.
 * Phone comes from the verified Firebase OTP session when present, else the body.
 * NID is required (number and/or documents) and stored encrypted + private.
 */
export async function registerUser(req, res, next) {
  try {
    // A JSON body arrives as text fields; multipart arrives in req.body too.
    const { name, email, address, password, role, nidNumber, consent } = req.body;

    const agreed = consent === true || consent === 'true';
    if (!agreed) {
      return next(ApiError.badRequest('You must accept the Privacy Policy and Terms.'));
    }

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

    const photo = req.files?.photo?.[0];
    const nidFront = req.files?.nidFront?.[0];
    const nidBack = req.files?.nidBack?.[0];

    // NID is mandatory: require a number and at least the front image.
    if (!nidNumber || String(nidNumber).trim().length < 4) {
      return next(ApiError.badRequest('NID number is required.'));
    }
    if (!nidFront) {
      return next(ApiError.badRequest('NID front image is required.'));
    }

    const user = new User({
      firebaseUid,
      phone,
      email: email || '',
      name: String(name).trim(),
      address: String(address).trim(),
      role: SELF_REGISTER_ROLES.includes(role) ? role : 'user',
      referralCode: User.generateReferralCode(),
      photoUrl: photo ? savePhoto(photo) : '',
      nid: {
        numberEncrypted: encryptNid(String(nidNumber).trim()),
        numberLast4: nidLast4(nidNumber),
        frontImagePath: nidFront ? saveNidImage(nidFront) : '',
        backImagePath: nidBack ? saveNidImage(nidBack) : '',
        status: 'pending',
      },
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
