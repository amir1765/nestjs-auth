import { Global, Module } from '@nestjs/common';
import { UserRepository } from './user.repository';

import { RepositoryRegistry } from './prisma/repository.registry';
import { SessionRepository } from './session.repository';
import { RefreshTokenRepository } from './refresh-token.repository';
import { DeviceRepository } from './device.repository';
import { ApiKeyRepository } from './api-key.repository';
import { AuditLogRepository } from './audit-log.repository';
import { BackupCodeRepository } from './backup-code.repository';
import { JwtSecretVersionRepository } from './jwt-secret-version.repository';
import { LoginAttemptRepository } from './login-attempt.repository';
import { PermissionRepository } from './permission.repository';
// import { RateLimitBucketRepository } from './rate-limit-bucket.repository';
// import { IdempotencyKeyRepository } from './idempotency-key.repository';
// import { IdempotencyKeyAnonRepository } from './idempotency-key-anon.repository';
import { RoleRepository } from './role.repository';
import { RolePermissionRepository } from './role-permission.repository';
import { UserRoleRepository } from './user-role.repository';
import { WebhookSubscriptionRepository } from './webhook-subscription.repository';
import { AuthTokenRepository } from './auth-token.repository';

@Global()
@Module({
  providers: [
    UserRepository,
    RepositoryRegistry,
    SessionRepository,
    RefreshTokenRepository,
    DeviceRepository,
    ApiKeyRepository,
    AuditLogRepository,
    BackupCodeRepository,
    // IdempotencyKeyRepository,
    // IdempotencyKeyAnonRepository,
    JwtSecretVersionRepository,
    LoginAttemptRepository,
    PermissionRepository,
    // RateLimitBucketRepository,
    RoleRepository,
    RolePermissionRepository,
    UserRoleRepository,
    WebhookSubscriptionRepository,
    AuthTokenRepository
  ],
  exports: [RepositoryRegistry],
})
export class RepositoriesModule {}
