// token.service.ts

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { RepositoryRegistry } from 'src/repositories/prisma/repository.registry';
import { generateSecureToken, hashToken } from '../../common/crypto';
import { ConfigService } from '@nestjs/config';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from 'src/repositories/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly repo: RepositoryRegistry,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly ctx: RequestContextService,
    private readonly prisma: PrismaService,
  ) {}

  // ===============================
  // 🔐 ISSUE TOKENS
  // ===============================
  async issueTokens(
    userId: string,
    sessionId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const raw = generateSecureToken();
    const hash = hashToken(raw);

    const jti = generateSecureToken(16);

    await this.repo.refreshToken.create(
      {
        session: { connect: { id: sessionId } },
        tokenHash: hash,
        jti,
        expiresAt: this.getRefreshExpiry(),
      },
      tx,
    );

    const accessToken = await this.signAccessToken(userId, sessionId);

    return {
      accessToken,
      refreshToken: raw,
    };
  }

  // ===============================
  // 🔁 ROTATE TOKEN (SAFE)
  // ===============================
  async rotateRefreshToken(rawToken: string) {
    const tokenHash = hashToken(rawToken);

    const { ip, userAgent } = this.ctx.get();

    return this.prisma.$transaction(async (tx) => {
      // Find token
      const token = await tx.refreshToken.findUnique({
        where: {
          tokenHash,
        },
        include: {
          session: true,
          children: true,
        },
      });

      if (!token) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (token.session.isRevoked) {
        throw new UnauthorizedException('Session revoked');
      }

      // Expired
      if (token.expiresAt < new Date()) {
        throw new UnauthorizedException('Token expired');
      }

      // Reuse detection
      if (token.revokedAt) {
        if (token.children.length > 0) {
          await this.handleReuseAttack(token.sessionId);

          await this.audit.tokenReuseDetected({
            userId: token.session.userId,
            sessionId: token.session.id,
            ipAddress: ip,
            userAgent,
          });
        }

        throw new UnauthorizedException('Token already used');
      }

      // ===============================
      // ATOMIC REVOKE
      // ===============================

      const revokeResult = await tx.refreshToken.updateMany({
        where: {
          id: token.id,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      // Another request already used it
      if (revokeResult.count !== 1) {
        throw new UnauthorizedException('Token already used');
      }

      // ===============================
      // CREATE NEW TOKEN
      // ===============================

      const newRaw = generateSecureToken();
      const newHash = hashToken(newRaw);

      await tx.refreshToken.create({
        data: {
          sessionId: token.sessionId,
          tokenHash: newHash,
          jti: generateSecureToken(16),
          parentTokenId: token.id,
          expiresAt: this.getRefreshExpiry(),
        },
      });

      const accessToken = await this.signAccessToken(
        token.session.userId,
        token.sessionId,
      );

      return {
        accessToken,
        refreshToken: newRaw,
      };
    });
  }

  // ===============================
  // 🚨 HANDLE REUSE ATTACK
  // ===============================
  private async handleReuseAttack(sessionId: string) {
    await this.repo.refreshToken.revokeAllBySession(sessionId);
    await this.repo.session.update(sessionId, {
      isRevoked: true,
    });
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
        expiresIn: this.config.get<number>('JWT_ACCESS_EXPIRES') ?? 900,
      },
    );
  }

  private getRefreshExpiry() {
    const days = this.config.get<number>('JWT_REFRESH_EXPIRES') ?? 7;
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }
}
