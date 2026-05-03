import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
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
    await this.redis.emailLimit.increment(userId, type, ttlMs, 1);
    // 🔥 delete old tokens of same type
    await this.repo.authToken.deleteByUserAndType(userId, type);
    const { ip, userAgent, fingerprint } = this.ctx.get();


    await this.repo.authToken.create({  user: {
          connect: { id: userId },
        },
      tokenHash,
      type,
      ip,
      userAgent,
      fingerprint,
      expiresAt:expiryDate}

    );

    await this.mailService.sendMail({
      to: email,
      subject: this.getSubject(type),
      html: `<h3>Your OTP code: ${otp}</h3>`,
    });
  }

  // ===============================
  // ✅ VERIFY OTP
  // ===============================
  async verifyOTP(
    userId: string,
    otp: string,
    type: AuthTokenType,
  ): Promise<true|void> {
    const { ip, fingerprint } = this.ctx.get();

    const tokenHash = hashToken(otp);

    const token = await this.repo.authToken.findByHash(tokenHash);


    if (token?.ip !== ip || (token?.fingerprint !== null && token?.fingerprint !== fingerprint)) {
      throw new ForbiddenException('OTP context mismatch');
    }

    if (!token || token.userId !== userId || token.type !== type) {
      throw new BadRequestException('Invalid OTP');
    }

    if (token.usedAt) {
      throw new BadRequestException('OTP already used');
    }

    if (token.expiresAt < new Date()) {
      throw new BadRequestException('OTP expired');
    }

    const consumed = await this.repo.authToken.consume(tokenHash);

    if (!consumed) {
      throw new BadRequestException('OTP already used or invalid');
    }
    await this.redis.emailLimit.reset(userId, type);
    return true;
  }

}