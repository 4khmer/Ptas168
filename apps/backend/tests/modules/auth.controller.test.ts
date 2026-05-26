import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const upsertUser = {
  id: 'u1',
  username: 'tg_99',
  fullName: 'Alice',
  phone: null,
  profileImage: null,
  role: 'manager',
  status: 'active',
  via: 'telegram',
  telegramId: 99n,
  telegramUsername: 'alice',
  firstName: 'Alice',
  lastName: null,
  languageCode: 'en',
  isPremium: false,
  passwordHash: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: new Date(),
}

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(async () => [{}]),
    $disconnect: vi.fn(async () => undefined),
    user: {
      findUnique: vi.fn(async () => upsertUser),
      upsert: vi.fn(async () => upsertUser),
      update: vi.fn(async () => upsertUser),
    },
  },
  disconnectPrisma: vi.fn(async () => undefined),
}))

vi.mock('../../src/modules/auth/telegram-validator', () => ({
  validateTelegramInitData: vi.fn(() => ({
    user: { id: 99, first_name: 'Alice', username: 'alice' },
    authDate: Math.floor(Date.now() / 1000),
    hash: 'x',
  })),
}))

import { buildApp } from '../../src/app'

describe('Auth controller', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('POST /api/auth/telegram → 200 + token + user', async () => {
    const app = buildApp()
    const res = await request(app).post('/api/auth/telegram').send({ initData: 'irrelevant' })
    expect(res.status).toBe(200)
    expect(typeof res.body.token).toBe('string')
    expect(res.body.user.id).toBe('u1')
    expect(res.body.user.role).toBe('manager')
  })

  it('GET /api/auth/me without token → 401', async () => {
    const app = buildApp()
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('UNAUTHORIZED')
  })

  it('GET /api/auth/me with valid token → 200 + user', async () => {
    const app = buildApp()
    const login = await request(app).post('/api/auth/telegram').send({ initData: 'x' })
    const token = login.body.token as string
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.id).toBe('u1')
  })

  it('POST /api/auth/login with empty body → 400 validation', async () => {
    const app = buildApp()
    const res = await request(app).post('/api/auth/login').send({})
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })
})
