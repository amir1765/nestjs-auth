import { Global, Module } from '@nestjs/common';
import {  RateLimitStore } from './storage/rate-limit.redis.repository';
import { RedisStorageRegistry } from './redis-storage.registry';
import { IdempotencyStore } from './storage/idempotency.redis.repository';
import { SessionStore } from './storage/session.redis.repository';
import { EmailLimitStore } from './storage/rate-limit-email.repository';

@Global()
@Module({
  providers: [
    RedisStorageRegistry,
    RateLimitStore,
    IdempotencyStore,
    SessionStore,
    EmailLimitStore
  ],
  exports: [RedisStorageRegistry],
})
export class RedisStorageModule {}
