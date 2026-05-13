import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

import { AuthTokenType } from '@prisma/client';

import { MailService } from 'src/common/mail/mail.service';
import { RepositoryRegistry } from '../../repositories/prisma/repository.registry';
import { generateOTP, hashToken } from '../../common/crypto';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { RedisStorageRegistry } from '../../redis/redis-storage.registry';

@Injectable()
export class AuthTokenService {
  constructor(
    private readonly repo: RepositoryRegistry,
    private readonly mailService: MailService,
    private readonly redis: RedisStorageRegistry,
    private readonly ctx: RequestContextService,
  ) {}

  // ===============================
  // ⏳ EXPIRY PER TYPE
  // ===============================
  private getExpiryByType(type: AuthTokenType): Date {
    switch (type) {
      case 'EMAIL_VERIFY':
        return new Date(Date.now() + 15 * 60 * 1000);

      case 'PASSWORD_RESET':
        return new Date(Date.now() + 10 * 60 * 1000);

      case 'LOGIN_VERIFY':
        return new Date(Date.now() + 5 * 60 * 1000);

      case 'MAGIC_LOGIN':
        return new Date(Date.now() + 3 * 60 * 1000);

      default:
        return new Date(Date.now() + 10 * 60 * 1000);
    }
  }

  // ===============================
  // 📧 SUBJECT PER TYPE
  // ===============================
  private getSubject(type: AuthTokenType): string {
    switch (type) {
      case 'EMAIL_VERIFY':
        return 'Verify your email';

      case 'PASSWORD_RESET':
        return 'Reset your password';

      case 'LOGIN_VERIFY':
        return 'Verify your login attempt';

      case 'MAGIC_LOGIN':
        return 'Your magic login code';

      default:
        return 'Your verification code';
    }
  }

  // ===============================
  // 🔒 VERIFY BRUTE FORCE PROTECTION
  // ===============================
  private async checkVerifyRateLimit(
    userId: string,
    ip: string,
    type: AuthTokenType,
  ) {
    // per-user limit
    await this.redis.otpVerifyLimit.increment(
      `user:${userId}:${type}`,
      600, // 10 min
      10,
    );

    // per-ip limit
    await this.redis.otpVerifyLimit.increment(`ip:${ip}:${type}`, 600, 30);
  }

  // ===============================
  // 📤 SEND OTP
  // ===============================
  async sendOTP(
    userId: string,
    email: string,
    type: AuthTokenType,
  ): Promise<void> {
    const otp = generateOTP();

    const tokenHash = hashToken(otp);

    const expiryDate = this.getExpiryByType(type);

    const ttlMs = expiryDate.getTime() - Date.now();

    // send rate limit
    await this.redis.emailLimit.increment(userId, type, ttlMs, 5);

    // delete old tokens of same type
    await this.repo.authToken.deleteByUserAndType(userId, type);

    const { ip, userAgent, fingerprint } = this.ctx.get();

    await this.repo.authToken.create({
      user: {
        connect: { id: userId },
      },

      tokenHash,
      type,
      ip,
      userAgent,
      fingerprint,
      expiresAt: expiryDate,
    });

    await this.mailService.sendMail({
      to: email,
      subject: this.getSubject(type),
      html: `
        <div>
          <h2>Your verification code</h2>
          <p>${otp}</p>
        </div>
      `,
    });
  }

  // ===============================
  // ✅ VERIFY OTP
  // ===============================
  async verifyOTP(
    userId: string,
    otp: string,
    type: AuthTokenType,
  ): Promise<true> {
    const { ip, fingerprint } = this.ctx.get();

    // brute-force protection
    await this.checkVerifyRateLimit(userId, ip, type);

    const tokenHash = hashToken(otp);

    const token = await this.repo.authToken.findValidToken(userId, type);

    if (!token) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // compare hash manually
    if (token.tokenHash !== tokenHash) {
      throw new BadRequestException('Invalid OTP');
    }

    // context validation
    if (
      token.ip !== ip ||
      (token.fingerprint !== null && token.fingerprint !== fingerprint)
    ) {
      throw new ForbiddenException('OTP context mismatch');
    }

    // atomic consume
    const consumed = await this.repo.authToken.consume(tokenHash);

    if (!consumed) {
      throw new BadRequestException('OTP already used or expired');
    }

    // reset limits after success
    await this.redis.emailLimit.reset(userId, type);

    await this.redis.otpVerifyLimit.reset(`user:${userId}:${type}`);

    await this.redis.otpVerifyLimit.reset(`ip:${ip}:${type}`);

    return true;
  }
}
