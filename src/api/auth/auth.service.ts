// auth.service.ts

import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';

import { RepositoryRegistry } from 'src/repositories/prisma/repository.registry';
import { Device } from '@prisma/client';
import { TokenService } from './token.service';
import { hashPassword, verifyPassword } from '../../common/crypto';
import { SecurityService } from './security.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly repo: RepositoryRegistry,
    private readonly tokenService: TokenService,
    private readonly securityService: SecurityService,
  ) {}

  // ===============================
  // 🧾 REGISTER
  // ===============================
  async register(email: string, password: string) {
    const exists = await this.repo.user.existsByEmail(email);

    if (exists) {
      throw new ForbiddenException('User already exists');
    }

    const passwordHash = await hashPassword(password);

    const user = await this.repo.user.create({
      email,
      passwordHash,
    });

    return user;
  }

  // ===============================
  // 🔐 LOGIN
  // ===============================
  async login(params: {
    email: string;
    password: string;
    ip: string;
    userAgent?: string;
    fingerprint?: string;
    country?: string;
    city?: string;
    lat?: number;
    lon?: number;
  }) {
    const user = await this.repo.user.findByEmail(params.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    //  account lock check
    if (user.lockUntil && user.lockUntil > new Date()) {
      throw new ForbiddenException('Account locked');
    }

    const isValid = await verifyPassword(
      user.passwordHash,
      params.password,
    );

    if (!isValid) {
      await this.handleFailedLogin(user.id, params);
      throw new UnauthorizedException('Invalid credentials');
    }

    // ✅ reset attempts
    await this.repo.user.resetFailedAttempts(user.id);

    // ✅ update login metadata
    await this.repo.user.updateLastLogin(user.id, params.ip);

    //  DEVICE RESOLUTION
    let device: Device | null = null;

    if (params.fingerprint) {
      device = await this.securityService.resolveDevice({
        userId: user.id,
        fingerprint: params.fingerprint,
        ipAddress: params.ip,
        userAgent: params.userAgent,
        country: params.country,
        city: params.city,
        lat: params.lat,
        lon: params.lon,
      });

      // 🚫 block check
      this.securityService.ensureDeviceAllowed(device);

      // 🧠 RISK EVALUATION
      const risk = this.securityService.evaluateLoginRisk({
        device,
        ipAddress: params.ip,
        userAgent: params.userAgent,
        country: params.country,
      });

      // 🔥 persist risk
      await this.securityService.applyRiskToDevice(
        device.id,
        risk.level,
      );

      // (optional later)
      // if (risk.level === 'HIGH') require 2FA
    }

    // CREATE SESSION

    const session = await this.repo.session.create({
      user: { connect: { id: user.id } },
      device: device ? { connect: { id: device.id } } : undefined,
      ipAddress: params.ip,
      userAgent: params.userAgent,
      expiresAt: this.getSessionExpiry(),
    });


    //  ISSUE TOKENS

    const tokens = await this.tokenService.issueTokens(
      user.id,
      session.id,
    );

    return {
      user,
      ...tokens,
    };
  }

  // ===============================
  // 🔁 REFRESH
  // ===============================
  async refresh(refreshToken: string) {
    return this.tokenService.rotateRefreshToken(refreshToken);
  }

  // ===============================
  // 🚪 LOGOUT (single session)
  // ===============================
  async logout(sessionId: string) {
    await this.repo.refreshToken.revokeAllBySession(sessionId);

    await this.repo.session.revoke(sessionId, 'LOGOUT');
  }

  // ===============================
  // 🚪 LOGOUT ALL
  // ===============================
  async logoutAll(userId: string) {
    const sessions = await this.repo.session.findByUserId(userId);

    for (const s of sessions) {
      await this.repo.refreshToken.revokeAllBySession(s.id);
    }

    await this.repo.session.revokeManyByUser(userId);
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

    if (updated.failedLoginAttempts >= 5) {
      const lockUntil = new Date(Date.now() + 15 * 60 * 1000);

      await this.repo.user.lockAccount(userId, lockUntil);
    }
  }

  // ===============================
  // ⏳ SESSION TTL
  // ===============================
  private getSessionExpiry() {
    const date = new Date();
    date.setDate(date.getDate() + 7); // align with refresh token
    return date;
  }
}