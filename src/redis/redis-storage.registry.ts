import { Injectable } from '@nestjs/common';
import {  RateLimitStore } from './storage/rate-limit.redis.repository';
import { IdempotencyStore } from './storage/idempotency.redis.repository';

@Injectable()
export class RedisStorageRegistry {
  constructor(
    public readonly rateLimitStore: RateLimitStore,
    public readonly idempotency: IdempotencyStore,

  ) {}
}
