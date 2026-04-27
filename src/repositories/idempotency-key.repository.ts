import { Injectable } from '@nestjs/common';
import { Prisma, IdempotencyKey } from '@prisma/client';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class IdempotencyKeyRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- CREATE ----------
  async create(
    data: Prisma.IdempotencyKeyCreateInput,
  ): Promise<IdempotencyKey> {
    return this.prisma.idempotencyKey.create({ data });
  }

  // ---------- FIND ----------
  async find(userId: string, key: string): Promise<IdempotencyKey | null> {
    return this.prisma.idempotencyKey.findUnique({
      where: {
        userId_key: { userId, key },
      },
    });
  }

  // ---------- GET OR CREATE (CRITICAL) ----------
  async getOrCreate(params: {
    userId: string;
    key: string;
    operation: string;
    expiresAt: Date;
  }): Promise<IdempotencyKey> {
    try {
      return await this.prisma.idempotencyKey.create({
        data: {
          user: { connect: { id: params.userId } },
          key: params.key,
          operation: params.operation,
          expiresAt: params.expiresAt,
          response: {},
        },
      });
    } catch {
      // already exists → return existing
      return this.find(params.userId, params.key) as Promise<IdempotencyKey>;
    }
  }

  // ---------- COMPLETE ----------
  async markSuccess(
    id: string,
    response: Prisma.InputJsonValue,
  ): Promise<IdempotencyKey> {
    return this.prisma.idempotencyKey.update({
      where: { id },
      data: {
        status: 'success',
        response,
      },
    });
  }

  async markError(
    id: string,
    response: Prisma.InputJsonValue,
  ): Promise<IdempotencyKey> {
    return this.prisma.idempotencyKey.update({
      where: { id },
      data: {
        status: 'error',
        response,
      },
    });
  }

  // ---------- CLEANUP ----------
  async deleteExpired(): Promise<Prisma.BatchPayload> {
    return this.prisma.idempotencyKey.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  }
}
