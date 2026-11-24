import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

export const AUTH_STATE_PATH = path.resolve(process.cwd(), 'playwright/.auth/user.json');

const envSchema = z.object({
  USE_DEMO_APP: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  BASE_URL: z.string().url().default('http://127.0.0.1:4173'),
  API_URL: z.string().url().default('http://127.0.0.1:4173'),
  TEST_USER_EMAIL: z.string().email().default('qa.engineer@example.com'),
  TEST_USER_PASSWORD: z.string().min(6).default('Password123!'),
  CI_WORKERS: z.coerce.number().int().positive().default(2),
  TEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  EXPECT_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),
  API_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  throw new Error('Environment validation failed. Check your .env or CI variables.');
}

export const env = parsed.data;
