// idempotency.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IDEMPOTENCY_KEY = 'IDEMPOTENCY_KEY';

export const Idempotent = (operation: string) =>
  SetMetadata(IDEMPOTENCY_KEY, operation);
console.log(IDEMPOTENCY_KEY);