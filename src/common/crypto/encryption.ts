// encryption.ts
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

const ALGO = 'aes-256-gcm';

let KEY: Buffer;

export function setCryptoKey(key: string) {
  const parsed = Buffer.from(key, 'hex');

  if (parsed.length !== 32) {
    throw new Error('CRYPTO_SECRET must be 32 bytes (64 hex chars)');
  }

  KEY = parsed;
}

export function encrypt(text: string): string {
  if (!KEY) throw new Error('Crypto key not initialized');

  const iv = randomBytes(12);

  const cipher = createCipheriv(ALGO, KEY, iv);

  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decrypt(payload: string): string {
  if (!KEY) throw new Error('Crypto key not initialized');

  const data = Buffer.from(payload, 'base64');

  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const encrypted = data.subarray(28);

  const decipher = createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}