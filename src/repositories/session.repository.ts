import { Injectable } from '@nestjs/common';
import { Prisma, Session } from '@prisma/client';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- CREATE ----------
  async create(data: Prisma.SessionCreateInput): Promise<Session> {
    return this.prisma.session.create({ data });
  }

  // ---------- FIND ----------
  async findById(
    id: string,
    args?: Prisma.SessionFindUniqueArgs,
  ): Promise<Session | null> {
    return this.prisma.session.findUnique({
      where: { id },
      ...args,
    });
  }

  async findActiveById(id: string): Promise<Session | null> {
    return this.prisma.session.findFirst({
      where: {
        id,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async findByUserId(
    userId: string,
    args: Prisma.SessionFindManyArgs = {},
  ): Promise<Session[]> {
    return this.prisma.session.findMany({
      where: { userId, ...args.where },
      ...args,
    });
  }

  async findActiveByUserId(userId: string): Promise<Session[]> {
    return this.prisma.session.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByDevice(deviceId: string): Promise<Session[]> {
    return this.prisma.session.findMany({
      where: { deviceId },
    });
  }

  // ---------- UPDATE ----------
  async update(id: string, data: Prisma.SessionUpdateInput): Promise<Session> {
    return this.prisma.session.update({
      where: { id },
      data,
    });
  }

  async touch(id: string): Promise<Session> {
    // updates lastUsedAt via @updatedAt
    return this.prisma.session.update({
      where: { id },
      data: {},
    });
  }

  async attachDevice(sessionId: string, deviceId: string): Promise<Session> {
    return this.prisma.session.update({
      where: { id: sessionId },
      data: { deviceId },
    });
  }

  // ---------- REVOKE ----------
  async revoke(id: string, reason?: string): Promise<Session> {
    return this.prisma.session.update({
      where: { id },
      data: {
        isRevoked: true,
        revokedReason: reason,
      },
    });
  }

  async revokeManyByUser(
    userId: string,
    reason = 'FORCE_LOGOUT_ALL',
  ): Promise<Prisma.BatchPayload> {
    return this.prisma.session.updateMany({
      where: {
        userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedReason: reason,
      },
    });
  }

  async revokeByDevice(
    deviceId: string,
    reason = 'DEVICE_REVOKED',
  ): Promise<Prisma.BatchPayload> {
    return this.prisma.session.updateMany({
      where: {
        deviceId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedReason: reason,
      },
    });
  }

  async revokeExpired(): Promise<Prisma.BatchPayload> {
    return this.prisma.session.updateMany({
      where: {
        expiresAt: { lt: new Date() },
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedReason: 'EXPIRED',
      },
    });
  }

  // ---------- DELETE ----------
  async delete(id: string): Promise<Session> {
    return this.prisma.session.delete({
      where: { id },
    });
  }

  async deleteManyByUser(userId: string): Promise<Prisma.BatchPayload> {
    return this.prisma.session.deleteMany({
      where: { userId },
    });
  }

  async deleteOldRevokedSessions(
    retentionDays = 30,
  ): Promise<Prisma.BatchPayload> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    return this.prisma.session.deleteMany({
      where: {
        isRevoked: true,
        updatedAt: {
          lt: cutoff,
        },
      },
    });
  }

  async deleteExpired(): Promise<Prisma.BatchPayload> {
    return this.prisma.session.deleteMany({
      where: {
        OR: [
          {
            expiresAt: {
              lt: new Date(),
            },
          },
          {
            isRevoked: true,
          },
        ],
      },
    });
  }
  // ---------- EXISTS ----------
  async existsActive(id: string): Promise<boolean> {
    const count = await this.prisma.session.count({
      where: {
        id,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
    });
    return count > 0;
  }

  // ---------- WITH RELATIONS ----------
  async findWithRelations(id: string): Promise<Prisma.SessionGetPayload<{
    include: {
      user: true;
      device: true;
      refreshTokens: true;
    };
  }> | null> {
    return this.prisma.session.findUnique({
      where: { id },
      include: {
        user: true,
        device: true,
        refreshTokens: true,
      },
    });
  }

  // ---------- PAGINATION ----------
  async findPaginated(
    args: Prisma.SessionFindManyArgs,
  ): Promise<{ data: Session[]; total: number }> {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.session.findMany(args),
      this.prisma.session.count({ where: args.where }),
    ]);

    return { data, total };
  }
}
