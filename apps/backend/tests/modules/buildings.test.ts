import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const buildings = [
  { id: 'b1', name: 'Tower A', remark: null, createdAt: new Date(), updatedAt: new Date() },
]

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(async () => [{}]),
    $disconnect: vi.fn(async () => undefined),
    building: {
      findMany: vi.fn(async () => buildings),
      findUnique: vi.fn(async () => buildings[0] ?? null),
      create: vi.fn(async ({ data }: { data: { name: string; remark: string | null } }) => ({
        id: 'new', name: data.name, remark: data.remark, createdAt: new Date(), updatedAt: new Date(),
      })),
    },
  },
  disconnectPrisma: vi.fn(async () => undefined),
}))

import { buildApp } from '../../src/app'
import { signJwt } from '../../src/utils/jwt'

const TOKEN = signJwt({ userId: 'u1', role: 'owner' })

describe('Buildings module', () => {
  beforeEach(() => vi.clearAllMocks())

  it('GET /api/buildings → list (auth required)', async () => {
    const app = buildApp()
    const noAuth = await request(app).get('/api/buildings')
    expect(noAuth.status).toBe(401)

    const ok = await request(app).get('/api/buildings').set('Authorization', `Bearer ${TOKEN}`)
    expect(ok.status).toBe(200)
    expect(Array.isArray(ok.body)).toBe(true)
    expect(ok.body[0]).toMatchObject({ id: 'b1', name: 'Tower A', remark: '' })
  })

  it('POST /api/buildings → 201 with new row', async () => {
    const app = buildApp()
    const res = await request(app)
      .post('/api/buildings')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ name: 'New Annex', remark: 'shed' })
    expect(res.status).toBe(201)
    expect(res.body.name).toBe('New Annex')
  })

  it('POST /api/buildings rejects unknown fields (.strict)', async () => {
    const app = buildApp()
    const res = await request(app)
      .post('/api/buildings')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ name: 'X', extra: 'nope' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })
})
