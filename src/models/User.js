import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const USER_ROLES = ['user', 'worker', 'agent', 'admin'];

/** Roles a person may pick for themselves at registration (never admin/agent). */
export const SELF_REGISTER_ROLES = ['user', 'worker'];

const userSchema = new mongoose.Schema(
  {
    firebaseUid: { type: String, required: true, unique: true },
    name: { type: String, trim: true, maxlength: 80, default: '' },
    phone: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },

    // Password login (optional). Never returned by queries unless explicitly selected.
    passwordHash: { type: String, select: false },

    address: { type: String, trim: true, maxlength: 200, default: '' },
    role: { type: String, enum: USER_ROLES, default: 'user', index: true },
    credits: { type: Number, default: 0, min: 0 },
    planExpiresAt: { type: Date, default: null },
    area: { type: String, trim: true, default: '' },
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: String, default: null },
    isBlocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// One account per phone number (only enforced for non-empty phones).
userSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: 'string', $gt: '' } } }
);

/** Hash and store a plain password. */
userSchema.methods.setPassword = async function setPassword(plainPassword) {
  this.passwordHash = await bcrypt.hash(plainPassword, 12);
};

/** Compare a plain password with the stored hash. */
userSchema.methods.verifyPassword = function verifyPassword(plainPassword) {
  if (!this.passwordHash) return Promise.resolve(false);
  return bcrypt.compare(plainPassword, this.passwordHash);
};

/** URL/id safe referral code, e.g. GHOR-A1B2C3. */
userSchema.statics.generateReferralCode = function generateReferralCode() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `GHOR-${random}`;
};

const User = mongoose.model('User', userSchema);

export default User;
