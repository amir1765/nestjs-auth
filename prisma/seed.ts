// prisma/seed.ts
import { PrismaClient, RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config(); // Load .env for DATABASE_URL if needed

const prisma = new PrismaClient();

// Define all permissions (resource:action)
const PERMISSIONS = [
  // User management
  { name: 'user:read', resource: 'user', action: 'read', description: 'View user profiles' },
  { name: 'user:create', resource: 'user', action: 'create', description: 'Create new users' },
  { name: 'user:update', resource: 'user', action: 'update', description: 'Update user details' },
  { name: 'user:delete', resource: 'user', action: 'delete', description: 'Delete users' },
  // Payment
  { name: 'payment:create', resource: 'payment', action: 'create', description: 'Initiate payments' },
  { name: 'payment:read', resource: 'payment', action: 'read', description: 'View payment history' },
  { name: 'payment:refund', resource: 'payment', action: 'refund', description: 'Process refunds' },
  // Admin
  { name: 'admin:access', resource: 'admin', action: 'access', description: 'Access admin panel' },
  { name: 'admin:audit', resource: 'admin', action: 'audit', description: 'View audit logs' },
  // API keys
  { name: 'apikey:manage', resource: 'apikey', action: 'manage', description: 'Create/revoke API keys' },
  // Webhook
  { name: 'webhook:manage', resource: 'webhook', action: 'manage', description: 'Manage webhooks' },
];

// Map roles to permissions
const ROLE_PERMISSIONS: Record<RoleName, string[]> = {
  ADMIN: [
    'user:read', 'user:create', 'user:update', 'user:delete',
    'payment:create', 'payment:read', 'payment:refund',
    'admin:access', 'admin:audit',
    'apikey:manage', 'webhook:manage',
  ],
  USER: [
    'user:read',               // can view own profile
    'payment:create', 'payment:read',
  ],
  MERCHANT: [
    'user:read',               // own profile
    'payment:create', 'payment:read', 'payment:refund',
    'apikey:manage',           // can generate API keys for POS
    'webhook:manage',          // set up webhooks for payment events
  ],
};

// Default users to create (passwords will be hashed)
const DEFAULT_USERS = [
  {
    email: 'admin@example.com',
    password: 'Admin123!',
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

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Seed roles
  console.log('Seeding roles...');
  for (const roleName of Object.values(RoleName)) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {}, // nothing to update
      create: {
        name: roleName,
        description: `${roleName} role`,
      },
    });
  }

  // 2. Seed permissions
  console.log('Seeding permissions...');
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {
        resource: perm.resource,
        action: perm.action,
        description: perm.description,
      },
      create: {
        name: perm.name,
        resource: perm.resource,
        action: perm.action,
        description: perm.description,
      },
    });
  }

  // 3. Assign permissions to roles
  console.log('Assigning permissions to roles...');
  const allRoles = await prisma.role.findMany();
  const allPermissions = await prisma.permission.findMany();

  const permissionMap = new Map(allPermissions.map(p => [p.name, p.id]));
  const roleMap = new Map(allRoles.map(r => [r.name, r.id]));

  const rolePermissionData: { roleId: string; permissionId: string }[] = [];
  for (const [roleName, permNames] of Object.entries(ROLE_PERMISSIONS)) {
    const roleId = roleMap.get(roleName as RoleName);
    if (!roleId) continue;
    for (const permName of permNames) {
      const permId = permissionMap.get(permName);
      if (permId) {
        rolePermissionData.push({ roleId, permissionId: permId });
      }
    }
  }

  // Use createMany with skipDuplicates to avoid errors on re-run
  if (rolePermissionData.length > 0) {
    await prisma.rolePermission.createMany({
      data: rolePermissionData,
      skipDuplicates: true,
    });
  }

  // 4. Seed users and assign roles
  console.log('Seeding users...');
  for (const userData of DEFAULT_USERS) {
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        // If user exists, we do not overwrite password or roles for safety.
        // You can update fullName if needed.
        fullName: userData.fullName,
      },
      create: {
        email: userData.email,
        passwordHash: hashedPassword,
        fullName: userData.fullName,
        emailVerified: true, // default true for seed users
      },
    });

    // Assign role if not already assigned
    const roleId = roleMap.get(userData.role);
    if (roleId) {
      // Ensure the user has this role (idempotent)
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: roleId,
          },
        },
        update: {}, // nothing to change
        create: {
          userId: user.id,
          roleId: roleId,
          assignedBy: 'seed',
        },
      });
    }
  }

  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });