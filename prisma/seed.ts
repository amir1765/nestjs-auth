// prisma/seed.ts

import { PrismaClient, RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

/**
 * ---------------------------------------------------
 * Permissions
 * ---------------------------------------------------
 */

const PERMISSIONS = [
  // Users
  {
    name: 'user:create',
    resource: 'user',
    action: 'create',
    description: 'Create users',
  },
  {
    name: 'user:read',
    resource: 'user',
    action: 'read',
    description: 'Read users',
  },
  {
    name: 'user:update',
    resource: 'user',
    action: 'update',
    description: 'Update users',
  },
  {
    name: 'user:delete',
    resource: 'user',
    action: 'delete',
    description: 'Delete users',
  },

  // Payments
  {
    name: 'payment:create',
    resource: 'payment',
    action: 'create',
    description: 'Create payments',
  },
  {
    name: 'payment:read',
    resource: 'payment',
    action: 'read',
    description: 'Read payments',
  },
  {
    name: 'payment:refund',
    resource: 'payment',
    action: 'refund',
    description: 'Refund payments',
  },

  // Admin
  {
    name: 'admin:access',
    resource: 'admin',
    action: 'access',
    description: 'Access admin panel',
  },
  {
    name: 'admin:audit',
    resource: 'admin',
    action: 'audit',
    description: 'Access audit logs',
  },

  // API Keys
  {
    name: 'apikey:create',
    resource: 'apikey',
    action: 'create',
    description: 'Create API keys',
  },
  {
    name: 'apikey:revoke',
    resource: 'apikey',
    action: 'revoke',
    description: 'Revoke API keys',
  },

  // Webhooks
  {
    name: 'webhook:create',
    resource: 'webhook',
    action: 'create',
    description: 'Create webhooks',
  },
  {
    name: 'webhook:update',
    resource: 'webhook',
    action: 'update',
    description: 'Update webhooks',
  },
  {
    name: 'webhook:delete',
    resource: 'webhook',
    action: 'delete',
    description: 'Delete webhooks',
  },
] as const;

/**
 * ---------------------------------------------------
 * Role -> Permission Mapping
 * ---------------------------------------------------
 */

const ROLE_PERMISSIONS: Record<RoleName, string[]> = {
  ADMIN: PERMISSIONS.map((p) => p.name),

  USER: [
    'user:read',
    'payment:create',
    'payment:read',
  ],

  MERCHANT: [
    'user:read',

    'payment:create',
    'payment:read',
    'payment:refund',

    'apikey:create',
    'apikey:revoke',

    'webhook:create',
    'webhook:update',
    'webhook:delete',
  ],
};

/**
 * ---------------------------------------------------
 * Default Seed Users
 * ---------------------------------------------------
 */

const DEFAULT_USERS = [
  {
    email: process.env.ADMIN_EMAIL || 'admin@example.com',
    password: process.env.ADMIN_PASSWORD || 'Admin123!',
    fullName: 'System Admin',
    role: RoleName.ADMIN,
  },
  {
    email: 'user@example.com',
    password: 'User123!',
    fullName: 'Normal User',
    role: RoleName.USER,
  },
  {
    email: 'merchant@example.com',
    password: 'Merchant123!',
    fullName: 'Demo Merchant',
    role: RoleName.MERCHANT,
  },
];

/**
 * ---------------------------------------------------
 * Main Seeder
 * ---------------------------------------------------
 */

async function main() {
  console.log('\n🌱 Starting database seed...\n');

  await prisma.$transaction(async (tx) => {
    /**
     * ---------------------------------------------------
     * Seed Roles
     * ---------------------------------------------------
     */

    console.log('📌 Seeding roles...');

    for (const roleName of Object.values(RoleName)) {
      await tx.role.upsert({
        where: {
          name: roleName,
        },
        update: {
          description: `${roleName} role`,
        },
        create: {
          name: roleName,
          description: `${roleName} role`,
        },
      });
    }

    /**
     * ---------------------------------------------------
     * Seed Permissions
     * ---------------------------------------------------
     */

    console.log('📌 Seeding permissions...');

    for (const permission of PERMISSIONS) {
      await tx.permission.upsert({
        where: {
          name: permission.name,
        },
        update: {
          resource: permission.resource,
          action: permission.action,
          description: permission.description,
        },
        create: permission,
      });
    }

    /**
     * ---------------------------------------------------
     * Fetch Roles & Permissions
     * ---------------------------------------------------
     */

    const roles = await tx.role.findMany();
    const permissions = await tx.permission.findMany();

    const roleMap = new Map(
      roles.map((role) => [role.name, role.id]),
    );

    const permissionMap = new Map(
      permissions.map((permission) => [
        permission.name,
        permission.id,
      ]),
    );

    /**
     * ---------------------------------------------------
     * Assign Permissions To Roles
     * ---------------------------------------------------
     */

    console.log('📌 Assigning permissions to roles...');

    for (const [roleName, permissionNames] of Object.entries(
      ROLE_PERMISSIONS,
    )) {
      const roleId = roleMap.get(roleName as RoleName);

      if (!roleId) continue;

      for (const permissionName of permissionNames) {
        const permissionId = permissionMap.get(permissionName);

        if (!permissionId) {
          console.warn(
            `⚠️ Permission not found: ${permissionName}`,
          );
          continue;
        }

        await tx.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId,
              permissionId,
            },
          },
          update: {},
          create: {
            roleId,
            permissionId,
          },
        });
      }
    }

    /**
     * ---------------------------------------------------
     * Seed Users
     * ---------------------------------------------------
     */

    console.log('📌 Seeding users...');

    for (const seedUser of DEFAULT_USERS) {
      const existingUser = await tx.user.findUnique({
        where: {
          email: seedUser.email,
        },
      });

      let userId: string;

      if (!existingUser) {
        const passwordHash = await bcrypt.hash(
          seedUser.password,
          12,
        );

        const createdUser = await tx.user.create({
          data: {
            email: seedUser.email,
            passwordHash,
            fullName: seedUser.fullName,
            emailVerified: true,
          },
        });

        userId = createdUser.id;

        console.log(`✅ Created user: ${seedUser.email}`);
      } else {
        userId = existingUser.id;

        console.log(`↩️ User exists: ${seedUser.email}`);
      }

      /**
       * Assign Role
       */

      const roleId = roleMap.get(seedUser.role);

      if (!roleId) continue;

      await tx.userRole.upsert({
        where: {
          userId_roleId: {
            userId,
            roleId,
          },
        },
        update: {},
        create: {
          userId,
          roleId,
          assignedBy: 'system_seed',
        },
      });
    }
  });

  console.log('\n✅ Database seeding completed.\n');
}

/**
 * ---------------------------------------------------
 * Execute
 * ---------------------------------------------------
 */

main()
  .catch((error) => {
    console.error('\n❌ Seed failed:\n', error);

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });