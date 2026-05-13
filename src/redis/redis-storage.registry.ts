import { Injectable } from '@nestjs/common';
import {  RateLimitStore } from './storage/rate-limit.redis.repository';
import { IdempotencyStore } from './storage/idempotency.redis.repository';
import { SessionStore } from './storage/session.redis.repository';
import { EmailLimitStore } from './storage/rate-limit-email.redis.repository';
import { AuthLimitStore } from './storage/auth-limit.redis.repository';
import { OTPVerifyLimitStore } from './storage/otp-verify-limit.store';

@Injectable()
export class RedisStorageRegistry {
  constructor(
    public readonly rateLimitStore: RateLimitStore,
    public readonly idempotency: IdempotencyStore,
    public readonly sessionStore: SessionStore,
    public readonly emailLimit: EmailLimitStore,
    public readonly authLimit: AuthLimitStore,
    public readonly otpVerifyLimit: OTPVerifyLimitStore
  ) {}
}
