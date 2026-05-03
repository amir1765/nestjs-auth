import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthTokenType, Device, LoginAttemptType } from '@prisma/client';

import { hashPassword, verifyPassword } from '../../common/crypto';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { validatePassword } from '../../common/util/validate-password';
import { RedisStorageRegistry } from '../../redis/redis-storage.registry';
import { RepositoryRegistry } from '../../repositories/prisma/repository.registry';

import { AuditService } from './audit.service';
import { SecurityService } from './security.service';
import { AuthTokenService } from './token-auth.service';
import { TokenService } from './token.service';
import { LoginOutput } from '../../common/interface/auth/registerService';

@Injectable()
export class AuthService {
  constructor(
    private readonly repo: RepositoryRegistry,
    private readonly tokenService: TokenService,
    private readonly securityService: SecurityService,
    private readonly audit: AuditService,
    private readonly redis: RedisStorageRegistry,
    private readonly ctx: RequestContextService,
    private readonly authTokenService: AuthTokenService,
  ) {}

  // Register
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

    await this.authTokenService.sendOTP(
      user.id,
      user.email,
      AuthTokenType.EMAIL_VERIFY,
    );

    return { success: true };
  }

  // Verify email OTP
  async verifyEmail(userId: string, otp: string) {
    const user = await this.repo.user.findById(userId);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    await this.handleVerifyEmail(
      userId,
      user.email,
      otp,
      LoginAttemptType.OTP,
      AuthTokenType.EMAIL_VERIFY,
    );

    await this.repo.user.markEmailVerified(userId);
    return { success: true };
  }

  // Login (step 1 – request OTP)
  async login(params: { email: string; password: string }) {
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

    await this.authTokenService.sendOTP(
      user.id,
      user.email,
      AuthTokenType.LOGIN_VERIFY,
    );
    return { success: true };
  }

  // Login (step 2 – verify OTP)
  async verifyLoginOTP(userId: string, otp: string):Promise<LoginOutput> {
    const user = await this.repo.user.findById(userId);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    await this.handleVerifyEmail(
      userId,
      user.email,
      otp,
      LoginAttemptType.OTP,
      AuthTokenType.LOGIN_VERIFY,
    );

    const { ip, fingerprint, userAgent } = this.ctx.get();

    await this.repo.user.resetFailedAttempts(user.id);
    await this.repo.user.updateLastLogin(user.id, ip);

    // Device fingerprinting & risk check
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

    // Session creation
    const session = await this.repo.session.create({
      user: { connect: { id: user.id } },
      device: device ? { connect: { id: device.id } } : undefined,
      ipAddress: ip,
      userAgent,
      expiresAt: this.getSessionExpiry(),
    });

    const tokens = await this.tokenService.issueTokens(user.id, session.id);

    await this.audit.loginSuccess({
      userId: user.id,
      sessionId: session.id,
      deviceId: device?.id,
      ipAddress: ip,
      userAgent,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  // Request password reset
  async requestPasswordReset(email: string) {
    const user = await this.repo.user.findByEmail(email);
    if (!user) return { success: true };

    await this.authTokenService.sendOTP(
      user.id,
      user.email,
      AuthTokenType.PASSWORD_RESET,
    );

    return { success: true };
  }

  // Confirm password reset
  async resetPassword(userId: string, otp: string, newPassword: string) {
    const user = await this.repo.user.findById(userId);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    await this.handleVerifyEmail(
      userId,
      user.email,
      otp,
      LoginAttemptType.OTP,
      AuthTokenType.PASSWORD_RESET,
    );

    const passwordHash = await hashPassword(newPassword);
    await this.repo.user.updatePassword(userId, passwordHash);
    await this.logoutAll(userId);

    return { success: true };
  }

  // Logout
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

  // Logout all sessions
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

  // --- Private helpers ---

  private async handleVerifyEmail(
    userId: string,
    email: string,
    otp: string,
    attemptType: LoginAttemptType,
    tokenType: AuthTokenType,
  ) {
    try {
      await this.authTokenService.verifyOTP(userId, otp, tokenType);
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
        reasons: ['Account locked due to too many failed attempts'],
      });
    }
  }

  private getSessionExpiry(): Date {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date;
  }
}