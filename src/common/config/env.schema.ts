//emv.schema.ts
import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),

  DATABASE_URL: z.string(),

  REDIS_HOST: z.string(),
  REDIS_PORT: z.coerce.number(),
  REDIS_PASSWORD: z.string().optional(),

  JWT_ACCESS_SECRET: z.string().min(64),

  JWT_ACCESS_EXPIRES: z.coerce.number(),
  JWT_REFRESH_EXPIRES: z.coerce.number().default(7),

  SESSION_ABSOLUTE_TIMEOUT: z.string(),

  ENCRYPTION_KEY: z.string(),
  CRYPTO_SECRET: z.string().length(64),
});
