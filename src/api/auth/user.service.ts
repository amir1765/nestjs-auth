import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { RepositoryRegistry } from 'src/repositories/prisma/repository.registry'; // adjust the path

import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';

@Injectable()
export class UserService {
  constructor(private readonly repo: RepositoryRegistry) {}

  // ----------------------------------------------------------------
  // PASSWORD HELPERS
  // ----------------------------------------------------------------
  private async hashPassword(plain: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(plain, saltRounds);
  }

  private async verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  // ----------------------------------------------------------------
  // CRUD – CREATE / REGISTER
  // ----------------------------------------------------------------
  async register(
    email: string,
    password: string,
    fullName?: string,
  ): Promise<User> {
    const exists = await this.repo.user.existsByEmail(email);
    if (exists) {
      throw new ConflictException('Email already registered');
    }

    const hashed = await this.hashPassword(password);

    const newUser = await this.repo.user.create({
      email,
      passwordHash: hashed,
      fullName,
    });

    return newUser;
  }

  // ----------------------------------------------------------------
  // CRUD – READ
  // ----------------------------------------------------------------
  async findById(id: string): Promise<User | null> {
    return this.repo.user.findById(id);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.user.findByEmail(email);
  }

  // ----------------------------------------------------------------
  // PROFILE UPDATE
  // ----------------------------------------------------------------
  async updateProfile(
    userId: string,
    data: { fullName?: string; avatarUrl?: string },
  ): Promise<User> {
    return this.repo.user.update(userId, data);
  }

  // ----------------------------------------------------------------
  // PASSWORD CHANGE
  // ----------------------------------------------------------------
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.repo.user.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    const valid = await this.verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const newHash = await this.hashPassword(newPassword);
    await this.repo.user.update(userId, { passwordHash: newHash });

    // Invalidate all existing sessions/tokens
    await this.repo.user.bumpTokenVersion(userId);
  }

  // ----------------------------------------------------------------
  // LOGIN / CREDENTIAL VALIDATION
  // ----------------------------------------------------------------
  async validateCredentials(
    email: string,
    password: string,
    ipAddress?: string,
  ): Promise<User | null> {
    const user = await this.repo.user.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check account lock
    if (user.lockUntil && user.lockUntil > new Date()) {
      throw new ForbiddenException(
        `Account locked until ${user.lockUntil.toISOString()}`,
      );
    }

    const valid = await this.verifyPassword(password, user.passwordHash);
    if (!valid) {
      const updatedUser = await this.repo.user.incrementFailedAttempts(user.id);

      if (updatedUser.failedLoginAttempts >= 5) {
        const lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        await this.repo.user.lockAccount(user.id, lockUntil);
        throw new ForbiddenException(
          'Account locked due to too many failed login attempts',
        );
      }

      throw new UnauthorizedException('Invalid email or password');
    }

    // Successful login
    await this.repo.user.resetFailedAttempts(user.id);
    if (ipAddress) {
      await this.repo.user.updateLastLogin(user.id, ipAddress);
    } else {
      await this.repo.user.updateLastLogin(user.id, '');
    }

    return this.repo.user.findById(user.id);
  }

  // ----------------------------------------------------------------
  // 2FA MANAGEMENT
  // ----------------------------------------------------------------
  async generateTwoFactorSecret(
    userId: string,
  ): Promise<{ secret: string; otpauthUrl: string }> {
    const user = await this.repo.user.findById(userId);
    if (!user) throw new BadRequestException('User not found');

    const secret = speakeasy.generateSecret({ name: `MyApp (${user.email})` });

    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url!,
    };
  }

  async enableTwoFactor(
    userId: string,
    token: string,
    tempSecret: string,
  ): Promise<void> {
    const verified = speakeasy.totp.verify({
      secret: tempSecret,
      encoding: 'base32',
      token,
    });

    if (!verified) {
      throw new BadRequestException('Invalid 2FA token');
    }

    // Encrypt the secret before storing (replace with real encryption)
    const encryptedSecret = Buffer.from(tempSecret).toString('base64');
    await this.repo.user.enable2FA(userId, encryptedSecret);
  }

  async verifyTwoFactorToken(userId: string, token: string): Promise<boolean> {
    const user = await this.repo.user.findById(userId);
    if (!user || !user.totpEnabled || !user.totpSecret) {
      return false;
    }

    const secret = Buffer.from(user.totpSecret, 'base64').toString('utf-8');
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1,
    });
  }

  async disableTwoFactor(userId: string): Promise<void> {
    await this.repo.user.disable2FA(userId);
  }

  // ----------------------------------------------------------------
  // ACCOUNT LOCK / UNLOCK
  // ----------------------------------------------------------------
  async lockAccount(userId: string, lockUntil: Date): Promise<User> {
    return this.repo.user.lockAccount(userId, lockUntil);
  }

  async unlockAccount(userId: string): Promise<User> {
    return this.repo.user.resetFailedAttempts(userId);
  }

  // ----------------------------------------------------------------
  // SESSION INVALIDATION
  // ----------------------------------------------------------------
  async invalidateUserSessions(userId: string): Promise<User> {
    return this.repo.user.bumpTokenVersion(userId);
  }

  // ----------------------------------------------------------------
  // DELETE
  // ----------------------------------------------------------------
  async deleteUser(userId: string): Promise<User> {
    return this.repo.user.delete(userId);
  }
}
