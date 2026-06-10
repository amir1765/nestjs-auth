import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { RepositoryRegistry } from 'src/repositories/prisma/repository.registry';

@Injectable()
export class RbacService {
  constructor(
    private readonly repo: RepositoryRegistry,
  ) {}

  // =====================================
  // USER <-> ROLE
  // =====================================

  async assignRoleToUser(
    userId: string,
    roleId: string,
    assignedBy?: string,
  ) {
    const role =
      await this.repo.role.findById(roleId);

    if (!role) {
      throw new NotFoundException(
        'Role not found',
      );
    }

    return this.repo.userRole.assign(
      userId,
      roleId,
      assignedBy,
    );
  }

  async removeRoleFromUser(
    userId: string,
    roleId: string,
  ) {
    return this.repo.userRole.remove(
      userId,
      roleId,
    );
  }

  async getUserRoles(userId: string) {
    return this.repo.userRole.findRolesByUser(
      userId,
    );
  }

  // =====================================
  // ROLE <-> PERMISSION
  // =====================================

  async assignPermissionToRole(
    roleId: string,
    permissionId: string,
  ) {
    const role =
      await this.repo.role.findById(roleId);

    if (!role) {
      throw new NotFoundException(
        'Role not found',
      );
    }

    const permission =
      await this.repo.permission.findById(
        permissionId,
      );

    if (!permission) {
      throw new NotFoundException(
        'Permission not found',
      );
    }

    return this.repo.rolePermission.assign(
      roleId,
      permissionId,
    );
  }

  async removePermissionFromRole(
    roleId: string,
    permissionId: string,
  ) {
    return this.repo.rolePermission.remove(
      roleId,
      permissionId,
    );
  }

  async getRolePermissions(
    roleId: string,
  ) {
    return this.repo.rolePermission.findByRole(
      roleId,
    );
  }

  // =====================================
  // AUTHORIZATION
  // =====================================

  async getUserPermissions(
    userId: string,
  ): Promise<string[]> {
    return this.repo.userRole.getUserPermissions(
      userId,
    );
  }

  async hasPermission(
    userId: string,
    permission: string,
  ): Promise<boolean> {
    return this.repo.userRole.hasPermission(
      userId,
      permission,
    );
  }

  async hasAnyPermission(
    userId: string,
    permissions: string[],
  ): Promise<boolean> {
    const userPermissions =
      await this.getUserPermissions(userId);

    return permissions.some((permission) =>
      userPermissions.includes(permission),
    );
  }

  async hasAllPermissions(
    userId: string,
    permissions: string[],
  ): Promise<boolean> {
    const userPermissions =
      await this.getUserPermissions(userId);

    return permissions.every((permission) =>
      userPermissions.includes(permission),
    );
  }
}