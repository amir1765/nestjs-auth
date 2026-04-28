import { Global, Module } from '@nestjs/common';
import { RateLimitStore } from './storage/rate-limit.store';
import { RedisStorageRegistry } from './redis-storage.registry';

@Global()
@Module({
  providers: [
    RedisStorageRegistry,
    RateLimitStore
  ],
  exports: [RedisStorageRegistry],
})
export class RedisStorageModule {}
