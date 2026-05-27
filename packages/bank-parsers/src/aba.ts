import type { ParsedBankPayment } from './types.js'

const AMOUNT_RE = String.raw`\d{1,3}(?:[,\s]\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?`
const CURRENCY_RE = String.raw`USD|KHR|US\$|\$|RIEL|៛`

/**
 * ABA Bank payment-confirmation message parser.
 *
 * Sample:
 *   "0.10 USD is paid by KHQR Lay Bunnavitou(*616) on Sep 30, 2024 13:43:49
 *    at DingDing by B.LAY with Transaction ID: 172767862874229, APV: 310982"
 *
 * Returns null if the message doesn't match — caller can try the next parser.
 */
export function parseAba(text: string): ParsedBankPayment | null {
  const t = text.replace(/\s+/g, ' ').trim()
  const money = findAmountCurrency(t)
  const transactionId = findTransactionId(t)
  if (!money || !transactionId) return null

  const paidAt = findPaidAt(t) ?? new Date()
  const sender = findSender(t)
  const apv = findValue(t, [
    /\bAPV\s*:?\s*([A-Za-z0-9-]+)/i,
    /\bApproval\s*(?:Code|No\.?)?\s*:?\s*([A-Za-z0-9-]+)/i,
  ])

  return {
    bank: detectBank(t),
    amount: money.amount,
    currency: money.currency,
    senderName: sender.name,
    senderAccount: sender.account,
    transactionId,
    apv: apv || null,
    paidAt,
  }
}

function detectBank(text: string): string {
  if (/\bACLEDA\b/i.test(text)) return 'ACLEDA'
  if (/\bABA\b/i.test(text)) return 'ABA'
  return 'ABA'
}

function findAmountCurrency(text: string): { amount: string; currency: 'USD' | 'KHR' } | null {
  const patterns = [
    new RegExp(`^\\s*(${AMOUNT_RE})\\s*(${CURRENCY_RE})\\b`, 'i'),
    new RegExp(`^\\s*(${CURRENCY_RE})\\s*(${AMOUNT_RE})\\b`, 'i'),
    new RegExp(`\\b(?:amount|paid|received|credited|transfer(?:red)?)(?:\\s+amount)?\\s*:?\\s*(${AMOUNT_RE})\\s*(${CURRENCY_RE})\\b`, 'i'),
    new RegExp(`\\b(?:amount|paid|received|credited|transfer(?:red)?)(?:\\s+amount)?\\s*:?\\s*(${CURRENCY_RE})\\s*(${AMOUNT_RE})\\b`, 'i'),
    new RegExp(`\\b(${AMOUNT_RE})\\s*(${CURRENCY_RE})\\b\\s+(?:is\\s+paid|paid|received|credited|transfer(?:red)?)`, 'i'),
    new RegExp(`\\b(${CURRENCY_RE})\\s*(${AMOUNT_RE})\\b\\s+(?:is\\s+paid|paid|received|credited|transfer(?:red)?)`, 'i'),
  ]

  for (const re of patterns) {
    const m = re.exec(text)
    if (!m) continue
    const first = m[1]
    const second = m[2]
    const currencyFirst = normalizeCurrency(first)
    const currencySecond = normalizeCurrency(second)
    const currency = currencyFirst ?? currencySecond
    const amount = currencyFirst ? second : first
    if (!currency) continue
    return { amount: normalizeAmount(amount), currency }
  }

  return null
}

function normalizeAmount(value: string): string {
  return value.replace(/[,\s]/g, '')
}

function normalizeCurrency(value: string): 'USD' | 'KHR' | null {
  const c = value.trim().toUpperCase()
  if (c === 'USD' || c === '$' || c === 'US$') return 'USD'
  if (c === 'KHR' || c === 'RIEL' || c === '៛') return 'KHR'
  return null
}

function findTransactionId(text: string): string | null {
  return findValue(text, [
    /\bTransaction\s+ID\s*:?\s*([A-Za-z0-9-]+)/i,
    /\b(?:Txn|Trx)\.?\s*(?:ID|No\.?|Number)?\s*:?\s*([A-Za-z0-9-]+)/i,
    /\bReference\s*(?:ID|No\.?|Number)?\s*:?\s*([A-Za-z0-9-]+)/i,
    /\bRef\.?\s*(?:ID|No\.?|Number)?\s*:?\s*([A-Za-z0-9-]+)/i,
  ])
}

function findSender(text: string): { name: string | null; account: string | null } {
  const paidBy = /\bpaid\s+by\s+(?:KHQR\s+)?(.+?)\s*\(\s*\*?([^)]+)\s*\)(?:\s+on\b|\s+at\b|\s+with\b|,|$)/i.exec(text)
  if (paidBy) {
    return {
      name: cleanSenderName(paidBy[1]),
      account: cleanAccount(paidBy[2]),
    }
  }

  const labeledName = findValue(text, [
    /\b(?:Sender|Payer|Customer|From)\s*:?\s*([^,]+?)(?:\s{2,}|,|\b(?:Account|Transaction|Txn|Trx|Ref|Date)\b|$)/i,
  ])
  const account = findValue(text, [
    /\(\s*\*?([^)]+)\s*\)/i,
    /\b(?:Account|Acc)\s*(?:No\.?|Number)?\s*:?\s*\*?([A-Za-z0-9-]+)/i,
  ])

  return {
    name: cleanSenderName(labeledName),
    account: cleanAccount(account),
  }
}

function cleanSenderName(value: string | null): string | null {
  if (!value) return null
  const cleaned = value
    .replace(/\b(?:KHQR|ABA\s+PAY|ABA)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned || null
}

function cleanAccount(value: string | null): string | null {
  if (!value) return null
  const cleaned = value.replace(/^\*+/, '').trim()
  return cleaned || null
}

function findPaidAt(text: string): Date | null {
  const onMatch = /\bon\s+(.+?)(?:\s+at\s+|\s+with\s+Transaction\b|\s+Transaction\b|,\s*APV\b|$)/i.exec(text)
  if (onMatch) {
    const parsed = parseBankDate(onMatch[1])
    if (parsed) return parsed
  }

  const labeled = findValue(text, [
    /\b(?:Paid\s+At|Date(?:\/Time)?|Transaction\s+Date|Time)\s*:?\s*([^,]+(?:,\s*\d{4})?(?:\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)?)/i,
  ])
  return labeled ? parseBankDate(labeled) : null
}

function parseBankDate(value: string): Date | null {
  const cleaned = value.replace(/\s+/g, ' ').trim()
  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i.exec(cleaned)
  if (dmy) {
    const [, dd, mm, yyyy, hh = '0', min = '0', sec = '0', ampm] = dmy
    const year = yyyy.length === 2 ? `20${yyyy}` : yyyy
    let hour = Number(hh)
    if (ampm?.toUpperCase() === 'PM' && hour < 12) hour += 12
    if (ampm?.toUpperCase() === 'AM' && hour === 12) hour = 0
    const date = new Date(Number(year), Number(mm) - 1, Number(dd), hour, Number(min), Number(sec))
    return Number.isNaN(date.getTime()) ? null : date
  }

  const parsed = new Date(cleaned)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function findValue(text: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const m = re.exec(text)
    if (m?.[1]) return m[1].trim()
  }
  return null
}
