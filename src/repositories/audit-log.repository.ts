import { Injectable } from '@nestjs/common';
import { AuditAction, AuditLog, Prisma } from '@prisma/client';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- CREATE ----------
  async create(data: Prisma.AuditLogCreateInput): Promise<AuditLog> {
    return this.prisma.auditLog.create({
      data,
    });
  }

  // ---------- BULK CREATE (useful for security events) ----------
  async createMany(
    data: Prisma.AuditLogCreateManyInput[],
  ): Promise<Prisma.BatchPayload> {
    return this.prisma.auditLog.createMany({
      data,
    });
  }

  // ---------- FIND BY ID ----------
  async findById(id: string): Promise<AuditLog | null> {
    return this.prisma.auditLog.findUnique({
      where: { id },
    });
  }

  // ---------- FIND ALL (PAGINATED) ----------
  async findAll(params?: {
    skip?: number;
    take?: number;
  }): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      skip: params?.skip,
      take: params?.take,
    });
  }

  // ---------- FIND BY USER ----------
  async findByUser(
    userId: string,
    params?: { skip?: number; take?: number },
  ): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      skip: params?.skip,
      take: params?.take,
    });
  }

  // ---------- FIND BY ACTION ----------
  async findByAction(action: AuditAction): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { action },
      orderBy: { timestamp: 'desc' },
    });
  }

  // ---------- FIND BY USER + ACTION ----------
  async findByUserAndAction(
    userId: string,
    action: AuditAction,
  ): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: {
        userId,
        action,
      },
      orderBy: { timestamp: 'desc' },
    });
  }

  // ---------- FIND BY DATE RANGE ----------
  async findByDateRange(from: Date, to: Date): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: {
        timestamp: {
          gte: from,
          lte: to,
        },
      },
      orderBy: { timestamp: 'desc' },
    });
  }

  // ---------- FIND CRITICAL EVENTS ----------
  async findCritical(): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: {
        severity: 'critical',
      },
      orderBy: { timestamp: 'desc' },
    });
  }

  // ---------- DELETE OLD LOGS (cleanup job) ----------
  async deleteOlderThan(date: Date): Promise<Prisma.BatchPayload> {
    return this.prisma.auditLog.deleteMany({
      where: {
        timestamp: {
          lt: date,
        },
      },
    });
  }

  // ---------- DELETE BY ID ----------
  async delete(id: string): Promise<AuditLog> {
    return this.prisma.auditLog.delete({
      where: { id },
    });
  }
}
