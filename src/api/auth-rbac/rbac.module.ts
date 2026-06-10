import { Module } from '@nestjs/common';


import { RbacService } from './rbac.service';
import { RoleService } from './role.service';
import { PermissionService } from './permission.service';

@Module({
  providers: [
    RbacService,
    RoleService,
    PermissionService,
  ],
  exports: [
    RbacService,
    RoleService,
    PermissionService,
  ],
})
export class RbacModule {}