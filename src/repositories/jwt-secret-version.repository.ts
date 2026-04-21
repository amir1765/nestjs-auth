import { Injectable } from '@nestjs/common';
import { JwtSecretVersion, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtSecretVersionRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- CREATE ----------
  async create(
    data: Prisma.JwtSecretVersionCreateInput,
  ): Promise<JwtSecretVersion> {
    return this.prisma.jwtSecretVersion.create({
      data,
    });
  }

  // ---------- FIND ACTIVE SECRET ----------
  async findActive(): Promise<JwtSecretVersion | null> {
    return this.prisma.jwtSecretVersion.findFirst({
      where: { active: true },
    });
  }

  // ---------- FIND BY VERSION ----------
  async findByVersion(version: number): Promise<JwtSecretVersion | null> {
    return this.prisma.jwtSecretVersion.findUnique({
      where: { version },
    });
  }

  // ---------- FIND ALL (LATEST FIRST) ----------
  async findAll(): Promise<JwtSecretVersion[]> {
    return this.prisma.jwtSecretVersion.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  // ---------- ACTIVATE VERSION ----------
  async activate(version: number): Promise<JwtSecretVersion> {
    return this.prisma.jwtSecretVersion.update({
      where: { version },
      data: {
        active: true,
      },
    });
  }

  // ---------- DEACTIVATE VERSION ----------
  async deactivate(version: number): Promise<JwtSecretVersion> {
    return this.prisma.jwtSecretVersion.update({
      where: { version },
      data: {
        active: false,
      },
    });
  }

  // ---------- DELETE ----------
  async delete(version: number): Promise<JwtSecretVersion> {
    return this.prisma.jwtSecretVersion.delete({
      where: { version },
    });
  }

  // ---------- DELETE EXPIRED KEYS ----------
  async deleteExpired(): Promise<Prisma.BatchPayload> {
    return this.prisma.jwtSecretVersion.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }
}
