import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { EmailOTPType, Device, LoginAttemptType } from '@prisma/client';

import { hashPassword, verifyPassword } from '../../common/crypto';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { validatePassword } from '../../common/util/validate-password';
import { RedisStorageRegistry } from '../../redis/redis-storage.registry';
import { RepositoryRegistry } from '../../repositories/prisma/repository.registry';

import { AuditService } from './audit.service';
import { SecurityService } from './security.service';
import { TokenService } from './token.service';
import { LoginOutput } from '../../common/interface/auth/registerService';
import { TwoFAService } from '../auth-twofa/twofa.service';
import { PrismaService } from '../../repositories/prisma/prisma.service';
import { EmailOTPTokenService } from '../email-otp-token/email-otp-token.service';

type VerifyType = 'OTP' | 'TOTP';

@Injectable()
export class AuthService {
  constructor(
    private readonly repo: RepositoryRegistry,
    private readonly tokenService: TokenService,
    private readonly securityService: SecurityService,
    private readonly audit: AuditService,
    private readonly redis: RedisStorageRegistry,
    private readonly ctx: RequestContextService,
    private readonly emailOTPTokenService: EmailOTPTokenService,
    private readonly twoFA: TwoFAService,
    private readonly prisma: PrismaService,
  ) {}

  // --------------------------------------------------
  // 🧾 REGISTER
  // --------------------------------------------------
  async register(email: string, password: string) {
    const exists = await this.repo.user.existsByEmail(email);
    if (exists) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!validatePassword(password)) {
      throw new UnauthorizedException('Weak password');
    }

    const passwordHash = await hashPassword(password);
    const user = await this.repo.user.create({ email, passwordHash });

    await this.emailOTPTokenService.sendOTP(
      user.id,
      user.email,
      EmailOTPType.EMAIL_VERIFY,
    );

    return { success: true };
  }

  // --------------------------------------------------
  // 📧 VERIFY EMAIL
  // --------------------------------------------------
  async verifyEmail(userId: string, otp: string) {
    const user = await this.repo.user.findById(userId);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    await this.handleVerifyToken(
      userId,
      user.email,
      otp,
      LoginAttemptType.OTP,
      EmailOTPType.EMAIL_VERIFY,
    );

    await this.repo.user.markEmailVerified(userId);
    return { success: true };
  }

  // --------------------------------------------------
  // 🔐 LOGIN STEP 1
  // --------------------------------------------------
  async login(params: { email: string; password: string }) {
    await this.redis.authLimit.consume(
      `login:${params.email}`,
      'LOGIN',
      this.LIMITS.LOGIN,
    );

    const user = await this.repo.user.findByEmail(params.email);
    const { ip, userAgent } = this.ctx.get();

    if (!user) {
      await this.audit.loginFailure({
        email: params.email,
        ipAddress: ip,
        userAgent,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      throw new ForbiddenException('Account locked');
    }

    const isValid = await verifyPassword(user.passwordHash, params.password);

    if (!isValid) {
      await this.handleFailedAttempt(user.id, {
        email: params.email,
        type: LoginAttemptType.PASSWORD,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.redis.authLimit.reset(
      `login:${params.email}`,
      'LOGIN',
    );
    // ✅ 2FA ENABLED → REQUIRE TOTP
    if (user.totpEnabled) {
      return {
        success: true,
        requires2FA: true,
        userId: user.id,
      };
    }

    // ✅ OTHERWISE SEND OTP
    await this.emailOTPTokenService.sendOTP(
      user.id,
      user.email,
      EmailOTPType.LOGIN_VERIFY,
    );

    return {
      success: true,
      requires2FA: false,
      userId: user.id,
    };
  }

  // --------------------------------------------------
  // 🔐 LOGIN STEP 2 (VERIFY)
  // --------------------------------------------------
  async verifyLogin(
    userId: string,
    token: string,
    verifyType: VerifyType,
  ): Promise<LoginOutput> {
    await this.redis.authLimit.consume(
      `verify-login:${userId}`,
      'VERIFY_LOGIN',
      this.LIMITS.VERIFY,
    );
    const user = await this.repo.user.findById(userId);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    // 🚨 enforce correct method
    if (user.totpEnabled && verifyType !== 'TOTP') {
      throw new ForbiddenException('2FA required');
    }

    try {
      if (verifyType === 'TOTP') {
        await this.twoFA.verify(user.id, token);
      } else {
        await this.handleVerifyToken(
          userId,
          user.email,
          token,
          LoginAttemptType.OTP,
          EmailOTPType.LOGIN_VERIFY,
        );
      }
    } catch (err) {
      await this.handleFailedAttempt(user.id, {
        email: user.email,
        type: LoginAttemptType.OTP,
      });
      throw err;
    }

    const { ip, fingerprint, userAgent } = this.ctx.get();

    if (!user.emailVerified) {
      await this.repo.user.markEmailVerified(userId);
    }

    await this.repo.user.resetFailedAttempts(user.id);
    await this.repo.user.updateLastLogin(user.id, ip);

    // --------------------------------------------------
    // 📱 DEVICE CHECK
    // --------------------------------------------------
    let device: Device | null = null;

    if (fingerprint) {
      device = await this.securityService.resolveDevice({
        userId: user.id,
        fingerprint,
        ipAddress: ip,
        userAgent,
      });

      this.securityService.ensureDeviceAllowed(device);
    }

    const result = await this.prisma.$transaction(
      async (tx) => {
        const session =
          await tx.session.create({
            data: {
              userId: user.id,
              deviceId: device?.id,
              ipAddress: ip,
              userAgent,
              expiresAt: this.getSessionExpiry(), // also absolute expiry
            },
          });
        const tokens = await this.tokenService.issueTokens(
          user.id,
          session.id,
          tx,
        );

        return {
          session,
          tokens,
        };
      },
    );
    await this.audit.loginSuccess({
      userId: user.id,
      sessionId: result.session.id,
      deviceId: device?.id,
      ipAddress: ip,
      userAgent,
    });
    await this.redis.authLimit.reset(
      `verify-login:${userId}`,
      'VERIFY_LOGIN',
    );
    return {
      ...result.tokens,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  // --------------------------------------------------
  // 🔑 PASSWORD RESET REQUEST
  // --------------------------------------------------
  async requestPasswordReset(email: string) {
    const user = await this.repo.user.findByEmail(email);
    if (!user) return { success: true };

    await this.emailOTPTokenService.sendOTP(
      user.id,
      user.email,
      EmailOTPType.PASSWORD_RESET,
    );

    return { success: true };
  }

  // --------------------------------------------------
  // 🔑 RESET PASSWORD
  // --------------------------------------------------
  async resetPassword(userId: string, otp: string, newPassword: string) {
    await this.redis.authLimit.consume(
      `reset-password:${userId}`,
      'VERIFY_RESET_PASSWORD',
      this.LIMITS.RESET_PASSWORD,
    );
    const user = await this.repo.user.findById(userId);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    await this.handleVerifyToken(
      userId,
      user.email,
      otp,
      LoginAttemptType.OTP,
      EmailOTPType.PASSWORD_RESET,
    );

    if (!validatePassword(newPassword)) {
      throw new UnauthorizedException('Weak password');
    }
    const passwordHash = await hashPassword(newPassword);

    await this.repo.user.updatePassword(userId, passwordHash);
    await this.logoutAll(userId);
    await this.redis.authLimit.reset(
      `reset-password:${userId}`,
      'VERIFY_RESET_PASSWORD',
    );
    return { success: true };
  }

  // --------------------------------------------------
  // 🚪 LOGOUT
  // --------------------------------------------------
  async logout(sessionId: string, userId: string, ip?: string) {
    await this.repo.refreshToken.revokeAllBySession(sessionId);
    await this.repo.session.revoke(sessionId, 'LOGOUT');
    await this.redis.sessionStore.del(sessionId);

    await this.audit.logout({
      userId,
      sessionId,
      ipAddress: ip,
    });
  }

  // --------------------------------------------------
  // 🚪 LOGOUT ALL
  // --------------------------------------------------
  async logoutAll(userId: string) {
    const sessions = await this.repo.session.findByUserId(userId);

    await Promise.all(
      sessions.map(async (s) => {
        await this.repo.refreshToken.revokeAllBySession(s.id);
        await this.redis.sessionStore.del(s.id);
      }),
    );

    await this.repo.session.revokeManyByUser(userId);
    await this.audit.logoutAll({ userId });
  }

  // --------------------------------------------------
  // 🔧 HELPERS
  // --------------------------------------------------
  private async handleVerifyToken(
    userId: string,
    email: string,
    token: string,
    attemptType: LoginAttemptType,
    tokenType: EmailOTPType,
  ) {
    try {
      await this.emailOTPTokenService.verifyOTP(userId, token, tokenType);
    } catch (err) {
      await this.handleFailedAttempt(userId, { email, type: attemptType });
      throw err;
    }
  }

  private async handleFailedAttempt(
    userId: string,
    params: { email: string; type: LoginAttemptType },
  ) {
    const { ip, userAgent } = this.ctx.get();

    await this.repo.loginAttempt.create({
      email: params.email,
      ipAddress: ip,
      userAgent,
      type: params.type,
      success: false,
      user: { connect: { id: userId } },
    });

    const updated = await this.repo.user.incrementFailedAttempts(userId);

    if (updated.failedLoginAttempts >= 5) {
      const lockUntil = new Date(Date.now() + 15 * 60 * 1000);

      await this.repo.user.lockAccount(userId, lockUntil);

      await this.audit.suspiciousActivity({
        userId,
        ipAddress: ip,
        reasons: ['Too many failed attempts'],
      });
    }
  }

  private getSessionExpiry(): Date {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date;
  }
  private readonly LIMITS = {
    LOGIN: {
      ttlMs: 15 * 60 * 1000,
      maxAttempts: 5,
    },

    VERIFY: {
      ttlMs: 10 * 60 * 1000,
      maxAttempts: 5,
    },

    RESET_PASSWORD: {
      ttlMs: 10 * 60 * 1000,
      maxAttempts: 5,
    },
  };
}