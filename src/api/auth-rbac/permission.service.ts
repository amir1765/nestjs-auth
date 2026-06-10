import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  Permission,
  Prisma,
} from '@prisma/client';

import { RepositoryRegistry } from 'src/repositories/prisma/repository.registry';

@Injectable()
export class PermissionService {
  constructor(
    private readonly repo: RepositoryRegistry,
  ) {}

  async create(
    data: Prisma.PermissionCreateInput,
  ): Promise<Permission> {
    const exists =
      await this.repo.permission.findByName(
        data.name,
      );

    if (exists) {
      throw new ConflictException(
        `Permission '${data.name}' already exists`,
      );
    }

    return this.repo.permission.create(data);
  }

  async findAll(): Promise<Permission[]> {
    return this.repo.permission.findAll();
  }

  async findById(
    id: string,
  ): Promise<Permission> {
    const permission =
      await this.repo.permission.findById(id);

    if (!permission) {
      throw new NotFoundException(
        'Permission not found',
      );
    }

    return permission;
  }

  async update(
    id: string,
    data: Prisma.PermissionUpdateInput,
  ): Promise<Permission> {
    await this.findById(id);

    return this.repo.permission.update(
      id,
      data,
    );
  }

  async delete(
    id: string,
  ): Promise<Permission> {
    await this.findById(id);

    return this.repo.permission.delete(id);
  }
}