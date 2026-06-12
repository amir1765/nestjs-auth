import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

import { EmailOTPType } from '@prisma/client';

import { RepositoryRegistry } from '../../repositories/prisma/repository.registry';
import { generateOTP, hashToken } from '../../common/crypto';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { RedisStorageRegistry } from '../../redis/redis-storage.registry';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class EmailOTPTokenService {
  constructor(
    private readonly repo: RepositoryRegistry,
    private readonly redis: RedisStorageRegistry,
    private readonly ctx: RequestContextService,

    @InjectQueue('email')
    private readonly emailQueue: Queue,

  ) {}

  // ===============================
  // ⏳ EXPIRY PER TYPE
  // ===============================
  private getExpiryByType(type: EmailOTPType): Date {
    switch (type) {
      case 'EMAIL_VERIFY':
        return new Date(Date.now() + 15 * 60 * 1000);

      case 'PASSWORD_RESET':
        return new Date(Date.now() + 10 * 60 * 1000);

      case 'LOGIN_VERIFY':
        return new Date(Date.now() + 5 * 60 * 1000);

      case 'MAGIC_LOGIN':
        return new Date(Date.now() + 3 * 60 * 1000);

      case 'ENABLE_2FA':
        return new Date(Date.now() + 5 * 60 * 1000);

      case 'DISABLE_2FA':
        return new Date(Date.now() + 5 * 60 * 1000);

      default:
        return new Date(Date.now() + 10 * 60 * 1000);
    }
  }

  // ===============================
  // 📧 SUBJECT PER TYPE
  // ===============================
  private getSubject(type: EmailOTPType): string {
    switch (type) {
      case 'EMAIL_VERIFY':
        return 'Verify your email';

      case 'PASSWORD_RESET':
        return 'Reset your password';

      case 'LOGIN_VERIFY':
        return 'Verify your login attempt';

      case 'MAGIC_LOGIN':
        return 'Your magic login code';
      case 'ENABLE_2FA':
        return 'your OTP code ';
      case 'DISABLE_2FA':
        return 'your OTP code ';
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
    type: EmailOTPType,
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
    type: EmailOTPType,
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

    await this.emailQueue.add(
      'send-otp-email',
      {
        to: email,
        otp,
        type,
        subject: this.getSubject(type),
      },
      {
        attempts: 5,

        backoff: {
          type: 'exponential',
          delay: 5000,
        },

        removeOnComplete: 1000,
        removeOnFail: 1000,
      },
    );
  }

  // ===============================
  // ✅ VERIFY OTP
  // ===============================
  async verifyOTP(
    userId: string,
    otp: string,
    type: EmailOTPType,
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
