// token.ts
import { randomBytes } from 'crypto';

export function generateSecureToken(size = 64): string {
  return randomBytes(size).toString('hex'); // 128 chars
}