import { Injectable } from '@nestjs/common';
import { Prisma, Role, RoleName } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- CREATE ----------
  async create(data: Prisma.RoleCreateInput): Promise<Role> {
    return this.prisma.role.create({ data });
  }

  // ---------- FIND ----------
  async findById(id: string): Promise<Role | null> {
    return this.prisma.role.findUnique({
      where: { id },
    });
  }

  async findByName(name: RoleName): Promise<Role | null> {
    return this.prisma.role.findUnique({
      where: { name },
    });
  }

  async findAll(): Promise<Role[]> {
    return this.prisma.role.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findWithPermissions(id: string): Promise<Prisma.RoleGetPayload<{
    include: {
      permissions: {
        include: { permission: true };
      };
    };
  }> | null> {
    return this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
  }

  // ---------- UPDATE ----------
  async update(id: string, data: Prisma.RoleUpdateInput): Promise<Role> {
    return this.prisma.role.update({
      where: { id },
      data,
    });
  }

  // ---------- DELETE ----------
  async delete(id: string): Promise<Role> {
    return this.prisma.role.delete({
      where: { id },
    });
  }
}
