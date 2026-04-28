import { Injectable } from '@nestjs/common';
import { RateLimitStore } from './storage/rate-limit.store';

@Injectable()
export class RedisStorageRegistry {
  constructor(
    public readonly rateLimitStore: RateLimitStore,

  ) {}
}
