import { Injectable } from '@nestjs/common';
import { Prisma, RequestNonce } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RequestNonceRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- CREATE ----------
  async create(data: Prisma.RequestNonceCreateInput): Promise<RequestNonce> {
    return this.prisma.requestNonce.create({
      data,
    });
  }

  // ---------- FIND BY NONCE ----------
  async findByNonce(nonce: string): Promise<RequestNonce | null> {
    return this.prisma.requestNonce.findUnique({
      where: { nonce },
    });
  }

  // ---------- CHECK IF EXISTS (helper for guards) ----------
  async exists(nonce: string): Promise<boolean> {
    const record = await this.prisma.requestNonce.findUnique({
      where: { nonce },
      select: { id: true },
    });

    return !!record;
  }

  // ---------- CONSUME NONCE (atomic anti-replay) ----------
  async consume(nonce: string, expiresAt: Date): Promise<RequestNonce> {
    return this.prisma.requestNonce.upsert({
      where: { nonce },
      update: {
        // if reused, we still update timestamp (useful for detection)
        timestamp: new Date(),
      },
      create: {
        nonce,
        expiresAt,
      },
    });
  }

  // ---------- DELETE BY NONCE ----------
  async delete(nonce: string): Promise<RequestNonce> {
    return this.prisma.requestNonce.delete({
      where: { nonce },
    });
  }

  // ---------- DELETE EXPIRED NONCES (cleanup job) ----------
  async deleteExpired(): Promise<Prisma.BatchPayload> {
    return this.prisma.requestNonce.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }

  // ---------- BULK CREATE (rare but useful for testing/import) ----------
  async createMany(
    data: Prisma.RequestNonceCreateManyInput[],
  ): Promise<Prisma.BatchPayload> {
    return this.prisma.requestNonce.createMany({
      data,
      skipDuplicates: true,
    });
  }
}
