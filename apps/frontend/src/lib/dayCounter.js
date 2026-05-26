/**
 * Day Counter Logic for billing cycle
 */

/**
 * Get the day counter for the current month (1-indexed)
 * @param {Date} [date] - date to check (defaults to today)
 * @returns {number} day number (1 to days-in-month)
 */
export function getDayCounter(date = new Date()) {
  return date.getDate()
}

/**
 * Get total days in a given month
 * @param {Date} [date]
 * @returns {number}
 */
export function getDaysInMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

/**
 * Get ring color based on day counter
 * grey: 1-20, amber: 21-27, red: 28+
 * @param {number} day
 * @returns {'grey'|'amber'|'red'}
 */
export function getDayRingColor(day) {
  if (day >= 28) return 'red'
  if (day >= 21) return 'amber'
  return 'grey'
}

/**
 * Get Tailwind / hex color for the ring stroke
 * @param {number} day
 * @returns {string} hex color
 */
export function getDayRingHex(day) {
  if (day >= 28) return '#ff385c'   // blue (primary)
  if (day >= 21) return '#8A6408'   // amber
  return '#c1c1c1'                   // grey
}

/**
 * Whether "Start Bill" button should be shown.
 * True only in the last 7 days of the cycle — e.g. 23/30 → true, 5/30 → false.
 * @param {number} day
 * @param {number} [daysInCycle=30]
 * @returns {boolean}
 */
export function shouldShowStartBill(day, daysInCycle = 30) {
  return day >= daysInCycle - 7
}

/**
 * Get the fraction of the month that has passed
 * @param {number} day
 * @param {number} daysInMonth
 * @returns {number} 0.0 – 1.0
 */
export function getMonthFraction(day, daysInMonth) {
  return Math.min(day / daysInMonth, 1)
}

/**
 * Days elapsed in the current billing cycle, anchored on a contract's
 * start-date anniversary. Returns { day, daysInCycle }.
 *
 * Cycle is fixed at 30 days. day = today − most-recent monthly anniversary
 * of startDate (clamped at 0 for future contracts and at the contract's
 * actual start-day for the very first cycle).
 *
 * Example: startDate=2026-04-15, today=2026-04-28 → { day: 13, daysInCycle: 30 }
 *
 * @param {string|Date} startDate
 * @param {Date} [today]
 * @returns {{ day: number, daysInCycle: number }}
 */
export function getDaysSinceStart(startDate, today = new Date()) {
  const daysInCycle = 30
  if (!startDate) return { day: 0, daysInCycle }
  const start = new Date(startDate)
  if (Number.isNaN(start.getTime())) return { day: 0, daysInCycle }

  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  // Most recent monthly anniversary of startDate that is ≤ today
  let cycleStart = new Date(todayDay.getFullYear(), todayDay.getMonth(), startDay.getDate())
  if (cycleStart > todayDay) {
    cycleStart = new Date(todayDay.getFullYear(), todayDay.getMonth() - 1, startDay.getDate())
  }
  if (cycleStart < startDay) cycleStart = startDay

  const oneDay = 24 * 60 * 60 * 1000
  const day = Math.max(0, Math.round((todayDay - cycleStart) / oneDay))
  return { day, daysInCycle }
}

/**
 * Format a Date as "05 / 2026" for display. Both the "long" and
 * "short" variants now share the same numeric format — callers that
 * cared about the verbose-vs-terse distinction can be migrated to
 * formatShortDate from lib/date.js directly.
 * @param {Date} [date]
 * @returns {string}
 */
export function formatMonthYear(date = new Date()) {
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${mm} / ${date.getFullYear()}`
}

/** Alias of formatMonthYear — kept for backwards-compat. */
export function formatMonthYearShort(date = new Date()) {
  return formatMonthYear(date)
}
