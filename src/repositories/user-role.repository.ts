import { Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserRoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- ASSIGN ----------
  async assign(
    userId: string,
    roleId: string,
    assignedBy?: string,
  ): Promise<UserRole> {
    return this.prisma.userRole.create({
      data: {
        userId,
        roleId,
        assignedBy,
      },
    });
  }

  // ---------- REMOVE ----------
  async remove(userId: string, roleId: string): Promise<UserRole> {
    return this.prisma.userRole.delete({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });
  }

  // ---------- FIND ----------
  async findRolesByUser(userId: string): Promise<UserRole[]> {
    return this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
  }

  async findUsersByRole(roleId: string): Promise<UserRole[]> {
    return this.prisma.userRole.findMany({
      where: { roleId },
      include: { user: true },
    });
  }

  // ---------- BULK ----------
  async assignMany(
    userId: string,
    roleIds: string[],
    assignedBy?: string,
  ): Promise<Prisma.BatchPayload> {
    return this.prisma.userRole.createMany({
      data: roleIds.map((roleId) => ({
        userId,
        roleId,
        assignedBy,
      })),
      skipDuplicates: true,
    });
  }

  async removeAllRoles(userId: string): Promise<Prisma.BatchPayload> {
    return this.prisma.userRole.deleteMany({
      where: { userId },
    });
  }

  // ---------- PERMISSION RESOLUTION (IMPORTANT) ----------
  async getUserPermissions(userId: string): Promise<string[]> {
    const roles = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    const permissions = new Set<string>();

    for (const ur of roles) {
      for (const rp of ur.role.permissions) {
        permissions.add(rp.permission.name);
      }
    }

    return [...permissions];
  }

  async hasPermission(
    userId: string,
    permissionName: string,
  ): Promise<boolean> {
    const perms = await this.getUserPermissions(userId);
    return perms.includes(permissionName);
  }
}
