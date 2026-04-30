import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';

import { RepositoryRegistry } from 'src/repositories/prisma/repository.registry';
import { Device } from '@prisma/client';
import { TokenService } from './token.service';
import { SecurityService } from './security.service';
import { AuditService } from './audit.service';
import { hashPassword, verifyPassword } from '../../common/crypto';
import {  RegisterOutput ,LoginOutput} from '../../common/interface/auth/registerService';
import { RedisStorageRegistry } from '../../redis/redis-storage.registry';
import { RequestContextService } from '../../common/request-context/request-context.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly repo: RepositoryRegistry,
    private readonly tokenService: TokenService,
    private readonly securityService: SecurityService,
    private readonly audit: AuditService,
    private readonly redis: RedisStorageRegistry,
    private readonly ctx: RequestContextService,
  ) {}

  // ===============================
  // 🧾 REGISTER
  // ===============================
  async register(email:string, password:string): Promise<RegisterOutput>  {
    const exists = await this.repo.user.existsByEmail(email);

    if (exists) {
      throw new ForbiddenException('User already exists');
    }

    const passwordHash = await hashPassword(password);

    const user = await this.repo.user.create({
      email,
      passwordHash,
    });

    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl
    };
  }

  // ===============================
  // 🔐 LOGIN
  // ===============================
  async login(params: {
    email: string;
    password: string;
    country?: string;
    city?: string;
    lat?: number;
    lon?: number;
  }): Promise<LoginOutput>  {
    const user = await this.repo.user.findByEmail(params.email);
    const { ip, userAgent, fingerprint } = this.ctx.get();

    // ❌ USER NOT FOUND
    if (!user) {
      await this.audit.loginFailure({
        email: params.email,
        ipAddress: ip,
        userAgent: userAgent,
      });

      throw new UnauthorizedException('Invalid credentials');
    }

    // 🚫 ACCOUNT LOCKED
    if (user.lockUntil && user.lockUntil > new Date()) {
      await this.audit.suspiciousActivity({
        userId: user.id,
        ipAddress: ip,
        reasons: ['Login attempt while account locked'],
      });

      throw new ForbiddenException('Account locked');
    }

    const isValid = await verifyPassword(
      user.passwordHash,
      params.password,
    );

    // ❌ WRONG PASSWORD
    if (!isValid) {
      await this.handleFailedLogin(user.id, {email: params.email ,ip: ip, userAgent: userAgent});

      await this.audit.loginFailure({
        userId: user.id,
        email: params.email,
        ipAddress: ip,
        userAgent: userAgent,
      });

      throw new UnauthorizedException('Invalid credentials');
    }

    // ✅ RESET FAILED ATTEMPTS
    await this.repo.user.resetFailedAttempts(user.id);

    // ✅ UPDATE LAST LOGIN
    await this.repo.user.updateLastLogin(user.id, ip);

    // ===============================
    // 📱 DEVICE RESOLUTION
    // ===============================
    let device: Device | null = null;

    if (fingerprint) {
      device = await this.securityService.resolveDevice({
        userId: user.id,
        fingerprint: fingerprint,
        ipAddress: ip,
        userAgent: userAgent,
        country: params.country,
        city: params.city,
        lat: params.lat,
        lon: params.lon,
      });

      // 🚫 BLOCK CHECK
      this.securityService.ensureDeviceAllowed(device);

      // 🧠 RISK EVALUATION
      const risk = this.securityService.evaluateLoginRisk({
        device,
        ipAddress: ip,
        userAgent: userAgent,
        country: params.country,
      });

      // 🔥 APPLY RISK
      await this.securityService.applyRiskToDevice(
        device.id,
        risk.level,
      );

      // 🚨 HIGH RISK DETECTED
      if (risk.level === 'HIGH') {
        await this.audit.suspiciousActivity({
          userId: user.id,
          deviceId: device.id,
          ipAddress: ip,
          reasons: risk.reasons || ['High risk login detected'],
        });
      }
    }

    // ===============================
    // 🧾 CREATE SESSION
    // ===============================
    const session = await this.repo.session.create({
      user: { connect: { id: user.id } },
      device: device ? { connect: { id: device.id } } : undefined,
      ipAddress: ip,
      userAgent: userAgent,
      expiresAt: this.getSessionExpiry(),
    });

    // ===============================
    // 🔑 ISSUE TOKENS
    // ===============================
    const tokens = await this.tokenService.issueTokens(
      user.id,
      session.id,
    );

    // ✅ SUCCESS LOGIN AUDIT
    await this.audit.loginSuccess({
      userId: user.id,
      sessionId: session.id,
      deviceId: device?.id,
      ipAddress: ip,
      userAgent: userAgent,
    });

    return {
      ...tokens,
      user:{
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl
      },

    };
  }

  // ===============================
  // 🔁 REFRESH TOKEN
  // ===============================
  async refresh(refreshToken: string) {
    const result = await this.tokenService.rotateRefreshToken(refreshToken);
    return result;
  }

  // ===============================
  // 🚪 LOGOUT (single session)
  // ===============================
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

  // ===============================
  // 🚪 LOGOUT ALL
  // ===============================
  async logoutAll(userId: string) {
    const sessions = await this.repo.session.findByUserId(userId);

    for (const s of sessions) {
      await this.repo.refreshToken.revokeAllBySession(s.id);
      await this.redis.sessionStore.del(s.id);
    }

    await this.repo.session.revokeManyByUser(userId);
    await this.audit.logoutAll({ userId });
  }

  // ===============================
  // 🚨 FAILED LOGIN HANDLER
  // ===============================
  private async handleFailedLogin(
    userId: string,
    params: { email: string; ip: string; userAgent?: string },
  ) {
    await this.repo.loginAttempt.create({
      email: params.email,
      ipAddress: params.ip,
      userAgent: params.userAgent,
      success: false,
      user: { connect: { id: userId } },
    });

    const updated = await this.repo.user.incrementFailedAttempts(userId);

    // 🚨 LOCK ACCOUNT
    if (updated.failedLoginAttempts >= 5) {
      const lockUntil = new Date(Date.now() + 15 * 60 * 1000);

      await this.repo.user.lockAccount(userId, lockUntil);

      await this.audit.suspiciousActivity({
        userId,
        ipAddress: params.ip,
        reasons: ['Account locked due to too many failed attempts'],
      });
    }
  }

  // ===============================
  // ⏳ SESSION TTL
  // ===============================
  private getSessionExpiry() {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date;
  }
}