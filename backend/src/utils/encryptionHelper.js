// src/utils/encryptionHelper.js
// AES-256-GCM symmetric encryption for TikTok token storage
// Key: TIKTOK_TOKEN_ENCRYPTION_KEY (64 hex chars = 32 bytes)
// Output format: iv:authTag:ciphertext (all hex, colon-separated)

const crypto = require('crypto');
const ALGO = 'aes-256-gcm';

function getKey() {
  const hex = process.env.TIKTOK_TOKEN_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('TIKTOK_TOKEN_ENCRYPTION_KEY must be 64 hex chars (32 bytes)');
  }
  return Buffer.from(hex, 'hex');
}

function encrypt(plaintext) {
  const iv     = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc    = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag    = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

function decrypt(blob) {
  const [ivHex, tagHex, encHex] = String(blob).split(':');
  if (!ivHex || !tagHex || !encHex) throw new Error('Invalid encrypted blob format');
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const dec = Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]);
  return dec.toString('utf8');
}

module.exports = { encrypt, decrypt };
