import { Injectable } from '@nestjs/common';
import { LoginAttempt, Prisma } from '@prisma/client';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class LoginAttemptRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- CREATE ----------
  async create(data: Prisma.LoginAttemptCreateInput): Promise<LoginAttempt> {
    return this.prisma.loginAttempt.create({
      data,
    });
  }

  // ---------- BULK CREATE (useful for logging batch events) ----------
  async createMany(
    data: Prisma.LoginAttemptCreateManyInput[],
  ): Promise<Prisma.BatchPayload> {
    return this.prisma.loginAttempt.createMany({
      data,
    });
  }

  // ---------- FIND BY ID ----------
  async findById(id: string): Promise<LoginAttempt | null> {
    return this.prisma.loginAttempt.findUnique({
      where: { id },
    });
  }

  // ---------- FIND ALL (PAGINATED) ----------
  async findAll(params?: {
    skip?: number;
    take?: number;
  }): Promise<LoginAttempt[]> {
    return this.prisma.loginAttempt.findMany({
      orderBy: { timestamp: 'desc' },
      skip: params?.skip,
      take: params?.take,
    });
  }

  // ---------- FIND BY EMAIL ----------
  async findByEmail(email: string): Promise<LoginAttempt[]> {
    return this.prisma.loginAttempt.findMany({
      where: { email },
      orderBy: { timestamp: 'desc' },
    });
  }

  // ---------- FIND BY USER ----------
  async findByUser(userId: string): Promise<LoginAttempt[]> {
    return this.prisma.loginAttempt.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
    });
  }

  // ---------- FIND BY IP ----------
  async findByIp(ipAddress: string): Promise<LoginAttempt[]> {
    return this.prisma.loginAttempt.findMany({
      where: { ipAddress },
      orderBy: { timestamp: 'desc' },
    });
  }

  // ---------- FIND FAILED ATTEMPTS ----------
  async findFailed(params?: {
    email?: string;
    ipAddress?: string;
  }): Promise<LoginAttempt[]> {
    return this.prisma.loginAttempt.findMany({
      where: {
        success: false,
        email: params?.email,
        ipAddress: params?.ipAddress,
      },
      orderBy: { timestamp: 'desc' },
    });
  }

  // ---------- FIND SUCCESSFUL ATTEMPTS ----------
  async findSuccessful(email?: string): Promise<LoginAttempt[]> {
    return this.prisma.loginAttempt.findMany({
      where: {
        success: true,
        email,
      },
      orderBy: { timestamp: 'desc' },
    });
  }

  // ---------- COUNT FAILED BY IP (brute force detection helper) ----------
  async countFailedByIp(ipAddress: string, since: Date): Promise<number> {
    return this.prisma.loginAttempt.count({
      where: {
        ipAddress,
        success: false,
        timestamp: {
          gte: since,
        },
      },
    });
  }

  // ---------- COUNT FAILED BY EMAIL ----------
  async countFailedByEmail(email: string, since: Date): Promise<number> {
    return this.prisma.loginAttempt.count({
      where: {
        email,
        success: false,
        timestamp: {
          gte: since,
        },
      },
    });
  }

  // ---------- DELETE OLD ATTEMPTS (cleanup job) ----------
  async deleteOlderThan(date: Date): Promise<Prisma.BatchPayload> {
    return this.prisma.loginAttempt.deleteMany({
      where: {
        timestamp: {
          lt: date,
        },
      },
    });
  }

  // ---------- DELETE BY ID ----------
  async delete(id: string): Promise<LoginAttempt> {
    return this.prisma.loginAttempt.delete({
      where: { id },
    });
  }
}
