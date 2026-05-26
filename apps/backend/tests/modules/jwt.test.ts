import { describe, expect, it } from 'vitest'
import { signJwt, verifyJwt } from '../../src/utils/jwt'

describe('jwt utils', () => {
  it('signs and verifies a payload round-trip', () => {
    const token = signJwt({ userId: 'u1', role: 'manager' })
    expect(typeof token).toBe('string')
    const decoded = verifyJwt(token)
    expect(decoded.userId).toBe('u1')
    expect(decoded.role).toBe('manager')
  })

  it('rejects a tampered token', () => {
    const token = signJwt({ userId: 'u1', role: 'manager' })
    const tampered = token.slice(0, -3) + 'aaa'
    expect(() => verifyJwt(tampered)).toThrow(/invalid|expired/i)
  })

  it('rejects garbage', () => {
    expect(() => verifyJwt('not-a-jwt')).toThrow()
  })
})
