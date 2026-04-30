import { Global, Module } from '@nestjs/common';
import {  RateLimitStore } from './storage/rate-limit.redis.repository';
import { RedisStorageRegistry } from './redis-storage.registry';
import { IdempotencyStore } from './storage/idempotency.redis.repository';
import { SessionStore } from './storage/session.redis.repository';

@Global()
@Module({
  providers: [
    RedisStorageRegistry,
    RateLimitStore,
    IdempotencyStore,
    SessionStore
  ],
  exports: [RedisStorageRegistry],
})
export class RedisStorageModule {}
