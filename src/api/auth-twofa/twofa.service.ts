//twofa.service

import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { encrypt, decrypt, generateTOTPSecret, bcryptCompare, bcryptHash } from 'src/common/crypto';

import * as speakeasy from 'speakeasy';

import { RepositoryRegistry } from '../../repositories/prisma/repository.registry';
import * as crypto from 'crypto';
@Injectable()
export class TwoFAService {
  constructor(
    private readonly repo: RepositoryRegistry,
  ) {}

  // --------------------------------------------------
  // 🔑 STEP 1: GENERATE SECRET (SETUP)
  // --------------------------------------------------
  async generateSetup(userId: string, email: string) {
    const { base32, otpauth_url } = generateTOTPSecret(email);

    // DO NOT STORE YET
    return {
      tempSecret: base32,
      otpauthUrl: otpauth_url,
    };
  }

  // --------------------------------------------------
  // ✅ STEP 2: ENABLE 2FA
  // --------------------------------------------------
  async enable(userId: string, token: string, tempSecret: string) {
    const isValid = this.verifyTOTP(token, tempSecret);

    if (!isValid) {
      throw new BadRequestException('Invalid TOTP code');
    }

    const encrypted = encrypt(tempSecret);

    // enable 2FA
    await this.repo.user.enable2FA(userId, encrypted);

    // invalidate sessions
    await this.repo.user.bumpTokenVersion(userId);

    // generate backup codes
    const backupCodes = await this.generateBackupCodes(userId);

    return {
      success: true,
      backupCodes, // ⚠️ show once
    };
  }

  // --------------------------------------------------
  // 🔍 VERIFY TOTP
  // --------------------------------------------------
  private verifyTOTP(token: string, secret: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1,
    });
  }

  // --------------------------------------------------
  // 🔐 VERIFY 2FA (LOGIN STEP)
  // --------------------------------------------------
  async verify(userId: string, token: string): Promise<boolean> {
    const user = await this.repo.user.findById(userId);

    if (!user || !user.totpEnabled || !user.totpSecret) {
      throw new UnauthorizedException('2FA not enabled');
    }

    const secret = decrypt(user.totpSecret);

    // 1. Try TOTP
    const isValidTOTP = this.verifyTOTP(token, secret);

    if (isValidTOTP) return true;

    // 2. Try backup codes
    const isBackupValid = await this.verifyBackupCode(userId, token);

    if (isBackupValid) return true;

    throw new UnauthorizedException('Invalid 2FA code');
  }

  // --------------------------------------------------
  // 🧾 BACKUP CODE VERIFY
  // --------------------------------------------------
  private async verifyBackupCode(
    userId: string,
    token: string,
  ): Promise<boolean> {
    const codes = await this.repo.backupTwoFACode.findUnusedByUser(userId);

    for (const code of codes) {
      const match = await bcryptCompare(token, code.codeHash);
      if (match) {
        // 🔥 atomic consume
        await this.repo.backupTwoFACode.consume(userId, code.codeHash);
        return true;
      }
    }

    return false;
  }

  // --------------------------------------------------
  // 🔁 GENERATE BACKUP CODES
  // --------------------------------------------------
  private async generateBackupCodes(userId: string): Promise<string[]> {
    const rawCodes = Array.from({ length: 10 }).map(() =>
      crypto.randomBytes(8).toString('hex'),
    );

    const hashed = await Promise.all(
      rawCodes.map((code) => bcryptHash(code)),);

    // delete old ones (important)
    await this.repo.backupTwoFACode.deleteAllByUser(userId);

    await this.repo.backupTwoFACode.createMany(userId, hashed);

    return rawCodes;
  }

  // --------------------------------------------------
  // 🔄 REGENERATE BACKUP CODES
  // --------------------------------------------------
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    return this.generateBackupCodes(userId);
  }

  // --------------------------------------------------
  // ❌ DISABLE 2FA
  // --------------------------------------------------
  async disable(userId: string, token: string) {
    const isValid = await this.verify(userId, token);

    if (!isValid) {
      throw new UnauthorizedException('Invalid 2FA');
    }

    await this.repo.user.disable2FA(userId);

    // remove backup codes
    await this.repo.backupTwoFACode.deleteAllByUser(userId);

    // invalidate sessions
    await this.repo.user.bumpTokenVersion(userId);

    return { success: true };
  }
}