// token.service.ts

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { RepositoryRegistry } from 'src/repositories/prisma/repository.registry';
import { generateSecureToken, hashToken } from '../../common/crypto';
import { ConfigService } from '@nestjs/config';


@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly repo: RepositoryRegistry,
    private readonly config: ConfigService,
  ) {}

  // ===============================
  // 🔐 ISSUE TOKENS
  // ===============================
  async issueTokens(userId: string, sessionId: string) {
    const raw = generateSecureToken();
    const hash = hashToken(raw);

    const jti = generateSecureToken(16);

    await this.repo.refreshToken.create({
      session: { connect: { id: sessionId } },
      tokenHash: hash,
      jti,
      expiresAt: this.getRefreshExpiry(),
    });
    console.log("wrt");
    const accessToken = await this.signAccessToken(userId, sessionId);

    return {
      accessToken,
      refreshToken: raw,
    };
  }

  // ===============================
  // 🔁 ROTATE TOKEN
  // ===============================
  async rotateRefreshToken(rawToken: string) {
    const tokenHash = hashToken(rawToken);

    const token = await this.repo.refreshToken.findByTokenHash(tokenHash);

    if (!token) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const fullToken = await this.repo.refreshToken.findWithChain(token.id);

    if (!fullToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // ===============================
    // 🚨 REUSE DETECTION
    // ===============================
    if (fullToken.revokedAt) {
      if (fullToken.children.length > 0) {
        // 🔥 ATTACK DETECTED
        await this.handleReuseAttack(fullToken.sessionId);
      }

      throw new UnauthorizedException('Token already used');
    }

    if (fullToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Token expired');
    }

    // ===============================
    // 🔒 REVOKE CURRENT TOKEN
    // ===============================
    await this.repo.refreshToken.revoke(fullToken.id);

    // ===============================
    // 🔁 CREATE NEW TOKEN (CHAIN)
    // ===============================
    const newRaw = generateSecureToken();
    const newHash = hashToken(newRaw);

    await this.repo.refreshToken.createRotatedToken({
      sessionId: fullToken.sessionId,
      tokenHash: newHash,
      jti: generateSecureToken(16),
      parentTokenId: fullToken.id,
      expiresAt: this.getRefreshExpiry(),
    });

    const accessToken = await this.signAccessToken(
      fullToken.session.userId,
      fullToken.sessionId,
    );

    return {
      accessToken,
      refreshToken: newRaw,
    };
  }

  // ===============================
  // 🚨 HANDLE REUSE ATTACK
  // ===============================
  private async handleReuseAttack(sessionId: string) {
    // revoke all tokens
    await this.repo.refreshToken.revokeAllBySession(sessionId);

    // revoke session
    await this.repo.session.update(sessionId, {
      isRevoked: true,
    });

    // (optional later)
    // - log audit
    // - notify user
  }

  // ===============================
  // 🔐 ACCESS TOKEN
  // ===============================
  private async signAccessToken(userId: string, sessionId: string) {
    return this.jwt.signAsync(
      {
        sub: userId,
        sid: sessionId,
        jti: generateSecureToken(16),
      },
      {
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES')
      },
    );
  }

  private getRefreshExpiry() {
    const days = this.config.get<number>('JWT_REFRESH_EXPIRES') ?? 7; // fallback to 7 days
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }
}