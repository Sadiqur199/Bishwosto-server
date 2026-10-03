/**
 * Shape a user document for API output.
 * Never exposes passwordHash, the NID number, or NID images.
 * `nidStatus` is safe to show (e.g. a "verification pending" notice).
 */
export function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    address: user.address,
    photoUrl: user.photoUrl || '',
    role: user.role,
    credits: user.credits,
    planExpiresAt: user.planExpiresAt,
    area: user.area,
    referralCode: user.referralCode,
    nidStatus: user.nid?.status || 'pending',
    isBlocked: user.isBlocked,
    createdAt: user.createdAt,
  };
}

/**
 * User shape for staff/admin - includes NID metadata (status, last4, image flags)
 * but never the encrypted number or a usable image URL.
 */
export function staffUser(user) {
  return {
    ...publicUser(user),
    nid: {
      status: user.nid?.status || 'pending',
      last4: user.nid?.numberLast4 || '',
      hasFront: Boolean(user.nid?.frontImagePath),
      hasBack: Boolean(user.nid?.backImagePath),
      verifiedAt: user.nid?.verifiedAt || null,
    },
  };
}

/**
 * Worker shape for the PUBLIC API.
 * NEVER includes `contact` or `nid`. Pass `{ contact }` explicitly (only from
 * unlocked-user or admin endpoints) to include contact details.
 */
export function publicWorker(worker, { contact = null } = {}) {
  const value = {
    id: worker._id,
    name: worker.name,
    photoUrl: worker.photoUrl,
    gender: worker.gender,
    ageRange: worker.ageRange,
    languages: worker.languages,
    categories: worker.categories,
    skills: worker.skills,
    experienceYears: worker.experienceYears,
    salaryExpectation: worker.salaryExpectation,
    workType: worker.workType,
    availability: worker.availability,
    location: {
      division: worker.location?.division || '',
      district: worker.location?.district || '',
      thana: worker.location?.thana || '',
      area: worker.location?.area || '',
    },
    isVerified: worker.isVerified,
    ratingAvg: worker.ratingAvg,
    ratingCount: worker.ratingCount,
    ratingBreakdown: worker.ratingBreakdown,
    unlockCount: worker.unlockCount,
    trustScore: worker.trustScore,
    workHistory: worker.workHistory,
    status: worker.status,
    createdAt: worker.createdAt,
  };
  if (contact) value.contact = contact;
  return value;
}

/**
 * Worker shape for staff (agent owner / admin) - includes contact and NID metadata
 * but NEVER the encrypted NID number or raw NID images.
 */
export function staffWorker(worker) {
  return {
    ...publicWorker(worker),
    contact: worker.contact || null,
    nid: {
      last4: worker.nid?.numberLast4 || '',
      verifiedAt: worker.nid?.verifiedAt || null,
      hasFront: Boolean(worker.nid?.frontImagePath),
      hasBack: Boolean(worker.nid?.backImagePath),
    },
    ownerUserId: worker.ownerUserId || null,
    createdBy: worker.createdBy || null,
  };
}
