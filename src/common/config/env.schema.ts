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

  ADMIN_EMAIL:z.email(),
  ADMIN_PASSWORD: z
    .string()
    .min(16, 'ADMIN_PASSWORD must be at least 16 characters')
    .max(64, 'ADMIN_PASSWORD must be at most 64 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character')
    .refine((val) => !/\s/.test(val), {
      message: 'Password must not contain spaces',
    }),
  SESSION_ABSOLUTE_TIMEOUT: z.string(),

  ENCRYPTION_KEY: z.string(),
  CRYPTO_SECRET: z.string().length(64),
});
