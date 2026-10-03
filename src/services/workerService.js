import { z } from 'zod';
import Worker, {
  WORKER_CATEGORIES,
  WORK_TYPES,
  GENDERS,
  SALARY_TYPES,
} from '../models/Worker.js';
import { ApiError } from '../utils/ApiError.js';
import { savePhoto, saveNidImage } from './storage.js';
import { encryptNid, nidLast4 } from '../utils/nidCrypto.js';

const workerPayloadSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short.').max(80),
  gender: z.enum(GENDERS).optional(),
  ageRange: z.string().trim().max(20).optional(),
  religion: z.string().trim().max(40).optional(),
  languages: z.array(z.string().trim().max(30)).optional(),
  categories: z.array(z.enum(WORKER_CATEGORIES)).min(1, 'Pick at least one category.'),
  skills: z.array(z.string().trim().max(40)).optional(),
  experienceYears: z.number().min(0).max(60).optional(),
  salaryExpectation: z
    .object({
      min: z.number().min(0).optional(),
      max: z.number().min(0).optional(),
      type: z.enum(SALARY_TYPES).optional(),
    })
    .optional(),
  workType: z.enum(WORK_TYPES).optional(),
  location: z
    .object({
      division: z.string().trim().max(60).optional(),
      district: z.string().trim().max(60).optional(),
      thana: z.string().trim().max(60).optional(),
      area: z.string().trim().max(120).optional(),
    })
    .optional(),
  contact: z
    .object({
      phone: z.string().trim().max(20).optional(),
      whatsapp: z.string().trim().max(20).optional(),
      presentAddress: z.string().trim().max(200).optional(),
      permanentAddress: z.string().trim().max(200).optional(),
      referenceName: z.string().trim().max(80).optional(),
      referencePhone: z.string().trim().max(20).optional(),
    })
    .optional(),
  nidNumber: z.string().trim().min(4).max(30).optional(),
  consentGiven: z.boolean(),
  workHistory: z
    .array(
      z.object({
        place: z.string().trim().max(120).optional(),
        role: z.string().trim().max(120).optional(),
        fromDate: z.string().trim().max(30).optional(),
        toDate: z.string().trim().max(30).optional(),
        note: z.string().trim().max(300).optional(),
      })
    )
    .optional(),
});

export function parseWorkerPayload(raw) {
  let data;
  try {
    data = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    throw ApiError.badRequest('Invalid payload: not valid JSON.');
  }

  const result = workerPayloadSchema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      path: issue.path.join('.') || 'payload',
      message: issue.message,
    }));
    throw ApiError.badRequest('Validation failed.', details);
  }
  return result.data;
}

/** Build the document fields (excluding files) from validated payload. */
function buildBaseFields(data) {
  return {
    name: data.name,
    gender: data.gender || 'female',
    ageRange: data.ageRange || '',
    religion: data.religion || '',
    languages: data.languages?.length ? data.languages : ['bangla'],
    categories: data.categories,
    skills: data.skills || [],
    experienceYears: data.experienceYears || 0,
    salaryExpectation: data.salaryExpectation || { min: 0, max: 0, type: 'monthly' },
    workType: data.workType || 'full_time',
    location: data.location || {},
    workHistory: data.workHistory || [],
  };
}

/** Merge only the contact fields that were provided (never wipe existing ones). */
function mergeContact(existing = {}, incoming = {}) {
  const merged = { ...existing };
  for (const [key, value] of Object.entries(incoming || {})) {
    if (value !== undefined && value !== '') merged[key] = value;
  }
  return merged;
}

/**
 * Create a worker from a multipart request (agent/admin or worker self).
 * `contactDefaults` fills any contact fields the payload left empty
 * (e.g. phone/address taken from the user's own registration).
 */
export async function createWorker({
  payload,
  files,
  createdBy,
  ownerUserId = null,
  status = 'pending',
  contactDefaults = {},
  identity = null,
}) {
  const data = parseWorkerPayload(payload);
  if (!data.consentGiven) {
    throw ApiError.badRequest('Worker consent is required before listing.');
  }

  const photo = files?.photo?.[0];
  const nidFront = files?.nidFront?.[0];
  const nidBack = files?.nidBack?.[0];

  const contact = { ...contactDefaults, ...(data.contact || {}) };
  if (!contact.phone) {
    throw ApiError.badRequest('A contact phone number is required.');
  }

  const doc = {
    ...buildBaseFields(data),
    contact,
    createdBy,
    ownerUserId,
    status,
    // Prefer a freshly uploaded photo, else inherit the account photo.
    photoUrl: photo ? savePhoto(photo) : identity?.photoUrl || '',
    consentGiven: true,
  };

  // Prefer freshly provided NID; otherwise inherit the account's NID (if any).
  if (data.nidNumber || nidFront || nidBack) {
    doc.nid = {
      numberEncrypted: data.nidNumber ? encryptNid(data.nidNumber) : '',
      numberLast4: data.nidNumber ? nidLast4(data.nidNumber) : '',
      frontImagePath: nidFront ? saveNidImage(nidFront) : '',
      backImagePath: nidBack ? saveNidImage(nidBack) : '',
    };
  } else if (identity?.nid) {
    doc.nid = {
      numberEncrypted: identity.nid.numberEncrypted || '',
      numberLast4: identity.nid.numberLast4 || '',
      frontImagePath: identity.nid.frontImagePath || '',
      backImagePath: identity.nid.backImagePath || '',
    };
  }

  // A verified account NID makes the worker auto-verified.
  if (identity?.nid?.nidVerified) {
    doc.isVerified = true;
    doc.nid = {
      ...(doc.nid || {}),
      verifiedAt: identity.nid.verifiedAt || new Date(),
      verifiedBy: identity.nid.verifiedBy || createdBy,
    };
  }

  return Worker.create(doc);
}

/** Update an existing worker (owner agent/admin or worker self). */
export async function updateWorker(worker, { payload, files }) {
  const data = parseWorkerPayload(payload);

  Object.assign(worker, buildBaseFields(data));

  // Merge contact so untouched fields (and the auto-filled phone/address) survive.
  worker.contact = mergeContact(worker.contact || {}, data.contact || {});
  if (!worker.contact.phone) throw ApiError.badRequest('A contact phone number is required.');

  if (data.consentGiven !== undefined) worker.consentGiven = true;

  const photo = files?.photo?.[0];
  const nidFront = files?.nidFront?.[0];
  const nidBack = files?.nidBack?.[0];
  if (photo) worker.photoUrl = savePhoto(photo);

  // NID block is select:false, so it is absent unless the query selected it.
  if (!worker.nid) worker.nid = {};

  if (data.nidNumber) {
    worker.nid.numberEncrypted = encryptNid(data.nidNumber);
    worker.nid.numberLast4 = nidLast4(data.nidNumber);
  }
  if (nidFront) worker.nid.frontImagePath = saveNidImage(nidFront);
  if (nidBack) worker.nid.backImagePath = saveNidImage(nidBack);

  return worker.save();
}

/** Simple, bounded trust score from verification + experience + reviews. */
export function computeTrustScore(worker) {
  let score = 0;
  if (worker.isVerified) score += 40;
  score += Math.min(20, (worker.experienceYears || 0) * 3);
  if (worker.ratingCount > 0) score += Math.round((worker.ratingAvg / 5) * 30);
  if (worker.consentGiven) score += 10;
  return Math.max(0, Math.min(100, score));
}
