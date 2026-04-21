import { Injectable } from '@nestjs/common';
import { Prisma, RateLimitBucket } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RateLimitBucketRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- CREATE OR UPDATE BUCKET ----------
  async upsert(
    key: string,
    data: Prisma.RateLimitBucketCreateInput,
  ): Promise<RateLimitBucket> {
    return this.prisma.rateLimitBucket.upsert({
      where: { key },
      update: {
        points: data.points,
        expireAt: data.expireAt,
      },
      create: {
        key,
        points: data.points,
        expireAt: data.expireAt,
      },
    });
  }

  // ---------- FIND BY KEY ----------
  async findByKey(key: string): Promise<RateLimitBucket | null> {
    return this.prisma.rateLimitBucket.findUnique({
      where: { key },
    });
  }

  // ---------- INCREMENT POINTS ----------
  async increment(key: string, amount = 1): Promise<RateLimitBucket> {
    return this.prisma.rateLimitBucket.upsert({
      where: { key },
      update: {
        points: {
          increment: amount,
        },
      },
      create: {
        key,
        points: amount,
        expireAt: new Date(Date.now() + 60 * 1000), // default 1 min window
      },
    });
  }

  // ---------- RESET BUCKET ----------
  async reset(key: string): Promise<RateLimitBucket> {
    return this.prisma.rateLimitBucket.update({
      where: { key },
      data: {
        points: 0,
      },
    });
  }

  // ---------- DELETE EXPIRED BUCKETS ----------
  async deleteExpired(): Promise<Prisma.BatchPayload> {
    return this.prisma.rateLimitBucket.deleteMany({
      where: {
        expireAt: {
          lt: new Date(),
        },
      },
    });
  }

  // ---------- DELETE ----------
  async delete(key: string): Promise<RateLimitBucket> {
    return this.prisma.rateLimitBucket.delete({
      where: { key },
    });
  }
}
