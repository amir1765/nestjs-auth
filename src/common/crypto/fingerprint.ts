import { createHash } from 'crypto';

export function hashFingerprint(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}