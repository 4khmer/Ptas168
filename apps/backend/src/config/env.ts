import dotenv from 'dotenv'
import path from 'node:path'
import { z } from 'zod'

const envFile = process.env.NODE_ENV === 'production'
  ? '.env.production'
  : process.env.NODE_ENV === 'test'
    ? '.env.test'
    : '.env.development'

dotenv.config({ path: path.resolve(process.cwd(), envFile) })

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().regex(/^\d+$/).transform(Number).default('3000'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  TELEGRAM_BOT_TOKEN: z.string().min(1, 'TELEGRAM_BOT_TOKEN is required'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  UPLOAD_DIR: z.string().optional(),
  FILE_URL_BASE: z.string().optional(),
  API_BASE_PATH: z.string().regex(/^\/[^?#]*$/, 'API_BASE_PATH must start with /').default('/api'),
  TELEGRAM_BANK_BOT_TOKEN: z.string().optional(),
  TELEGRAM_BANK_WEBHOOK_SECRET: z.string().optional(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment configuration:')
  for (const issue of parsed.error.issues) {
    // eslint-disable-next-line no-console
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`)
  }
  process.exit(1)
}

export const env = parsed.data
export type Env = typeof env
