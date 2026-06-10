import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma, Role, RoleName } from '@prisma/client';

import { RepositoryRegistry } from 'src/repositories/prisma/repository.registry';

@Injectable()
export class RoleService {
  constructor(
    private readonly repo: RepositoryRegistry,
  ) {}

  async create(
    data: Prisma.RoleCreateInput,
  ): Promise<Role> {
    const exists =
      await this.repo.role.findByName(data.name);

    if (exists) {
      throw new ConflictException(
        `Role '${data.name}' already exists`,
      );
    }

    return this.repo.role.create(data);
  }

  async findAll(): Promise<Role[]> {
    return this.repo.role.findAll();
  }

  async findById(id: string): Promise<Role> {
    const role = await this.repo.role.findById(id);

    if (!role) {
      throw new NotFoundException(
        'Role not found',
      );
    }

    return role;
  }

  async findByName(
    name: RoleName,
  ): Promise<Role> {
    const role =
      await this.repo.role.findByName(name);

    if (!role) {
      throw new NotFoundException(
        'Role not found',
      );
    }

    return role;
  }

  async findWithPermissions(id: string) {
    const role =
      await this.repo.role.findWithPermissions(
        id,
      );

    if (!role) {
      throw new NotFoundException(
        'Role not found',
      );
    }

    return role;
  }

  async update(
    id: string,
    data: Prisma.RoleUpdateInput,
  ): Promise<Role> {
    await this.findById(id);

    return this.repo.role.update(id, data);
  }

  async delete(id: string): Promise<Role> {
    await this.findById(id);

    return this.repo.role.delete(id);
  }
}