import multer from 'multer';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const imageOnly = (_req, file, cb) => {
  if (IMAGE_TYPES.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only JPG, PNG or WEBP images are allowed.'));
};

/**
 * Multipart upload for worker creation:
 *  - photo     (profile photo, public)
 *  - nidFront  (private)
 *  - nidBack   (private)
 * Structured fields travel in a single JSON `payload` text field.
 */
export const uploadWorkerFiles = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 3 },
  fileFilter: imageOnly,
}).fields([
  { name: 'photo', maxCount: 1 },
  { name: 'nidFront', maxCount: 1 },
  { name: 'nidBack', maxCount: 1 },
]);
