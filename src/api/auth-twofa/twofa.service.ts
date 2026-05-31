import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

import * as speakeasy from 'speakeasy';
import * as crypto from 'crypto';

import {
  encrypt,
  decrypt,
  generateTOTPSecret,
  bcryptCompare,
  bcryptHash,
} from 'src/common/crypto';

import { RepositoryRegistry } from '../../repositories/prisma/repository.registry';
import { EmailOTPTokenService } from '../email-otp-token/email-otp-token.service';
import { EmailOTPType } from '@prisma/client';
import { PrismaService } from 'src/repositories/prisma/prisma.service';
import { BackupTwoFACodeRepository } from '../../repositories/backup-code.repository';

@Injectable()
export class TwoFAService {
  constructor(
    private readonly repo: RepositoryRegistry,
    private readonly prisma: PrismaService,
    private readonly emailOTPTokenService: EmailOTPTokenService,
  ) {}

  // ==================================================
  // 📩 REQUEST ENABLE OTP
  // ==================================================

  async requestEnableOTP(userId: string) {
    const user = await this.getUserOrFail(userId);

    if (user.totpEnabled) {
      throw new ForbiddenException('2FA already enabled');
    }

    await this.emailOTPTokenService.sendOTP(
      user.id,
      user.email,
      EmailOTPType.ENABLE_2FA,
    );

    return { success: true };
  }

  // ==================================================
  // 📩 REQUEST DISABLE OTP
  // ==================================================

  async requestDisableOTP(userId: string) {
    const user = await this.getUserOrFail(userId);

    if (!user.totpEnabled) {
      throw new ForbiddenException('2FA already disabled');
    }

    await this.emailOTPTokenService.sendOTP(
      user.id,
      user.email,
      EmailOTPType.DISABLE_2FA,
    );

    return { success: true };
  }

  // ==================================================
  // 🔑 GENERATE SETUP
  // ==================================================

  async generateSetup(userId: string, emailOTP: string) {
    this.validateOTP(emailOTP);

    const user = await this.getUserOrFail(userId);

    if (user.totpEnabled) {
      throw new ForbiddenException('2FA already enabled');
    }

    await this.emailOTPTokenService.verifyOTP(
      userId,
      emailOTP,
      EmailOTPType.ENABLE_2FA,
    );

    const { base32, otpauth_url } = generateTOTPSecret(user.email);

    await this.repo.user.setTemp2FASecret(userId, encrypt(base32));

    return { otpauthUrl: otpauth_url };
  }

  // ==================================================
  // ✅ ENABLE 2FA
  // ==================================================

  async enable(userId: string, token: string) {
    this.validateOTP(token);

    const user = await this.getUserOrFail(userId);

    if (user.totpEnabled) {
      throw new ForbiddenException('2FA already enabled');
    }

    if (!user.tempTotpSecret) {
      throw new BadRequestException('2FA setup not initialized');
    }

    const tempSecret = decrypt(user.tempTotpSecret);
    const isValid = this.verifyTOTP(token, tempSecret);

    if (!isValid) {
      throw new BadRequestException('Invalid TOTP code');
    }

    const encryptedSecret = encrypt(tempSecret);
    const backupCodes = await this.generateBackupCodes();

    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => bcryptHash(this.normalizeBackupCode(code))),
    );

    await this.prisma.$transaction(async (tx) => {

      // UserRepository methods now accept tx as last argument
      await this.repo.user.enable2FA(userId, encryptedSecret, tx);
      await this.repo.backupTwoFACode.deleteAllByUser(userId,tx);
      await this.repo.backupTwoFACode.createMany(userId, hashedBackupCodes,tx);
      await this.repo.user.bumpTokenVersion(userId, tx);
    });

    return {
      success: true,
      backupCodes,
    };
  }

  // ==================================================
  // 🔐 VERIFY 2FA
  // ==================================================

  async verify(userId: string, token: string): Promise<boolean> {
    this.validate2FACode(token);

    const user = await this.getUserOrFail(userId);

    if (!user.totpEnabled || !user.totpSecret) {
      throw new UnauthorizedException('Invalid authentication state');
    }

    const normalized = this.normalizeBackupCode(token);
    const secret = decrypt(user.totpSecret);

    // TOTP
    const isValidTOTP = this.verifyTOTP(normalized, secret);
    if (isValidTOTP) {
      return true;
    }

    // Backup Code
    const isBackupValid = await this.verifyBackupCode(userId, normalized);
    if (isBackupValid) {
      return true;
    }

    throw new UnauthorizedException('Invalid 2FA code');
  }

  // ==================================================
  // ❌ DISABLE 2FA
  // ==================================================

  async disable(userId: string, totpToken: string, emailOTP: string) {
    this.validateOTP(emailOTP);
    this.validate2FACode(totpToken);

    const user = await this.getUserOrFail(userId);

    if (!user.totpEnabled) {
      throw new ForbiddenException('2FA already disabled');
    }

    await this.emailOTPTokenService.verifyOTP(
      userId,
      emailOTP,
      EmailOTPType.DISABLE_2FA,
    );

    // Verify the TOTP/backup code before proceeding
    await this.verify(userId, totpToken);

    await this.prisma.$transaction(async (tx) => {

      await this.repo.user.disable2FA(userId, tx);
      await  this.repo.backupTwoFACode.deleteAllByUser(userId,tx);
      await this.repo.user.bumpTokenVersion(userId, tx);
    });

    return { success: true };
  }

  // ==================================================
  // 🔄 REGENERATE BACKUP CODES
  // ==================================================

  async regenerateBackupCodes(userId: string, token: string) {
    await this.verify(userId, token);

    const backupCodes = await this.generateBackupCodes();

    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => bcryptHash(this.normalizeBackupCode(code))),
    );

    await this.prisma.$transaction(async (tx) => {

      await  this.repo.backupTwoFACode.deleteAllByUser(userId);
      await  this.repo.backupTwoFACode.createMany(userId, hashedBackupCodes,tx);
      await this.repo.user.bumpTokenVersion(userId, tx);
    });

    return {
      success: true,
      backupCodes,
    };
  }

  // ==================================================
  // 🔍 VERIFY TOTP
  // ==================================================

  private verifyTOTP(token: string, secret: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1,
    });
  }

  // ==================================================
  // 🧾 VERIFY BACKUP CODE
  // ==================================================

  private async verifyBackupCode(userId: string, token: string): Promise<boolean> {
    const codes = await this.repo.backupTwoFACode.findUnusedByUser(userId);

    for (const code of codes) {
      const match = await bcryptCompare(token, code.codeHash);
      if (!match) continue;

      await this.repo.backupTwoFACode.consume(userId, code.codeHash);
      return true;
    }

    return false;
  }

  // ==================================================
  // 🔁 GENERATE BACKUP CODES
  // ==================================================

  private async generateBackupCodes(): Promise<string[]> {
    return Array.from({ length: 10 }).map(() =>
      this.formatBackupCode(crypto.randomBytes(8).toString('hex')),
    );
  }

  // ==================================================
  // 🧩 FORMAT BACKUP CODE
  // ==================================================

  private formatBackupCode(code: string): string {
    return code.match(/.{1,4}/g)?.join('-')!;
  }

  // ==================================================
  // 🧹 NORMALIZE BACKUP CODE
  // ==================================================

  private normalizeBackupCode(code: string): string {
    return code.replace(/-/g, '').toLowerCase();
  }

  // ==================================================
  // ✅ VALIDATE EMAIL OTP
  // ==================================================

  private validateOTP(token: string) {
    if (!token) {
      throw new BadRequestException('OTP token is required');
    }
    if (!/^\d{6}$/.test(token)) {
      throw new BadRequestException('Invalid OTP format');
    }
  }

  // ==================================================
  // ✅ VALIDATE 2FA CODE
  // ==================================================

  private validate2FACode(token: string) {
    if (!token) {
      throw new BadRequestException('2FA token is required');
    }

    const normalized = this.normalizeBackupCode(token);
    const isTOTP = /^\d{6}$/.test(normalized);
    const isBackup = /^[a-f0-9]{16}$/i.test(normalized);

    if (!isTOTP && !isBackup) {
      throw new BadRequestException('Invalid 2FA token format');
    }
  }

  // ==================================================
  // 👤 GET USER
  // ==================================================

  private async getUserOrFail(userId: string) {
    const user = await this.repo.user.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}