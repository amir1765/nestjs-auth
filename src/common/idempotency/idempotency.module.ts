import { Module } from '@nestjs/common';
import { IdempotencyService } from './idempotency.service';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { RedisStorageRegistry } from '../../redis/redis-storage.registry';

@Module({
  providers: [
    IdempotencyService,
    IdempotencyInterceptor,
  ],
  exports: [IdempotencyService, IdempotencyInterceptor],
})
export class IdempotencyModule {}