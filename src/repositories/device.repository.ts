import { Injectable } from '@nestjs/common';
import { Prisma, Device, DeviceRiskLevel } from '@prisma/client';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class DeviceRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- CREATE / UPSERT ----------
  /**
   * Create or return existing device (fingerprint must be unique per user)
   */
  async upsertByFingerprint(params: {
    userId: string;
    fingerprint: string;
    userAgent?: string;
    ipAddress?: string;
    country?: string;
    city?: string;
    lat?: number;
    lon?: number;
    metadata?: Prisma.InputJsonValue;
  }): Promise<Device> {
    return this.prisma.device.upsert({
      where: {
        userId_fingerprint: {
          userId: params.userId,
          fingerprint: params.fingerprint,
        },
      },
      update: {
        userAgent: params.userAgent,
        ipAddress: params.ipAddress,
        country: params.country,
        city: params.city,
        lat: params.lat,
        lon: params.lon,
        metadata: params.metadata,
        lastSeenAt: new Date(),
      },
      create: {
        user: { connect: { id: params.userId } },
        fingerprint: params.fingerprint,
        userAgent: params.userAgent,
        ipAddress: params.ipAddress,
        country: params.country,
        city: params.city,
        lat: params.lat,
        lon: params.lon,
        metadata: params.metadata,
      },
    });
  }

  // ---------- FIND ----------
  async findById(
    id: string,
    args?: Prisma.DeviceFindUniqueArgs,
  ): Promise<Device | null> {
    return this.prisma.device.findUnique({
      where: { id },
      ...args,
    });
  }

  async findByFingerprint(
    userId: string,
    fingerprint: string,
  ): Promise<Device | null> {
    return this.prisma.device.findUnique({
      where: {
        userId_fingerprint: { userId, fingerprint },
      },
    });
  }

  async findByUser(
    userId: string,
    args: Prisma.DeviceFindManyArgs = {},
  ): Promise<Device[]> {
    return this.prisma.device.findMany({
      where: { userId, ...args.where },
      ...args,
    });
  }

  async findTrusted(userId: string): Promise<Device[]> {
    return this.prisma.device.findMany({
      where: {
        userId,
        trusted: true,
        blocked: false,
      },
    });
  }

  async findSuspicious(userId: string): Promise<Device[]> {
    return this.prisma.device.findMany({
      where: {
        userId,
        OR: [{ riskLevel: DeviceRiskLevel.HIGH }, { blocked: true }],
      },
    });
  }

  // ---------- UPDATE ----------
  async update(id: string, data: Prisma.DeviceUpdateInput): Promise<Device> {
    return this.prisma.device.update({
      where: { id },
      data,
    });
  }

  async touch(id: string): Promise<Device> {
    return this.prisma.device.update({
      where: { id },
      data: {}, // triggers lastSeenAt @updatedAt
    });
  }

  async updateLocation(
    id: string,
    data: {
      ipAddress?: string;
      country?: string;
      city?: string;
      lat?: number;
      lon?: number;
    },
  ): Promise<Device> {
    return this.prisma.device.update({
      where: { id },
      data,
    });
  }

  // ---------- TRUST / BLOCK ----------
  async markTrusted(id: string): Promise<Device> {
    return this.prisma.device.update({
      where: { id },
      data: {
        trusted: true,
        blocked: false,
        riskLevel: DeviceRiskLevel.LOW,
      },
    });
  }

  async untrust(id: string): Promise<Device> {
    return this.prisma.device.update({
      where: { id },
      data: {
        trusted: false,
      },
    });
  }

  async block(id: string): Promise<Device> {
    return this.prisma.device.update({
      where: { id },
      data: {
        blocked: true,
        riskLevel: DeviceRiskLevel.BLOCKED,
      },
    });
  }

  async unblock(id: string): Promise<Device> {
    return this.prisma.device.update({
      where: { id },
      data: {
        blocked: false,
        riskLevel: DeviceRiskLevel.MEDIUM,
      },
    });
  }

  async updateRiskLevel(id: string, risk: DeviceRiskLevel): Promise<Device> {
    return this.prisma.device.update({
      where: { id },
      data: { riskLevel: risk },
    });
  }

  // ---------- SECURITY ----------
  async isBlocked(id: string): Promise<boolean> {
    const device = await this.prisma.device.findUnique({
      where: { id },
      select: { blocked: true },
    });

    return device?.blocked ?? false;
  }

  async existsByFingerprint(
    userId: string,
    fingerprint: string,
  ): Promise<boolean> {
    const count = await this.prisma.device.count({
      where: {
        userId,
        fingerprint,
      },
    });

    return count > 0;
  }

  // ---------- DELETE ----------
  async delete(id: string): Promise<Device> {
    return this.prisma.device.delete({
      where: { id },
    });
  }

  async deleteByUser(userId: string): Promise<Prisma.BatchPayload> {
    return this.prisma.device.deleteMany({
      where: { userId },
    });
  }

  // ---------- WITH RELATIONS ----------
  async findWithRelations(id: string): Promise<Prisma.DeviceGetPayload<{
    include: {
      sessions: true;
      auditLogs: true;
      user: true;
    };
  }> | null> {
    return this.prisma.device.findUnique({
      where: { id },
      include: {
        sessions: true,
        auditLogs: true,
        user: true,
      },
    });
  }

  // ---------- PAGINATION ----------
  async findPaginated(
    args: Prisma.DeviceFindManyArgs,
  ): Promise<{ data: Device[]; total: number }> {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.device.findMany(args),
      this.prisma.device.count({ where: args.where }),
    ]);

    return { data, total };
  }
}
