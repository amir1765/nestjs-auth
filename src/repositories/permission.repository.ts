import { Injectable } from '@nestjs/common';
import { Prisma, Permission } from '@prisma/client';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class PermissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- CREATE ----------
  async create(data: Prisma.PermissionCreateInput): Promise<Permission> {
    return this.prisma.permission.create({ data });
  }

  // ---------- FIND ----------
  async findById(id: string): Promise<Permission | null> {
    return this.prisma.permission.findUnique({
      where: { id },
    });
  }

  async findByName(name: string): Promise<Permission | null> {
    return this.prisma.permission.findUnique({
      where: { name },
    });
  }

  async findAll(): Promise<Permission[]> {
    return this.prisma.permission.findMany();
  }

  async findByResource(resource: string): Promise<Permission[]> {
    return this.prisma.permission.findMany({
      where: { resource },
    });
  }

  // ---------- UPDATE ----------
  async update(
    id: string,
    data: Prisma.PermissionUpdateInput,
  ): Promise<Permission> {
    return this.prisma.permission.update({
      where: { id },
      data,
    });
  }

  // ---------- DELETE ----------
  async delete(id: string): Promise<Permission> {
    return this.prisma.permission.delete({
      where: { id },
    });
  }
}
