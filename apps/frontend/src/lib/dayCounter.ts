/**
 * Day Counter logic for billing cycle.
 */

export type DayRingColor = 'grey' | 'amber' | 'red'

export function getDayCounter(date: Date = new Date()): number {
  return date.getDate()
}

export function getDaysInMonth(date: Date = new Date()): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

export function getDayRingColor(day: number): DayRingColor {
  if (day >= 28) return 'red'
  if (day >= 21) return 'amber'
  return 'grey'
}

export function getDayRingHex(day: number): string {
  if (day >= 28) return '#ff385c'
  if (day >= 21) return '#8A6408'
  return '#c1c1c1'
}

export function shouldShowStartBill(day: number, daysInCycle = 30): boolean {
  return day >= daysInCycle - 7
}

export function getMonthFraction(day: number, daysInMonth: number): number {
  return Math.min(day / daysInMonth, 1)
}

/**
 * Days elapsed in the current billing cycle, anchored on a contract's
 * start-date anniversary. Cycle is fixed at 30 days.
 */
export function getDaysSinceStart(
  startDate: string | Date | null | undefined,
  today: Date = new Date(),
): { day: number; daysInCycle: number } {
  const daysInCycle = 30
  if (!startDate) return { day: 0, daysInCycle }
  const start = new Date(startDate)
  if (Number.isNaN(start.getTime())) return { day: 0, daysInCycle }

  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  let cycleStart = new Date(todayDay.getFullYear(), todayDay.getMonth(), startDay.getDate())
  if (cycleStart > todayDay) {
    cycleStart = new Date(todayDay.getFullYear(), todayDay.getMonth() - 1, startDay.getDate())
  }
  if (cycleStart < startDay) cycleStart = startDay

  const oneDay = 24 * 60 * 60 * 1000
  const day = Math.max(0, Math.round((todayDay.getTime() - cycleStart.getTime()) / oneDay))
  return { day, daysInCycle }
}

export function formatMonthYear(date: Date = new Date()): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${mm} / ${date.getFullYear()}`
}

/** Alias of formatMonthYear — kept for backwards-compat. */
export function formatMonthYearShort(date: Date = new Date()): string {
  return formatMonthYear(date)
}
