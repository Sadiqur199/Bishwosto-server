import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/**
 * Local file storage.
 * - Profile photos  -> uploads/photos  (served publicly at /uploads/photos)
 * - NID images      -> uploads/nid     (NEVER served publicly; admin signed URL only)
 *
 * Swap these helpers for Cloudinary later without touching controllers.
 * (Cloudinary would serve photos; NID should stay in a private/authenticated store.)
 */
const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');
export const PHOTO_DIR = path.join(UPLOAD_ROOT, 'photos');
export const NID_DIR = path.join(UPLOAD_ROOT, 'nid');

const IMAGE_EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function randomName(mimetype) {
  return `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${IMAGE_EXT[mimetype] || '.jpg'}`;
}

/** Save a profile photo and return its public URL path. */
export function savePhoto(file) {
  ensureDir(PHOTO_DIR);
  const name = randomName(file.mimetype);
  fs.writeFileSync(path.join(PHOTO_DIR, name), file.buffer);
  return `/uploads/photos/${name}`;
}

/** Save an NID image and return its private file key (no public URL). */
export function saveNidImage(file) {
  ensureDir(NID_DIR);
  const name = randomName(file.mimetype);
  fs.writeFileSync(path.join(NID_DIR, name), file.buffer);
  return name;
}

/** Resolve a private NID file path safely (blocks path traversal). */
export function nidImagePath(key) {
  return path.join(NID_DIR, path.basename(String(key)));
}
