import { Injectable, ConflictException } from '@nestjs/common';
import { createHash } from 'crypto';
import { RedisStorageRegistry } from '../../redis/redis-storage.registry';

@Injectable()
export class IdempotencyService {
  constructor(private readonly redis: RedisStorageRegistry) {}

  private USER_TTL = 1000 * 60 * 60 * 48;
  private GUEST_TTL = 1000 * 60 * 60 * 72;

  // ---------- HASH ----------
  private stableStringify(obj: any): string {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }

    if (Array.isArray(obj)) {
      return `[${obj.map((v) => this.stableStringify(v)).join(',')}]`;
    }

    return `{${Object.keys(obj)
      .sort()
      .map(
        (key) => `"${key}":${this.stableStringify(obj[key])}`,
      )
      .join(',')}}`;
  }

  private createHash(data: any): string {
    return createHash('sha256')
      .update(this.stableStringify(data))
      .digest('hex');
  }

  // ---------- MAIN ----------
  async handle(params: {
    key: string;
    operation: string;
    body: any;
    userId?: string;
  }) {
    const requestHash = this.createHash(params.body);

    const ttl = params.userId ? this.USER_TTL : this.GUEST_TTL;

    const existing = await this.redis.idempotency.get(
      params.key,
      params.userId,
    );

    // ---------- EXISTING ----------
    if (existing) {
      // 🔥 HASH CHECK (CRITICAL)
      if (existing.requestHash !== requestHash) {
        throw new ConflictException(
          'Idempotency key reused with different payload',
        );
      }

      if (existing.status === 'success') {
        return {
          type: 'cached',
          response: existing.response,
        };
      }

      if (existing.status === 'pending') {
        throw new ConflictException('Request already in progress');
      }
    }

    // ---------- CREATE LOCK ----------
    const locked = await this.redis.idempotency.createPending({
      key: params.key,
      userId: params.userId,
      operation: params.operation,
      requestHash,
      ttlMs: ttl,
    });

    if (!locked) {
      throw new ConflictException('Duplicate request');
    }

    return {
      type: 'new',
      requestHash,
    };
  }

  // ---------- SUCCESS ----------
  async success(params: {
    key: string;
    userId?: string;
    response: any;
    requestHash: string;
  }) {
    const ttl = params.userId ? this.USER_TTL : this.GUEST_TTL;

    await this.redis.idempotency.markSuccess({
      key: params.key,
      userId: params.userId,
      response: params.response,
      requestHash: params.requestHash,
      ttlMs: ttl,
    });
  }

  // ---------- ERROR ----------
  async error(params: {
    key: string;
    userId?: string;
  }) {
    await this.redis.idempotency.markError(params.key, params.userId);
  }
}