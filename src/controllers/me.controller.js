import { sendSuccess } from '../utils/response.js';

/**
 * GET /api/me
 * Returns the authenticated user's own profile.
 */
export async function getMe(req, res) {
  const { user } = req;
  return sendSuccess(res, {
    message: 'Current user',
    data: {
      user: {
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
      },
    },
  });
}
