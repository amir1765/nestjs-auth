import { Injectable } from '@nestjs/common';
import { UserRepository } from '../user.repository';
import { SessionRepository } from '../session.repository';
import { RefreshTokenRepository } from '../refresh-token.repository';
import { DeviceRepository } from '../device.repository';
import { ApiKeyRepository } from '../api-key.repository';
import { AuditLogRepository } from '../audit-log.repository';
import { BackupCodeRepository } from '../backup-code.repository';
// import { IdempotencyKeyRepository } from '../idempotency-key.repository';
// import { IdempotencyKeyAnonRepository } from '../idempotency-key-anon.repository';
import { JwtSecretVersionRepository } from '../jwt-secret-version.repository';
import { LoginAttemptRepository } from '../login-attempt.repository';
import { PermissionRepository } from '../permission.repository';
//import { RateLimitBucketRepository } from '../rate-limit-bucket.repository';
import { RoleRepository } from '../role.repository';
import { RolePermissionRepository } from '../role-permission.repository';
import { UserRoleRepository } from '../user-role.repository';
import { WebhookSubscriptionRepository } from '../webhook-subscription.repository';

@Injectable()
export class RepositoryRegistry {
  constructor(
    public readonly user: UserRepository,
    public readonly session: SessionRepository,
    public readonly refreshToken: RefreshTokenRepository,
    public readonly device: DeviceRepository,
    public readonly auditLog: AuditLogRepository,
    public readonly loginAttempt: LoginAttemptRepository,

    public readonly backupCode: BackupCodeRepository,
    public readonly jwtSecretVersion: JwtSecretVersionRepository,

    public readonly permission: PermissionRepository,
    public readonly role: RoleRepository,
    public readonly rolePermission: RolePermissionRepository,
    public readonly userRole: UserRoleRepository,

    public readonly apiKey: ApiKeyRepository,
    public readonly webhookSubscription: WebhookSubscriptionRepository,

    // public readonly idempotencyKey: IdempotencyKeyRepository,
    // public readonly idempotencyKeyAnon: IdempotencyKeyAnonRepository,
    // public readonly rateLimitBucket: RateLimitBucketRepository,

  ) {}
}
