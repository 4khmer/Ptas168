// Test environment defaults — required before importing config/env.ts
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test'
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test_jwt_secret_with_at_least_32_characters_xx'
process.env.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? 'test_bot_token'
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/ptas168_test'
process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? 'error'
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173'
process.env.PORT = process.env.PORT ?? '3001'
