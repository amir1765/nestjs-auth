import { Injectable } from '@nestjs/common';
import { Prisma, ApiKey, ApiKeyScope } from '@prisma/client';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class ApiKeyRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- CREATE ----------
  async create(data: Prisma.ApiKeyCreateInput): Promise<ApiKey> {
    return this.prisma.apiKey.create({ data });
  }

  // ---------- FIND ----------
  async findById(id: string): Promise<ApiKey | null> {
    return this.prisma.apiKey.findUnique({
      where: { id },
    });
  }

  async findByHash(keyHash: string): Promise<ApiKey | null> {
    return this.prisma.apiKey.findUnique({
      where: { keyHash },
    });
  }

  async findActiveByHash(keyHash: string): Promise<ApiKey | null> {
    return this.prisma.apiKey.findFirst({
      where: {
        keyHash,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
  }

  async findByUser(userId: string): Promise<ApiKey[]> {
    return this.prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ---------- UPDATE ----------
  async update(id: string, data: Prisma.ApiKeyUpdateInput): Promise<ApiKey> {
    return this.prisma.apiKey.update({
      where: { id },
      data,
    });
  }

  async updateLastUsed(id: string): Promise<ApiKey> {
    return this.prisma.apiKey.update({
      where: { id },
      data: {
        lastUsedAt: new Date(),
      },
    });
  }

  // ---------- SECURITY ----------
  async revoke(id: string): Promise<ApiKey> {
    return this.prisma.apiKey.update({
      where: { id },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async revokeAllByUser(userId: string): Promise<Prisma.BatchPayload> {
    return this.prisma.apiKey.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async hasScope(keyHash: string, scope: ApiKeyScope): Promise<boolean> {
    const key = await this.findActiveByHash(keyHash);

    if (!key) return false;

    return key.scopes.includes(scope);
  }

  async existsActive(keyHash: string): Promise<boolean> {
    const count = await this.prisma.apiKey.count({
      where: {
        keyHash,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    return count > 0;
  }

  // ---------- DELETE ----------
  async delete(id: string): Promise<ApiKey> {
    return this.prisma.apiKey.delete({
      where: { id },
    });
  }

  // ---------- PAGINATION ----------
  async findPaginated(
    args: Prisma.ApiKeyFindManyArgs,
  ): Promise<{ data: ApiKey[]; total: number }> {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.apiKey.findMany(args),
      this.prisma.apiKey.count({ where: args.where }),
    ]);

    return { data, total };
  }
}
