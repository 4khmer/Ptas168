/**
 * App-wide date display formatters.
 *
 * Full date  → "DD / MM / YYYY"  (e.g. "22 / 05 / 2026")
 * Short date → "MM / YYYY"       (e.g. "05 / 2026")
 *
 * Both accept anything `new Date(value)` understands: ISO strings,
 * millisecond timestamps, or Date instances. Falsy / invalid input
 * returns '' so callers can pipe straight to JSX without guarding.
 */

function toDate(value) {
  if (value == null || value === '') return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

/** "22 / 05 / 2026" */
export function formatFullDate(value) {
  const d = toDate(value)
  if (!d) return ''
  return `${pad2(d.getDate())} / ${pad2(d.getMonth() + 1)} / ${d.getFullYear()}`
}

/** "05 / 2026" — for invoice/billing period titles. */
export function formatShortDate(value) {
  const d = toDate(value)
  if (!d) return ''
  return `${pad2(d.getMonth() + 1)} / ${d.getFullYear()}`
}

/** "22 / 05 / 2026 14:30" — full date plus 24h time, for log/notification lines. */
export function formatDateTime(value) {
  const d = toDate(value)
  if (!d) return ''
  return `${formatFullDate(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}
