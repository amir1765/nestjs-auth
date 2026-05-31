import { Injectable } from '@nestjs/common';
import { Prisma, BackupCode } from '@prisma/client';
import { PrismaService } from './prisma/prisma.service';
import { Prisma as PrismaClient } from '@prisma/client'; // for TransactionClient type


@Injectable()
export class BackupTwoFACodeRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- CREATE ----------
  async createMany(
    userId: string,
    codeHashes: string[],
    tx?: PrismaClient.TransactionClient,
  ): Promise<Prisma.BatchPayload> {
    const db = tx ?? this.prisma;
    return db.backupCode.createMany({
      data: codeHashes.map((hash) => ({
        userId,
        codeHash: hash,
      })),
    });
  }

  // ---------- FIND ----------
  async findByUser(
    userId: string,
    tx?: PrismaClient.TransactionClient,
  ): Promise<BackupCode[]> {
    const db = tx ?? this.prisma;
    return db.backupCode.findMany({
      where: { userId },
    });
  }

  async findUnusedByUser(
    userId: string,
    tx?: PrismaClient.TransactionClient,
  ): Promise<BackupCode[]> {
    const db = tx ?? this.prisma;
    return db.backupCode.findMany({
      where: {
        userId,
        usedAt: null,
      },
    });
  }

  async findByHash(
    userId: string,
    codeHash: string,
    tx?: PrismaClient.TransactionClient,
  ): Promise<BackupCode | null> {
    const db = tx ?? this.prisma;
    return db.backupCode.findUnique({
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
  async consume(
    userId: string,
    codeHash: string,
    tx?: PrismaClient.TransactionClient,
  ): Promise<boolean> {
    const db = tx ?? this.prisma;
    const result = await db.backupCode.updateMany({
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
  async deleteAllByUser(
    userId: string,
    tx?: PrismaClient.TransactionClient,
  ): Promise<Prisma.BatchPayload> {
    const db = tx ?? this.prisma;
    return db.backupCode.deleteMany({
      where: { userId },
    });
  }
}