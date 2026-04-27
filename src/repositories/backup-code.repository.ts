import { Injectable } from '@nestjs/common';
import { Prisma, BackupCode } from '@prisma/client';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class BackupCodeRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- CREATE ----------
  async createMany(
    userId: string,
    codeHashes: string[],
  ): Promise<Prisma.BatchPayload> {
    return this.prisma.backupCode.createMany({
      data: codeHashes.map((hash) => ({
        userId,
        codeHash: hash,
      })),
    });
  }

  // ---------- FIND ----------
  async findByUser(userId: string): Promise<BackupCode[]> {
    return this.prisma.backupCode.findMany({
      where: { userId },
    });
  }

  async findUnusedByUser(userId: string): Promise<BackupCode[]> {
    return this.prisma.backupCode.findMany({
      where: {
        userId,
        usedAt: null,
      },
    });
  }

  async findByHash(
    userId: string,
    codeHash: string,
  ): Promise<BackupCode | null> {
    return this.prisma.backupCode.findUnique({
      where: {
        userId_codeHash: {
          userId,
          codeHash,
        },
      },
    });
  }

  // ---------- CONSUME (CRITICAL) ----------
  /**
   * Atomically mark code as used
   */
  async consume(userId: string, codeHash: string): Promise<boolean> {
    const result = await this.prisma.backupCode.updateMany({
      where: {
        userId,
        codeHash,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    return result.count > 0;
  }

  // ---------- DELETE ----------
  async deleteAllByUser(userId: string): Promise<Prisma.BatchPayload> {
    return this.prisma.backupCode.deleteMany({
      where: { userId },
    });
  }
}
