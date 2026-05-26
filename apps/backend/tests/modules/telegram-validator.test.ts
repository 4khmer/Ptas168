import crypto from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { validateTelegramInitData } from '../../src/modules/auth/telegram-validator'

const BOT_TOKEN = 'test_bot_token_12345'

function buildInitData(
  overrides: Partial<{
    user: Record<string, unknown>
    auth_date: number
    hashOverride?: string
    token: string
    skipHash?: boolean
  }> = {},
): string {
  const auth_date = overrides.auth_date ?? Math.floor(Date.now() / 1000)
  const user = JSON.stringify(
    overrides.user ?? { id: 12345, first_name: 'Alice', last_name: 'A', username: 'alice' },
  )
  const params = new URLSearchParams({
    user,
    auth_date: String(auth_date),
    query_id: 'AAH123',
  })
  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(overrides.token ?? BOT_TOKEN).digest()
  const hash = overrides.hashOverride ?? crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')
  if (!overrides.skipHash) params.append('hash', hash)
  return params.toString()
}

describe('validateTelegramInitData', () => {
  it('passes for a freshly signed payload', () => {
    const initData = buildInitData()
    const result = validateTelegramInitData(initData, BOT_TOKEN)
    expect(result.user.id).toBe(12345)
    expect(result.user.first_name).toBe('Alice')
  })

  it('fails when hash is wrong', () => {
    const initData = buildInitData({ hashOverride: 'a'.repeat(64) })
    expect(() => validateTelegramInitData(initData, BOT_TOKEN)).toThrow(/hash mismatch/i)
  })

  it('fails when hash is missing', () => {
    const initData = buildInitData({ skipHash: true })
    expect(() => validateTelegramInitData(initData, BOT_TOKEN)).toThrow(/missing hash/i)
  })

  it('fails when auth_date is older than 24 hours', () => {
    const initData = buildInitData({ auth_date: Math.floor(Date.now() / 1000) - 60 * 60 * 25 })
    expect(() => validateTelegramInitData(initData, BOT_TOKEN)).toThrow(/expired/i)
  })

  it('fails when a field is tampered after signing', () => {
    let initData = buildInitData()
    initData = initData.replace('Alice', 'Mallory')
    expect(() => validateTelegramInitData(initData, BOT_TOKEN)).toThrow(/hash mismatch/i)
  })

  it('fails when bot token is wrong', () => {
    const initData = buildInitData()
    expect(() => validateTelegramInitData(initData, 'WRONG_TOKEN')).toThrow(/hash mismatch/i)
  })
})
