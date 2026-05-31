import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { Prisma, EmailOTPToken, EmailOTPType } from '@prisma/client';

@Injectable()
export class AuthTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- CREATE ----------
  async create(data: Prisma.EmailOTPTokenCreateInput,): Promise<EmailOTPToken> {
    return this.prisma.emailOTPToken.create({ data });
  }

  // ---------- FIND ----------
  async findByHash(tokenHash: string): Promise<EmailOTPToken | null> {
    return this.prisma.emailOTPToken.findUnique({
      where: { tokenHash },
    });
  }

  async findValidToken(
    userId: string,
    type: EmailOTPType,
  ): Promise<EmailOTPToken | null> {
    return this.prisma.emailOTPToken.findFirst({
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
    const result = await this.prisma.emailOTPToken.updateMany({
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
    type: EmailOTPType,
  ): Promise<Prisma.BatchPayload> {
    return this.prisma.emailOTPToken.deleteMany({
      where: {
        userId,
        type,
      },
    });
  }

  async deleteExpired(): Promise<Prisma.BatchPayload> {
    return this.prisma.emailOTPToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }
}