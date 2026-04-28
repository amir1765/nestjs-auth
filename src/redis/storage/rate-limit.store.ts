import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis.service';

@Injectable()
export class RateLimitStore {
  private prefix = 'rl:';

  constructor(private redisService: RedisService) {}

  private get client() {
    return this.redisService.getClient();
  }

  async get(key: string) {
    const data = await this.client.get(this.prefix + key);
    return data ? JSON.parse(data) : null;
  }

  async set(key: string, value: any, ttlMs = 60 * 60 * 1000) {
    await this.client.set(
      this.prefix + key,
      JSON.stringify(value),
      'PX',
      ttlMs,
    );
  }
}