import { Injectable } from '@nestjs/common';
import { Prisma, RefreshToken } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- CREATE ----------
  async create(data: Prisma.RefreshTokenCreateInput): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({ data });
  }

  /**
   * Create a rotated token (child of previous)
   */
  async createRotatedToken(params: {
    sessionId: string;
    tokenHash: string;
    jti: string;
    expiresAt: Date;
    parentTokenId: string;
  }): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({
      data: {
        session: { connect: { id: params.sessionId } },
        tokenHash: params.tokenHash,
        jti: params.jti,
        expiresAt: params.expiresAt,
        parentToken: {
          connect: { id: params.parentTokenId },
        },
      },
    });
  }

  // ---------- FIND ----------
  async findById(
    id: string,
    args?: Prisma.RefreshTokenFindUniqueArgs,
  ): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findUnique({
      where: { id },
      ...args,
    });
  }

  async findByJti(jti: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findUnique({
      where: { jti },
    });
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
  }

  async findActiveByHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async findBySession(sessionId: string): Promise<RefreshToken[]> {
    return this.prisma.refreshToken.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ---------- ROTATION / SECURITY ----------
  /**
   * Revoke a token (used or compromised)
   */
  async revoke(id: string, date: Date = new Date()): Promise<RefreshToken> {
    return this.prisma.refreshToken.update({
      where: { id },
      data: {
        revokedAt: date,
      },
    });
  }

  /**
   * Revoke all tokens in a session (critical for reuse detection)
   */
  async revokeAllBySession(sessionId: string): Promise<Prisma.BatchPayload> {
    return this.prisma.refreshToken.updateMany({
      where: {
        sessionId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  /**
   * Detect reuse: token already revoked but used again
   */
  async isReuseDetected(tokenHash: string): Promise<boolean> {
    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!token) return false;

    return token.revokedAt !== null;
  }

  /**
   * Get token with its chain (parent + children)
   */
  async findWithChain(id: string): Promise<Prisma.RefreshTokenGetPayload<{
    include: {
      parentToken: true;
      children: true;
      session: true;
    };
  }> | null> {
    return this.prisma.refreshToken.findUnique({
      where: { id },
      include: {
        parentToken: true,
        children: true,
        session: true,
      },
    });
  }

  /**
   * Revoke entire chain (used in compromise scenarios)
   */
  async revokeChain(rootTokenId: string): Promise<void> {
    const tokens = await this.prisma.refreshToken.findMany({
      where: {
        OR: [{ id: rootTokenId }, { parentTokenId: rootTokenId }],
      },
      select: { id: true },
    });

    const ids = tokens.map((t) => t.id);

    if (!ids.length) return;

    await this.prisma.refreshToken.updateMany({
      where: {
        id: { in: ids },
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  // ---------- DELETE ----------
  async delete(id: string): Promise<RefreshToken> {
    return this.prisma.refreshToken.delete({
      where: { id },
    });
  }

  async deleteExpired(): Promise<Prisma.BatchPayload> {
    return this.prisma.refreshToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  }

  // ---------- EXISTS ----------
  async existsActive(tokenHash: string): Promise<boolean> {
    const count = await this.prisma.refreshToken.count({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    return count > 0;
  }

  // ---------- PAGINATION ----------
  async findPaginated(
    args: Prisma.RefreshTokenFindManyArgs,
  ): Promise<{ data: RefreshToken[]; total: number }> {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.refreshToken.findMany(args),
      this.prisma.refreshToken.count({ where: args.where }),
    ]);

    return { data, total };
  }
}
