import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { Prisma, User } from '@prisma/client';

@Injectable()
export class UserRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // ==================================================
  // CREATE
  // ==================================================

  async create(
    data: Prisma.UserCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? this.prisma;

    return db.user.create({
      data,
    });
  }

  // ==================================================
  // FIND UNIQUE
  // ==================================================

  async findById(
    id: string,
    args?: Prisma.UserFindUniqueArgs,
    tx?: Prisma.TransactionClient,
  ): Promise<User | null> {
    const db = tx ?? this.prisma;
    return db.user.findUnique({
      where: { id },
      ...args,
    });
  }

  async findByEmail(
    email: string,
    args?: Prisma.UserFindUniqueArgs,
    tx?: Prisma.TransactionClient,
  ): Promise<User | null> {
    const db = tx ?? this.prisma;
    return db.user.findUnique({
      where: { email },
      ...args,
    });
  }

  async findVerifiedByEmail(
    email: string,
    tx?: Prisma.TransactionClient,
  ): Promise<User | null> {
    const db = tx ?? this.prisma;
    return db.user.findFirst({
      where: {
        email,
        emailVerified: true,
      },
    });
  }

  // ==================================================
  // FIND MANY
  // ==================================================

  async findMany(
    args: Prisma.UserFindManyArgs = {},
    tx?: Prisma.TransactionClient,
  ): Promise<User[]> {
    const db = tx ?? this.prisma;
    return db.user.findMany(args);
  }

  async findPaginated(
    args: Prisma.UserFindManyArgs,
    tx?: Prisma.TransactionClient,
  ): Promise<{
    data: User[];
    total: number;
  }> {
    const db = tx ?? this.prisma;
    // transaction client does not support nested transaction safely
    // so avoid using $transaction here – plain queries inside a passed tx are fine

    const [data, total] = await Promise.all([
      db.user.findMany(args),
      db.user.count({
        where: args.where,
      }),
    ]);

    return {
      data,
      total,
    };
  }

  // ==================================================
  // UPDATE
  // ==================================================

  async update(
    id: string,
    data: Prisma.UserUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<User> {
    const db = tx ?? this.prisma;
    return db.user.update({
      where: { id },
      data,
    });
  }

  async updateByEmail(
    email: string,
    data: Prisma.UserUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<User> {
    const db = tx ?? this.prisma;
    return db.user.update({
      where: { email },
      data,
    });
  }

  // ==================================================
  // LOGIN SECURITY
  // ==================================================

  async incrementFailedAttempts(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<User> {
    const db = tx ?? this.prisma;
    return db.user.update({
      where: { id },
      data: {
        failedLoginAttempts: {
          increment: 1,
        },
      },
    });
  }

  async resetFailedAttempts(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<User> {
    const db = tx ?? this.prisma;
    return db.user.update({
      where: { id },
      data: {
        failedLoginAttempts: 0,
        lockUntil: null,
      },
    });
  }

  async lockAccount(
    id: string,
    lockUntil: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<User> {
    const db = tx ?? this.prisma;
    return db.user.update({
      where: { id },
      data: {
        lockUntil,
      },
    });
  }

  async updateLastLogin(
    id: string,
    ip: string,
    tx?: Prisma.TransactionClient,
  ): Promise<User> {
    const db = tx ?? this.prisma;
    return db.user.update({
      where: { id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIP: ip,
      },
    });
  }

  // ==================================================
  // 2FA
  // ==================================================

  async enable2FA(
    id: string,
    encryptedSecret: string,
    tx?: Prisma.TransactionClient,
  ): Promise<User> {
    const db = tx ?? this.prisma;
    return db.user.update({
      where: { id },
      data: {
        totpSecret: encryptedSecret,
        tempTotpSecret: null,
        totpEnabled: true,
        totpEnabledAt: new Date(),
      },
    });
  }

  async disable2FA(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<User> {
    const db = tx ?? this.prisma;
    return db.user.update({
      where: { id },
      data: {
        totpSecret: null,
        tempTotpSecret: null,
        totpEnabled: false,
        totpEnabledAt: null,
      },
    });
  }

  async setTemp2FASecret(
    id: string,
    encryptedSecret: string,
    tx?: Prisma.TransactionClient,
  ): Promise<User> {
    const db = tx ?? this.prisma;
    return db.user.update({
      where: { id },
      data: {
        tempTotpSecret: encryptedSecret,
      },
    });
  }

  async clearTemp2FASecret(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<User> {
    const db = tx ?? this.prisma;
    return db.user.update({
      where: { id },
      data: {
        tempTotpSecret: null,
      },
    });
  }

  async bumpTokenVersion(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<User> {
    const db = tx ?? this.prisma;
    return db.user.update({
      where: { id },
      data: {
        tokenVersion: {
          increment: 1,
        },
      },
    });
  }

  // ==================================================
  // DELETE
  // ==================================================

  async delete(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<User> {
    const db = tx ?? this.prisma;
    return db.user.delete({
      where: { id },
    });
  }

  // ==================================================
  // EXISTS
  // ==================================================

  async existsByEmail(
    email: string,
    tx?: Prisma.TransactionClient,
  ): Promise<boolean> {
    const db = tx ?? this.prisma;
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });

    return !!user;
  }

  // ==================================================
  // EMAIL VERIFICATION
  // ==================================================

  async markEmailVerified(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<User> {
    const db = tx ?? this.prisma;
    return db.user.update({
      where: { id },
      data: {
        emailVerified: true,
      },
    });
  }

  // ==================================================
  // PASSWORD
  // ==================================================

  async updatePassword(
    id: string,
    passwordHash: string,
    tx?: Prisma.TransactionClient,
  ): Promise<User> {
    const db = tx ?? this.prisma;
    return db.user.update({
      where: { id },
      data: {
        passwordHash,
        tokenVersion: {
          increment: 1,
        },
      },
    });
  }

  // ==================================================
  // ADVANCED
  // ==================================================

  async withRelations(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<
    Prisma.UserGetPayload<{
      include: {
        roles: true;
        sessions: true;
        devices: true;
      };
    }> | null
  > {
    const db = tx ?? this.prisma;
    return db.user.findUnique({
      where: { id },
      include: {
        roles: true,
        sessions: true,
        devices: true,
      },
    });
  }
}