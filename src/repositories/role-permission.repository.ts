import { Injectable } from '@nestjs/common';
import { Prisma, RolePermission } from '@prisma/client';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class RolePermissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- ASSIGN ----------
  async assign(roleId: string, permissionId: string): Promise<RolePermission> {
    return this.prisma.rolePermission.create({
      data: {
        roleId,
        permissionId,
      },
    });
  }

  // ---------- REMOVE ----------
  async remove(roleId: string, permissionId: string): Promise<RolePermission> {
    return this.prisma.rolePermission.delete({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
    });
  }

  // ---------- FIND ----------
  async findByRole(roleId: string): Promise<RolePermission[]> {
    return this.prisma.rolePermission.findMany({
      where: { roleId },
      include: { permission: true },
    });
  }

  async findByPermission(permissionId: string): Promise<RolePermission[]> {
    return this.prisma.rolePermission.findMany({
      where: { permissionId },
      include: { role: true },
    });
  }

  // ---------- BULK ----------
  async assignMany(
    roleId: string,
    permissionIds: string[],
  ): Promise<Prisma.BatchPayload> {
    return this.prisma.rolePermission.createMany({
      data: permissionIds.map((pid) => ({
        roleId,
        permissionId: pid,
      })),
      skipDuplicates: true,
    });
  }

  async removeAllByRole(roleId: string): Promise<Prisma.BatchPayload> {
    return this.prisma.rolePermission.deleteMany({
      where: { roleId },
    });
  }
}
