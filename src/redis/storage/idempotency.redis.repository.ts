import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis.service';

type IdemRecord = {
  status: 'pending' | 'success' | 'error';
  response?: any;
  requestHash: string;
  operation: string;
  createdAt: number;
};

@Injectable()
export class IdempotencyStore {
  private prefix = 'idem:';

  constructor(private redisService: RedisService) {}

  private get client() {
    return this.redisService.getClient();
  }

  private buildKey(key: string, userId?: string) {
    return userId
      ? `${this.prefix}user:${userId}:${key}`
      : `${this.prefix}guest:${key}`;
  }

  // ---------- FIND ----------
  async get(key: string, userId?: string): Promise<IdemRecord | null> {
    const data = await this.client.get(this.buildKey(key, userId));
    return data ? JSON.parse(data) : null;
  }

  // ---------- CREATE LOCK ----------
  async createPending(params: {
    key: string;
    userId?: string;
    operation: string;
    requestHash:string;
    ttlMs: number;
  }): Promise<boolean> {
    const redisKey = this.buildKey(params.key, params.userId);

    const record: IdemRecord = {
      status: 'pending',
      operation: params.operation,
      requestHash: params.requestHash,
      createdAt: Date.now(),
    };

    // 🔥 CRITICAL: NX (only set if NOT exists)
    const result = await this.client.set(
      redisKey,
      JSON.stringify(record),
      'PX',
      params.ttlMs,
      'NX',
    );

    return result === 'OK';
  }

  // ---------- SUCCESS ----------
  async markSuccess(params: {
    key: string;
    userId?: string;
    response: any;
    requestHash: string;
    ttlMs: number;
  }) {
    const redisKey = this.buildKey(params.key, params.userId);

    const record: IdemRecord = {
      status: 'success',
      response: params.response,
      requestHash:params.requestHash,
      operation: '', // optional
      createdAt: Date.now(),
    };

    await this.client.set(
      redisKey,
      JSON.stringify(record),
      'PX',
      params.ttlMs,
    );
  }

  // ---------- ERROR ----------
  async markError(key: string, userId?: string) {
    const redisKey = this.buildKey(key, userId);

    // delete → allows retry
    await this.client.del(redisKey);
  }
}