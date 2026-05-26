import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'

// Stub Prisma so app.ts can import without a live DB
vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(async () => [{ '?column?': 1 }]),
    $disconnect: vi.fn(async () => undefined),
  },
  disconnectPrisma: vi.fn(async () => undefined),
}))

import { buildApp } from '../../src/app'

describe('GET /api/health', () => {
  it('returns ok with timestamp + uptime', async () => {
    const app = buildApp()
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
    expect(typeof res.body.timestamp).toBe('string')
    expect(typeof res.body.uptime).toBe('number')
  })
})

describe('GET /api/health/db', () => {
  it('returns ok when DB query succeeds', async () => {
    const app = buildApp()
    const res = await request(app).get('/api/health/db')
    expect(res.status).toBe(200)
    expect(res.body.db).toBe('reachable')
  })
})
