/**
 * Display-format a phone number as groups of 3 digits separated by spaces:
 *   "012345678"   → "012 345 678"
 *   "0123456789"  → "012 345 6789"
 *   "+85512345678" → "+855 12 345 678"
 *
 * Strips every non-digit (except a leading '+') before grouping, so it
 * works on input that was stored with hyphens, dots, or spaces. Returns
 * the original value when there are fewer than 4 digits — nothing to
 * group meaningfully.
 */
export function formatPhone(value) {
  if (value == null) return ''
  const s = String(value).trim()
  if (!s) return ''

  const hasPlus = s.startsWith('+')
  const digits = s.replace(/\D/g, '')
  if (digits.length < 4) return s

  // Cambodia +855 → render as "+855 XX XXX XXX" (country, area, prefix, line)
  if (hasPlus && digits.startsWith('855')) {
    const local = digits.slice(3)
    return `+855 ${groupFromRight(local)}`.trim()
  }
  if (hasPlus) return `+${groupFromRight(digits)}`
  return groupFromRight(digits)
}

// Group digits into 3s from the right, so "12345678" → "12 345 678"
// and "123456789" → "123 456 789". This matches the "### ### ###"
// shape requested while degrading gracefully for shorter/longer numbers.
function groupFromRight(digits) {
  const parts = []
  let i = digits.length
  while (i > 0) {
    const start = Math.max(0, i - 3)
    parts.unshift(digits.slice(start, i))
    i = start
  }
  return parts.join(' ')
}
