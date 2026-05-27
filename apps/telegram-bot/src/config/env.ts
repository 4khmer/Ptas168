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
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  // Optional — when blank, the bot skips Telegram polling but still
  // processes the telegram-send BullMQ queue (no-op send).
  TELEGRAM_BOT_TOKEN: z.string().optional().default(''),
})

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid telegram-bot environment:')
  for (const issue of parsed.error.issues) {
    // eslint-disable-next-line no-console
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`)
  }
  process.exit(1)
}

export const env = parsed.data
export type Env = typeof env
