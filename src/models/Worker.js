import mongoose from 'mongoose';

export const WORKER_CATEGORIES = [
  'bua',
  'cook',
  'darowan',
  'caretaker',
  'driver',
  'cleaner',
  'laundry',
  'gardener',
  'electrician',
  'plumber',
  'technician',
  'tutor',
  'labour',
  'tiffin',
  'pest',
  'painter',
];

export const WORK_TYPES = ['full_time', 'part_time', 'live_in'];
export const AVAILABILITY = ['available', 'busy'];
export const WORKER_STATUS = ['pending', 'approved', 'rejected', 'suspended'];
export const GENDERS = ['male', 'female', 'other'];
export const SALARY_TYPES = ['monthly', 'per_visit', 'per_day', 'hourly'];

const workHistorySchema = new mongoose.Schema(
  {
    place: { type: String, trim: true, maxlength: 120 },
    role: { type: String, trim: true, maxlength: 120 },
    fromDate: { type: String, trim: true, maxlength: 30 },
    toDate: { type: String, trim: true, maxlength: 30 },
    note: { type: String, trim: true, maxlength: 300 },
  },
  { _id: false }
);

const workerSchema = new mongoose.Schema(
  {
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    name: { type: String, trim: true, required: true, maxlength: 80 },
    photoUrl: { type: String, default: '' },
    gender: { type: String, enum: GENDERS, default: 'female' },
    ageRange: { type: String, trim: true, default: '' },
    religion: { type: String, trim: true, default: '' },
    languages: { type: [String], default: ['bangla'] },

    categories: {
      type: [{ type: String, enum: WORKER_CATEGORIES }],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'At least one category is required.',
      },
      index: true,
    },
    skills: { type: [String], default: [] },
    experienceYears: { type: Number, default: 0, min: 0, max: 60 },

    salaryExpectation: {
      min: { type: Number, default: 0, min: 0 },
      max: { type: Number, default: 0, min: 0 },
      type: { type: String, enum: SALARY_TYPES, default: 'monthly' },
    },
    workType: { type: String, enum: WORK_TYPES, default: 'full_time' },
    availability: { type: String, enum: AVAILABILITY, default: 'available', index: true },

    location: {
      division: { type: String, trim: true, default: '' },
      district: { type: String, trim: true, default: '', index: true },
      thana: { type: String, trim: true, default: '' },
      area: { type: String, trim: true, default: '' },
      geo: {
        lat: { type: Number, default: null },
        lng: { type: Number, default: null },
      },
    },

    // ---- PRIVATE: never returned unless explicitly selected (unlocked / admin) ----
    contact: {
      type: {
        phone: { type: String, trim: true, default: '' },
        whatsapp: { type: String, trim: true, default: '' },
        presentAddress: { type: String, trim: true, default: '' },
        permanentAddress: { type: String, trim: true, default: '' },
        referenceName: { type: String, trim: true, default: '' },
        referencePhone: { type: String, trim: true, default: '' },
      },
      select: false,
      default: undefined,
    },
    nid: {
      type: {
        numberEncrypted: { type: String, default: '' },
        numberLast4: { type: String, default: '' },
        frontImagePath: { type: String, default: '' },
        backImagePath: { type: String, default: '' },
        verifiedAt: { type: Date, default: null },
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      },
      select: false,
      default: undefined,
    },

    // ---- public/computed ----
    isVerified: { type: Boolean, default: false, index: true },
    ratingAvg: { type: Number, default: 0, min: 0, max: 5, index: true },
    ratingCount: { type: Number, default: 0, min: 0 },
    ratingBreakdown: {
      type: { 1: Number, 2: Number, 3: Number, 4: Number, 5: Number },
      default: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    },
    unlockCount: { type: Number, default: 0, min: 0 },
    trustScore: { type: Number, default: 0, min: 0, max: 100 },

    workHistory: { type: [workHistorySchema], default: [] },
    status: { type: String, enum: WORKER_STATUS, default: 'pending', index: true },
    consentGiven: { type: Boolean, required: true, default: false },
    removedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Basic search support for Bangla/English without a language-specific text index.
workerSchema.index({ name: 'text', skills: 'text' });
workerSchema.index({ createdAt: -1 });

const Worker = mongoose.model('Worker', workerSchema);
export default Worker;
