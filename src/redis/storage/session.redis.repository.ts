import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis.service';

export type CachedSession = {
  userId: string;
  isRevoked: boolean;
};

@Injectable()
export class SessionStore {
  private prefix = 'session:';

  constructor(private readonly redisService: RedisService) {}

  private get client() {
    return this.redisService.getClient();
  }

  async get(sessionId: string): Promise<CachedSession | null> {
    const data = await this.client.get(this.prefix + sessionId);
    return data ? JSON.parse(data) : null;
  }

  // ===============================
  // 📦 SET WITH EXPIRE SAT (CLEAN DESIGN)
  // ===============================
  async set(
    sessionId: string,
    value: CachedSession,
    expiresAt: Date,
  ) {
    const ttl = this.getTTLSeconds(expiresAt);

    await this.client.set(
      this.prefix + sessionId,
      JSON.stringify(value),
      'EX',
      ttl,
    );
  }

  async del(sessionId: string) {
    await this.client.del(this.prefix + sessionId);
  }

  // ===============================
  // ⏳ TTL CALC
  // ===============================
  private getTTLSeconds(expiresAt: Date): number {
    const ttl = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
    return ttl > 0 ? ttl : 1;
  }
}