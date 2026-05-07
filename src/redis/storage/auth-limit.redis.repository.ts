import {
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { RedisService } from '../redis.service';

export type AuthLimitType =
  | 'LOGIN'
  | 'VERIFY_LOGIN'
  | 'VERIFY_REGISTER'
  | 'VERIFY_RESET_PASSWORD'
  | 'RESET_PASSWORD';

interface ConsumeResult {
  count: number;
  remaining: number;
  retryAfterMs: number;
}

@Injectable()
export class AuthLimitStore {
  private readonly prefix = 'auth:limit';

  constructor(private readonly redisService: RedisService) {}

  private get client() {
    return this.redisService.getClient();
  }

  private key(identifier: string, type: AuthLimitType) {
    return `${this.prefix}:${type}:${identifier}`;
  }

  /**
   * Consume one attempt
   */
  async consume(
    identifier: string,
    type: AuthLimitType,
    options: {
      ttlMs: number;
      maxAttempts: number;
    },
  ): Promise<ConsumeResult> {
    const key = this.key(identifier, type);

    const multi = this.client.multi();

    multi.incr(key);
    multi.pttl(key);

    const results = await multi.exec();

    if (!results) {
      throw new Error('Redis transaction failed');
    }

    const [[incrErr, incrResult], [ttlErr, ttlResult]] = results;

    if (incrErr) {
      throw incrErr;
    }

    if (ttlErr) {
      throw ttlErr;
    }

    const count = Number(incrResult);
    let ttl = Number(ttlResult);

    // first request → attach ttl
    if (ttl < 0) {
      await this.client.pexpire(key, options.ttlMs);
      ttl = options.ttlMs;
    }

    const remaining = Math.max(
      0,
      options.maxAttempts - count,
    );

    if (count > options.maxAttempts) {
      throw new ForbiddenException({
        message: 'Too many attempts. Try again later.',
        retryAfterMs: ttl,
      });
    }

    return {
      count,
      remaining,
      retryAfterMs: ttl,
    };
  }

  async get(
    identifier: string,
    type: AuthLimitType,
  ) {
    const key = this.key(identifier, type);

    const [count, ttl] = await Promise.all([
      this.client.get(key),
      this.client.pttl(key),
    ]);

    return {
      count: count ? Number(count) : 0,
      retryAfterMs: ttl > 0 ? ttl : 0,
    };
  }

  async reset(identifier: string, type: AuthLimitType) {
    await this.client.del(this.key(identifier, type));
  }
}