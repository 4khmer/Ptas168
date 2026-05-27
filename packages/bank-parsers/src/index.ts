import type { BankParser, ParsedBankPayment } from './types.js'
import { parseAba } from './aba.js'

// Order matters — first matching parser wins. Add new banks here.
const PARSERS: BankParser[] = [
  parseAba,
]

/** Try every registered bank parser in order; return the first match. */
export function parseBankPayment(text: string): ParsedBankPayment | null {
  for (const fn of PARSERS) {
    const result = fn(text)
    if (result) return result
  }
  return null
}

export type { ParsedBankPayment, BankParser } from './types.js'
export { parseAba } from './aba.js'
