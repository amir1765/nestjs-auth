import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContextData {
  ip: string ;
  userAgent?: string ;
  requestId: string;
  fingerprint?: string ;

  // future (we’ll use later)
  userId?: string;
  sessionId?: string;
}

@Injectable()
export class RequestContextService {
  private readonly als = new AsyncLocalStorage<RequestContextData>();

  run(data: RequestContextData, callback: () => void) {
    this.als.run(data, callback);
  }

  get(): RequestContextData {
    const store = this.als.getStore();

    if (!store) {
      throw new Error('RequestContext not initialized');
    }

    return store;
  }

  // optional helper (nice to have)
  set(partial: Partial<RequestContextData>) {
    const store = this.get();
    Object.assign(store, partial);
  }
}