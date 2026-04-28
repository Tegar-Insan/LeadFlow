import crypto from 'crypto';
const ALGO = 'aes-256-gcm';
function getKey() {
    const hex = process.env['TIKTOK_TOKEN_ENCRYPTION_KEY'];
    if (!hex || hex.length !== 64) {
        throw new Error('TIKTOK_TOKEN_ENCRYPTION_KEY must be 64 hex chars (32 bytes)');
    }
    return Buffer.from(hex, 'hex');
}
export function encrypt(plaintext) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
    const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}
export function decrypt(blob) {
    const parts = String(blob).split(':');
    const ivHex = parts[0];
    const tagHex = parts[1];
    const encHex = parts[2];
    if (!ivHex || !tagHex || !encHex)
        throw new Error('Invalid encrypted blob format');
    const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const dec = Buffer.concat([
        decipher.update(Buffer.from(encHex, 'hex')),
        decipher.final(),
    ]);
    return dec.toString('utf8');
}
//# sourceMappingURL=encryptionHelper.js.map