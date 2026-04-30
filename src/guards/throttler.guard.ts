import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { TokenBucket } from '../common/util/rate-limit-token-bucket';
import { RedisStorageRegistry } from '../redis/redis-storage.registry';

@Injectable()
export class AdvancedRateLimitGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private redis: RedisStorageRegistry,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    const handler = context.getHandler();
    const controller = context.getClass();

    const config =
      this.reflector.getAllAndOverride(
        'throttle',
        [handler, controller],
      ) || {
        limit: 10,
        refillPerSecond: 1,
      };
    console.log(config);
    const key = this.buildKey(req, handler.name);

    let bucketData = await this.redis.rateLimitStore.get(key);

    let bucket: TokenBucket;

    if (!bucketData || typeof bucketData !== 'object') {
      const refillPerMs = config.limit / config.ttl;
      bucket = new TokenBucket(
        config.limit,
        refillPerMs,
        config.limit,
        Date.now(),
      );
    } else {
      bucket = TokenBucket.from(bucketData);
    }

    const allowed = bucket.consume(Date.now());

    await this.redis.rateLimitStore.set(key, bucket.serialize());

    if (!allowed) {
      throw new HttpException(
        'Too Many Requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private buildKey(req: any, route: string) {
    const userId = req.user?.id;
    const ip = req.ip;

    return userId
      ? `user:${userId}:${route}`
      : `ip:${ip}:${route}`;
  }
}