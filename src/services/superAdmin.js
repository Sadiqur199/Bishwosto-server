import User from '../models/User.js';
import { env } from '../config/env.js';
import { isDbConnected } from '../config/db.js';
import { normalizeBdPhone } from '../utils/phone.js';
import { logger } from '../utils/logger.js';

/**
 * Ensure a super-admin account exists (bootstrap).
 * Admins are never created through public registration - only here or by
 * another admin via POST /api/admin/users.
 */
export async function ensureSuperAdmin() {
  if (!isDbConnected()) return;

  const phone = normalizeBdPhone(env.superAdmin.phone);
  if (!phone || !env.superAdmin.password) {
    logger.info('Super admin bootstrap skipped (SUPER_ADMIN_PHONE/PASSWORD not set).');
    return;
  }

  try {
    const existing = await User.findOne({ phone }).select('+passwordHash');
    if (existing) {
      let changed = false;
      if (existing.role !== 'admin') {
        existing.role = 'admin';
        changed = true;
      }
      if (!existing.passwordHash) {
        await existing.setPassword(env.superAdmin.password);
        changed = true;
      }
      if (changed) {
        await existing.save();
        logger.success('Super admin account updated.');
      } else {
        logger.info('Super admin account already present.');
      }
      return;
    }

    const admin = new User({
      firebaseUid: `admin-${phone.replace('+', '')}`,
      phone,
      name: 'Super Admin',
      role: 'admin',
      referralCode: User.generateReferralCode(),
    });
    await admin.setPassword(env.superAdmin.password);
    await admin.save();
    logger.success(`Super admin account created (${phone}).`);
  } catch (err) {
    logger.error(`Super admin bootstrap failed: ${err.message}`);
  }
}
