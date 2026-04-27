import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { Prisma, User } from '@prisma/client';

@Injectable()
export class UserRepository {
  constructor(private prisma: PrismaService) {}

  // ---------- CREATE ----------
  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  // ---------- FIND UNIQUE ----------
  async findById(
    id: string,
    args?: Prisma.UserFindUniqueArgs,
  ): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      ...args,
    });
  }

  async findByEmail(
    email: string,
    args?: Prisma.UserFindUniqueArgs,
  ): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
      ...args,
    });
  }

  // ---------- FIND MANY ----------
  async findMany(args: Prisma.UserFindManyArgs = {}): Promise<User[]> {
    return this.prisma.user.findMany(args);
  }

  async findPaginated(
    args: Prisma.UserFindManyArgs,
  ): Promise<{ data: User[]; total: number }> {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany(args),
      this.prisma.user.count({ where: args.where }),
    ]);

    return { data, total };
  }

  // ---------- UPDATE ----------
  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async updateByEmail(
    email: string,
    data: Prisma.UserUpdateInput,
  ): Promise<User> {
    return this.prisma.user.update({
      where: { email },
      data,
    });
  }

  // Atomic increment (safe for counters)
  async incrementFailedAttempts(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        failedLoginAttempts: { increment: 1 },
      },
    });
  }

  async resetFailedAttempts(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        failedLoginAttempts: 0,
        lockUntil: null,
      },
    });
  }

  async lockAccount(id: string, lockUntil: Date): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { lockUntil },
    });
  }

  async updateLastLogin(id: string, ip: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIP: ip,
      },
    });
  }

  async enable2FA(id: string, encryptedSecret: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        totpSecret: encryptedSecret,
        totpEnabled: true,
      },
    });
  }

  async disable2FA(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        totpSecret: null,
        totpEnabled: false,
      },
    });
  }

  async bumpTokenVersion(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        tokenVersion: { increment: 1 },
      },
    });
  }

  // ---------- DELETE ----------
  async delete(id: string): Promise<User> {
    return this.prisma.user.delete({
      where: { id },
    });
  }

  // ---------- EXISTS ----------
  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { email },
    });
    return count > 0;
  }

  // ---------- ADVANCED ----------
  async withRelations(id: string): Promise<Prisma.UserGetPayload<{
    include: {
      roles: true;
      sessions: true;
      devices: true;
    };
  }> | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: true,
        sessions: true,
        devices: true,
      },
    });
  }
}
