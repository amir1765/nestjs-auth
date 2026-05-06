import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

// 🔐 Hash (for backup codes, tokens, etc.)
export async function bcryptHash(value: string): Promise<string> {
  return bcrypt.hash(value, SALT_ROUNDS);
}

// 🔍 Verify
export async function bcryptCompare(
  value: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(value, hash);
}