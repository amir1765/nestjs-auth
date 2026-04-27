import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import * as crypto from 'crypto';

@Injectable()
export class AuthHelper {
  private readonly encryptionKey: Buffer; // in production, load from config/env
  private readonly algorithm = 'aes-256-cbc';

  constructor() {
    // IMPORTANT: Use a securely stored key (e.g., from environment variable).
    // This is only a placeholder – never hardcode keys in source code!
    const key = process.env.ENCRYPTION_KEY || 'change-me-to-a-32-byte-key!!'; // 32 bytes
    this.encryptionKey = Buffer.from(key, 'utf8').subarray(0, 32);
  }

  // --- Password hashing ---
  async hashPassword(plain: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(plain, saltRounds);
  }

  async comparePassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  // --- TOTP secret encryption (AES-256-CBC) ---
  encryptTotpSecret(secret: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      this.algorithm,
      this.encryptionKey,
      iv,
    );
    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    // Store IV + encrypted data as a single hex string (IV first 32 chars in hex)
    return iv.toString('hex') + ':' + encrypted;
  }

  decryptTotpSecret(encryptedData: string): string {
    const [ivHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.encryptionKey,
      iv,
    );
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // --- TOTP generation & verification ---
  generateTotpSecret(email: string): {
    secret: string;
    otpauthUrl: string;
  } {
    const secret = speakeasy.generateSecret({
      name: `MyApp (${email})`,
    });
    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url!,
    };
  }

  verifyTotpToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1, // allow 1 step of clock drift
    });
  }
}
