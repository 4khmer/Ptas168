/**
 * Billing calculation functions for PBMS.
 */

export type InvoiceStatus = 'progress' | 'paid' | 'overdue' | 'cancelled' | string

export interface CalcInvoiceTotalInput {
  baseRent: number
  billDays: number
  daysInMonth: number
  waterCurrent: number
  waterPrev: number
  waterRate: number
  elecCurrent: number
  elecPrev: number
  elecRate: number
  fixedServices?: Array<{ amount?: number | null }>
}

export interface CalcInvoiceTotalResult {
  rentAmount: number
  waterUsage: number
  waterAmount: number
  elecUsage: number
  elecAmount: number
  servicesAmount: number
  subtotal: number
  total: number
}

export function calcProratedRent(baseRent: number, billDays: number, daysInMonth: number): number {
  return baseRent * (billDays / daysInMonth)
}

export function calcUtility(current: number, prev: number, rate: number): number {
  const usage = Math.max(0, current - prev)
  return usage * rate
}

export function calcInvoiceTotal({
  baseRent,
  billDays,
  daysInMonth,
  waterCurrent,
  waterPrev,
  waterRate,
  elecCurrent,
  elecPrev,
  elecRate,
  fixedServices = [],
}: CalcInvoiceTotalInput): CalcInvoiceTotalResult {
  const rentAmount = calcProratedRent(baseRent, billDays, daysInMonth)
  const waterUsage = Math.max(0, waterCurrent - waterPrev)
  const waterAmount = waterUsage * waterRate
  const elecUsage = Math.max(0, elecCurrent - elecPrev)
  const elecAmount = elecUsage * elecRate
  const servicesAmount = fixedServices.reduce((sum, s) => sum + (s.amount || 0), 0)

  const subtotal = rentAmount + waterAmount + elecAmount + servicesAmount
  const total = subtotal

  return {
    rentAmount,
    waterUsage,
    waterAmount,
    elecUsage,
    elecAmount,
    servicesAmount,
    subtotal,
    total,
  }
}

export function formatUSD(amount: number, decimals = 2): string {
  return `$${Number(amount).toFixed(decimals)}`
}

export function formatKHR(amountUSD: number, exchangeRate = 4000): string {
  const khr = amountUSD * exchangeRate
  return `${khr.toLocaleString('en-US', { maximumFractionDigits: 0 })} ៛`
}

export function calcDueDate(startDate: string, offsetDays: number): string {
  const d = new Date(startDate)
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().split('T')[0]
}

export function resolveInvoiceStatus(status: string, dueDate: string): InvoiceStatus {
  if (status === 'paid' || status === 'cancelled') return status
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  if (today > due && status === 'progress') return 'overdue'
  return status
}

export function getDaysInMonthByYM(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function generateInvoiceId(periodStart: string, roomId: string): string {
  const d = new Date(periodStart)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `INV-${year}-${month}-${roomId}`
}
