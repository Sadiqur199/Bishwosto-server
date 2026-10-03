import crypto from 'node:crypto';
import { env } from '../config/env.js';

const ALGO = 'aes-256-gcm';

function getKey() {
  const hex = env.nidEncryptionKey;
  if (!hex || hex.length !== 64) {
    throw new Error('NID_ENCRYPTION_KEY must be 64 hex characters (32 bytes).');
  }
  return Buffer.from(hex, 'hex');
}

/** AES-256-GCM encrypt -> iv:tag:ciphertext (all hex). */
export function encryptNid(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/** Reverse of encryptNid. */
export function decryptNid(payload) {
  const [ivHex, tagHex, dataHex] = String(payload).split(':');
  if (!ivHex || !tagHex || !dataHex) throw new Error('Malformed encrypted NID.');
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8');
}

/** Last 4 digits, stored as a separate non-sensitive field. */
export const nidLast4 = (nid) => String(nid).replace(/\D/g, '').slice(-4);
