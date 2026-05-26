import { useMemo } from 'react'
import { useStore } from '../../store'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * Aggregates the invoices store into monthly buckets for the Outstanding
 * Balance and Monthly Collections charts. Computes everything client-side
 * from the already-loaded `invoices` cache, so no extra round-trips.
 *
 * Series per month (year-scoped to `year`):
 *   expected    — sum(total) of invoices whose billing period starts in this month
 *   collected   — sum(total) of invoices paid (`paidAt`) in this month
 *   outstanding — running balance: cumulative expected − cumulative collected
 *                 through end-of-month (clamped at zero)
 *   overdue     — as-of end-of-month, sum(total) of progress invoices with
 *                 dueDate strictly before that point
 */
export function useReportSeries(year = new Date().getFullYear()) {
  const invoices = useStore(s => s.invoices)

  return useMemo(() => {
    const months = MONTH_LABELS.map(label => ({
      label,
      expected: 0,
      collected: 0,
      outstanding: 0,
      overdue: 0,
    }))

    for (const inv of invoices) {
      const start = inv.periodStart ? new Date(inv.periodStart) : null
      if (start && start.getFullYear() === year) {
        months[start.getMonth()].expected += Number(inv.total) || 0
      }
      if (inv.status === 'paid' && inv.paidAt) {
        const paid = new Date(inv.paidAt)
        if (paid.getFullYear() === year) {
          months[paid.getMonth()].collected += Number(inv.total) || 0
        }
      }
    }

    let cumExpected = 0
    let cumCollected = 0
    for (let m = 0; m < 12; m++) {
      cumExpected += months[m].expected
      cumCollected += months[m].collected
      months[m].outstanding = Math.max(0, cumExpected - cumCollected)
    }

    for (let m = 0; m < 12; m++) {
      const eom = new Date(year, m + 1, 0)
      let overdue = 0
      for (const inv of invoices) {
        if (inv.status !== 'progress') continue
        const due = inv.dueDate ? new Date(inv.dueDate) : null
        if (due && due <= eom) overdue += Number(inv.total) || 0
      }
      months[m].overdue = overdue
    }

    return { year, months }
  }, [invoices, year])
}

export function fmtAxisMoney(n) {
  if (n >= 1000) return `$${Math.round(n / 100) / 10}k`
  return `$${Math.round(n)}`
}

/**
 * Aggregates meter usage from the invoices store into monthly buckets.
 *   water       — sum(currentReading − previousReading) for the month's
 *                 WATER line items (m³)
 *   electricity — same, for ELECTRICITY line items (kWh)
 *
 * Usage is attributed to the month of `inv.periodStart` (same bucket
 * used by the Outstanding Balance / Monthly Collections charts), so all
 * three charts read consistent x-axis values.
 */
export function useUsageSeries(year = new Date().getFullYear()) {
  const invoices = useStore(s => s.invoices)

  return useMemo(() => {
    const months = MONTH_LABELS.map(label => ({ label, water: 0, electricity: 0 }))

    for (const inv of invoices) {
      const start = inv.periodStart ? new Date(inv.periodStart) : null
      if (!start || start.getFullYear() !== year) continue
      const m = start.getMonth()
      if (inv.waterPrev != null && inv.waterCurrent != null) {
        const w = Number(inv.waterCurrent) - Number(inv.waterPrev)
        if (Number.isFinite(w) && w > 0) months[m].water += w
      }
      if (inv.elecPrev != null && inv.elecCurrent != null) {
        const e = Number(inv.elecCurrent) - Number(inv.elecPrev)
        if (Number.isFinite(e) && e > 0) months[m].electricity += e
      }
    }

    return { year, months }
  }, [invoices, year])
}

export function fmtAxisCount(n) {
  if (n >= 1000) return `${Math.round(n / 100) / 10}k`
  return `${Math.round(n)}`
}
