import { Injectable, ForbiddenException } from '@nestjs/common';
import { RedisService } from '../redis.service';
import { AuthTokenType } from '@prisma/client';

@Injectable()
export class EmailLimitStore {
  private prefix = 'email_limit:';

  constructor(private redisService: RedisService) {}

  private get client() {
    return this.redisService.getClient();
  }

  private key(userId: string, type: AuthTokenType) {
    return `${this.prefix}${userId}:${type}`;
  }

  /**
   * 🚀 Increment send count
   */
  async increment(
    userId: string,
    type: AuthTokenType,
    ttlMs: number,
    maxAttempts = 5,
  ): Promise<void> {
    const key = this.key(userId, type);

    const count = await this.client.incr(key);

    // ⏳ first hit → set TTL
    if (count === 1) {
      await this.client.pexpire(key, ttlMs);
    }

    if (count > maxAttempts) {
      throw new ForbiddenException(
        `the email sent recently ,try latter`,
      );
    }
  }

  /**
   * 🔍 Get current attempts
   */
  async get(userId: string, type: AuthTokenType): Promise<number> {
    const key = this.key(userId, type);
    const val = await this.client.get(key);
    return val ? Number(val) : 0;
  }

  /**
   * ♻️ Reset (optional after success)
   */
  async reset(userId: string, type: AuthTokenType) {
    const key = this.key(userId, type);
    await this.client.del(key);
  }
}