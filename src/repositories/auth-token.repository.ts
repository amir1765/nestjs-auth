import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { Prisma, AuthToken, AuthTokenType } from '@prisma/client';

@Injectable()
export class AuthTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- CREATE ----------
  async create(data: Prisma.AuthTokenCreateInput,): Promise<AuthToken> {
    return this.prisma.authToken.create({ data });
  }

  // ---------- FIND ----------
  async findByHash(tokenHash: string): Promise<AuthToken | null> {
    return this.prisma.authToken.findUnique({
      where: { tokenHash },
    });
  }

  async findValidToken(
    userId: string,
    type: AuthTokenType,
  ): Promise<AuthToken | null> {
    return this.prisma.authToken.findFirst({
      where: {
        userId,
        type,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // ---------- CONSUME (CRITICAL) ----------
  async consume(tokenHash: string): Promise<boolean> {
    const result = await this.prisma.authToken.updateMany({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      data: {
        usedAt: new Date(),
      },
    });

    return result.count > 0;
  }

  // ---------- DELETE ----------
  async deleteByUserAndType(
    userId: string,
    type: AuthTokenType,
  ): Promise<Prisma.BatchPayload> {
    return this.prisma.authToken.deleteMany({
      where: {
        userId,
        type,
      },
    });
  }

  async deleteExpired(): Promise<Prisma.BatchPayload> {
    return this.prisma.authToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }
}