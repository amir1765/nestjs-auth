import { Injectable, ForbiddenException } from '@nestjs/common';

import { RedisService } from '../redis.service';

@Injectable()
export class OTPVerifyLimitStore {
  private prefix = 'otp_verify_limit:';

  constructor(
    private readonly redisService: RedisService,
  ) {}

  private get client() {
    return this.redisService.getClient();
  }

  private key(key: string) {
    return `${this.prefix}${key}`;
  }

  // ===============================
  // 🚀 INCREMENT VERIFY ATTEMPTS
  // ===============================
  async increment(
    key: string,
    ttlSeconds = 600,
    maxAttempts = 10,
  ): Promise<void> {
    const redisKey = this.key(key);

    const count = await this.client.incr(redisKey);

    // first attempt → set expiry
    if (count === 1) {
      await this.client.expire(
        redisKey,
        ttlSeconds,
      );
    }

    if (count > maxAttempts) {
      throw new ForbiddenException(
        'Too many OTP verification attempts',
      );
    }
  }

  // ===============================
  // ♻️ RESET
  // ===============================
  async reset(key: string): Promise<void> {
    await this.client.del(this.key(key));
  }
}