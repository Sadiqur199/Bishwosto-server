import mongoose from 'mongoose';

export const USER_ROLES = ['user', 'worker', 'agent', 'admin'];

const userSchema = new mongoose.Schema(
  {
    firebaseUid: { type: String, required: true, unique: true, index: true },
    name: { type: String, trim: true, maxlength: 80, default: '' },
    phone: { type: String, trim: true, index: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    role: { type: String, enum: USER_ROLES, default: 'user', index: true },
    credits: { type: Number, default: 0, min: 0 },
    planExpiresAt: { type: Date, default: null },
    area: { type: String, trim: true, default: '' },
    referralCode: { type: String, unique: true, sparse: true, index: true },
    referredBy: { type: String, default: null },
    isBlocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

/** URL/id safe referral code, e.g. GHOR-A1B2C3. */
userSchema.statics.generateReferralCode = function generateReferralCode() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `GHOR-${random}`;
};

const User = mongoose.model('User', userSchema);

export default User;
