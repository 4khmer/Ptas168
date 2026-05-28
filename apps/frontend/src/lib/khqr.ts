/**
 * Bakong KHQR (EMVCo Merchant-Presented Mode) parser.
 *
 * KHQR payloads are TLV-encoded ASCII strings. We need just enough
 * fields to render the standard KHQR card: merchant name, bank, currency.
 * Reference: https://bakong.nbc.gov.kh / EMVCo MPM spec.
 */

export interface KHQRInfo {
  isKhqr: true
  merchantName: string
  accountId: string
  bankCode: string
  bankName: string
  currency: string
  amount: string
  merchantCity: string
}

// Bank-code → display name. Codes appear after the @ in the Bakong
// account id (sub-tag 01 of root tag 29). Map covers the major Cambodian
// member banks; unknown codes fall back to UPPERCASE.
const BANK_NAMES: Record<string, string> = {
  aba:         'ABA Bank',
  aclb:        'ACLEDA Bank',
  acleda:      'ACLEDA Bank',
  campu:       'CAMPU Bank',
  cambodia:    'Cambodia Asia Bank',
  cab:         'Cambodia Asia Bank',
  cabp:        'Cambodia Asia Bank',
  canadia:     'Canadia Bank',
  cardf:       'Cardif',
  ftb:         'Foreign Trade Bank',
  hatha:       'Hattha Bank',
  jtrust:      'J Trust Royal Bank',
  jtrustroyal: 'J Trust Royal Bank',
  maybank:     'Maybank',
  payway:      'Wing',
  ppcb:        'Phnom Penh Commercial Bank',
  prince:      'Prince Bank',
  rhb:         'RHB Bank',
  sathapana:   'Sathapana Bank',
  shinhan:     'Shinhan Bank',
  vattanac:    'Vattanac Bank',
  woori:       'Woori Bank',
  camko:       'Camko Bank',
}

const CURRENCY_BY_CODE: Record<string, string> = {
  '116': 'KHR',
  '840': 'USD',
}

function parseTLV(payload: string): Record<string, string> {
  const out: Record<string, string> = {}
  let i = 0
  while (i + 4 <= payload.length) {
    const tag = payload.slice(i, i + 2)
    const len = parseInt(payload.slice(i + 2, i + 4), 10)
    if (Number.isNaN(len) || i + 4 + len > payload.length) break
    out[tag] = payload.slice(i + 4, i + 4 + len)
    i += 4 + len
  }
  return out
}

/**
 * Parse a QR payload as KHQR. Returns a struct when the payload looks
 * like a Bakong KHQR (country=KH and a Bakong-marked merchant tag),
 * otherwise null. Callers can fall back to a plain QR render when null.
 */
export function parseKHQR(text: unknown): KHQRInfo | null {
  if (!text || typeof text !== 'string' || text.length < 20) return null
  if (!text.startsWith('00')) return null

  let root: Record<string, string>
  try { root = parseTLV(text) } catch { return null }

  if (root['58'] !== 'KH') return null

  // Bakong info lives in one of the merchant-account tags 26–32.
  // Tag 29 is the most common; older payloads may use 30.
  let bakong: Record<string, string> | null = null
  for (const tag of ['29', '30', '28', '27', '26', '31', '32']) {
    const raw = root[tag]
    if (!raw) continue
    const inner = parseTLV(raw)
    const guid = (inner['00'] || '').toLowerCase()
    if (guid.includes('bakong')) { bakong = inner; break }
  }
  if (!bakong) return null

  const accountId = bakong['01'] || ''
  const bankCode = accountId.includes('@') ? accountId.split('@').pop() || '' : ''
  const merchantName = (root['59'] || '').trim()
  const merchantCity = (root['60'] || '').trim()
  const currencyCode = root['53'] || ''
  const currency = CURRENCY_BY_CODE[currencyCode] || currencyCode
  const amount = root['54'] || ''

  return {
    isKhqr: true,
    merchantName,
    accountId,
    bankCode,
    bankName: BANK_NAMES[bankCode.toLowerCase()] || (bankCode ? bankCode.toUpperCase() : ''),
    currency,
    amount,
    merchantCity,
  }
}
