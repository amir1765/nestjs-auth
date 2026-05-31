import { Injectable, ForbiddenException } from '@nestjs/common';
import { RedisService } from '../redis.service';
import { EmailOTPType } from '@prisma/client';

@Injectable()
export class EmailLimitStore {
  private prefix = 'email_limit:';

  constructor(private redisService: RedisService) {}

  private get client() {
    return this.redisService.getClient();
  }

  private key(userId: string, type: EmailOTPType) {
    return `${this.prefix}${userId}:${type}`;
  }

  /**
   * 🚀 Increment send count
   */
  async increment(
    userId: string,
    type: EmailOTPType,
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
  async get(userId: string, type: EmailOTPType): Promise<number> {
    const key = this.key(userId, type);
    const val = await this.client.get(key);
    return val ? Number(val) : 0;
  }

  /**
   * ♻️ Reset (optional after success)
   */
  async reset(userId: string, type: EmailOTPType) {
    const key = this.key(userId, type);
    await this.client.del(key);
  }
}