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

@Injectable()
export class TwoFAService {
  constructor(
    private readonly repo: RepositoryRegistry,
    private readonly : RepositoryRegistry,
  ) {}


  // ==================================================
  // 🔑 STEP 1: GENERATE SECRET
  // ==================================================

  async generateSetup(userId: string,OTP:string) {
    const user = await this.getUserOrFail(userId);
//todo: otp shits
    // already enabled
    if (user.totpEnabled) {
      throw new ForbiddenException('2FA already enabled');
    }

    const { base32, otpauth_url } =
      generateTOTPSecret(user.email);

    return {
      tempSecret: base32,
      otpauthUrl: otpauth_url,
    };
  }

  // ==================================================
  // ✅ ENABLE 2FA
  // ==================================================

  async enable(
    userId: string,
    token: string,
    tempSecret: string,
  ) {
    this.validateOTP(token);
    this.validateTempSecret(tempSecret);

    const user = await this.getUserOrFail(userId);

    if (user.totpEnabled) {
      throw new ForbiddenException('2FA already enabled');
    }

    const isValid = this.verifyTOTP(
      token,
      tempSecret,
    );

    if (!isValid) {
      throw new BadRequestException(
        'Invalid TOTP code',
      );
    }

    const encrypted = encrypt(tempSecret);

    await this.repo.user.enable2FA(
      userId,
      encrypted,
    );

    // invalidate all sessions
    await this.repo.user.bumpTokenVersion(
      userId,
    );

    const backupCodes =
      await this.generateBackupCodes(userId);

    return {
      success: true,
      backupCodes,
    };
  }

  // ==================================================
  // 🔍 VERIFY TOTP
  // ==================================================

  private verifyTOTP(
    token: string,
    secret: string,
  ): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1,
    });
  }

  // ==================================================
  // 🔐 VERIFY 2FA
  // ==================================================

  async verify(
    userId: string,
    token: string,
  ): Promise<boolean> {
    this.validateOTP(token);

    const user = await this.getUserOrFail(
      userId,
    );

    if (
      !user.totpEnabled ||
      !user.totpSecret
    ) {
      throw new UnauthorizedException(
        '2FA not enabled',
      );
    }

    const secret = decrypt(user.totpSecret);

    // 1️⃣ TOTP
    const isValidTOTP = this.verifyTOTP(
      token,
      secret,
    );

    if (isValidTOTP) {
      return true;
    }

    // 2️⃣ BACKUP CODE
    const isBackupValid =
      await this.verifyBackupCode(
        userId,
        token,
      );

    if (isBackupValid) {
      return true;
    }

    throw new UnauthorizedException(
      'Invalid 2FA code',
    );
  }

  // ==================================================
  // 🧾 VERIFY BACKUP CODE
  // ==================================================

  private async verifyBackupCode(
    userId: string,
    token: string,
  ): Promise<boolean> {
    const codes =
      await this.repo.backupTwoFACode.findUnusedByUser(
        userId,
      );

    for (const code of codes) {
      const match = await bcryptCompare(
        token,
        code.codeHash,
      );

      if (match) {
        // atomic consume
        await this.repo.backupTwoFACode.consume(
          userId,
          code.codeHash,
        );

        return true;
      }
    }

    return false;
  }

  // ==================================================
  // 🔁 GENERATE BACKUP CODES
  // ==================================================

  private async generateBackupCodes(
    userId: string,
  ): Promise<string[]> {
    const rawCodes = Array.from({
      length: 10,
    }).map(() =>
      crypto.randomBytes(8).toString('hex'),
    );

    const hashed = await Promise.all(
      rawCodes.map((code) =>
        bcryptHash(code),
      ),
    );

    await this.repo.backupTwoFACode.deleteAllByUser(
      userId,
    );

    await this.repo.backupTwoFACode.createMany(
      userId,
      hashed,
    );

    return rawCodes;
  }

  // // ==================================================
  // // 🔄 REGENERATE BACKUP CODES
  // // ==================================================
  //
  // async regenerateBackupCodes(
  //   userId: string,
  // ): Promise<string[]> {
  //   const user = await this.getUserOrFail(
  //     userId,
  //   );
  //
  //   if (!user.totpEnabled) {
  //     throw new ForbiddenException(
  //       '2FA is not enabled',
  //     );
  //   }
  //
  //   return this.generateBackupCodes(userId);
  // }

  // ==================================================
  // ❌ DISABLE 2FA
  // ==================================================

  async disable(
    userId: string,
    token: string,
  ) {
    this.validateOTP(token);

    const user = await this.getUserOrFail(
      userId,
    );

    if (!user.totpEnabled) {
      throw new ForbiddenException(
        '2FA already disabled',
      );
    }

    const isValid = await this.verify(
      userId,
      token,
    );

    if (!isValid) {
      throw new UnauthorizedException(
        'Invalid 2FA',
      );
    }

    await this.repo.user.disable2FA(userId);

    await this.repo.backupTwoFACode.deleteAllByUser(
      userId,
    );

    await this.repo.user.bumpTokenVersion(
      userId,
    );

    return {
      success: true,
    };
  }
  // ==================================================
  // VALIDATORS
  // ==================================================

  private validateOTP(token: string) {
    if (!token) {
      throw new BadRequestException('OTP token is required');
    }

    // 6 digits only
    if (!/^\d{6}$/.test(token)) {
      throw new BadRequestException('Invalid OTP format');
    }
  }

  private validateTempSecret(secret: string) {
    if (!secret) {
      throw new BadRequestException('Temp secret is required');
    }

    // base32 validation
    if (!/^[A-Z2-7]+=*$/i.test(secret)) {
      throw new BadRequestException('Invalid secret format');
    }

    if (secret.length < 16) {
      throw new BadRequestException('Secret too short');
    }
  }

  private async getUserOrFail(userId: string) {
    const user = await this.repo.user.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

}