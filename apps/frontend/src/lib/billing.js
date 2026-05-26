/**
 * Billing calculation functions for PBMS
 */

/**
 * Calculate prorated rent
 * @param {number} baseRent - monthly base rent in USD
 * @param {number} billDays - number of days in billing period
 * @param {number} daysInMonth - total days in the billing month
 * @returns {number}
 */
export function calcProratedRent(baseRent, billDays, daysInMonth) {
  return baseRent * (billDays / daysInMonth)
}

/**
 * Calculate utility cost (water or electricity)
 * @param {number} current - current meter reading
 * @param {number} prev - previous meter reading
 * @param {number} rate - rate per unit
 * @returns {number}
 */
export function calcUtility(current, prev, rate) {
  const usage = Math.max(0, current - prev)
  return usage * rate
}

/**
 * Calculate the full invoice total
 * @param {object} params
 * @param {number} params.baseRent
 * @param {number} params.billDays
 * @param {number} params.daysInMonth
 * @param {number} params.waterCurrent
 * @param {number} params.waterPrev
 * @param {number} params.waterRate
 * @param {number} params.elecCurrent
 * @param {number} params.elecPrev
 * @param {number} params.elecRate
 * @param {Array<{amount: number}>} params.fixedServices
 * @returns {{
 *   rentAmount: number,
 *   waterUsage: number,
 *   waterAmount: number,
 *   elecUsage: number,
 *   elecAmount: number,
 *   servicesAmount: number,
 *   subtotal: number,
 *   total: number
 * }}
 */
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
}) {
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

/**
 * Format a number as USD currency string
 * @param {number} amount
 * @param {number} [decimals=2]
 * @returns {string}
 */
export function formatUSD(amount, decimals = 2) {
  return `$${Number(amount).toFixed(decimals)}`
}

/**
 * Format a number as KHR currency string
 * @param {number} amountUSD
 * @param {number} exchangeRate - KHR per USD
 * @returns {string}
 */
export function formatKHR(amountUSD, exchangeRate = 4000) {
  const khr = amountUSD * exchangeRate
  return `${khr.toLocaleString('en-US', { maximumFractionDigits: 0 })} ៛`
}

/**
 * Get due date from invoice start date and offset days
 * @param {string} startDate - ISO date string
 * @param {number} offsetDays - 7, 14, or 30
 * @returns {string} ISO date string
 */
export function calcDueDate(startDate, offsetDays) {
  const d = new Date(startDate)
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().split('T')[0]
}

/**
 * Determine invoice status based on due date and current status
 * @param {string} status - current status
 * @param {string} dueDate - ISO date string
 * @returns {string} updated status
 */
export function resolveInvoiceStatus(status, dueDate) {
  if (status === 'paid' || status === 'cancelled') return status
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  if (today > due && status === 'progress') return 'overdue'
  return status
}

/**
 * Get days in a given month by year and month (1-indexed)
 * @param {number} year
 * @param {number} month - 1-indexed
 * @returns {number}
 */
export function getDaysInMonthByYM(year, month) {
  return new Date(year, month, 0).getDate()
}

/**
 * Generate a simple invoice ID
 * @param {string} periodStart - ISO date string (YYYY-MM-DD)
 * @param {string} roomId
 * @returns {string}
 */
export function generateInvoiceId(periodStart, roomId) {
  const d = new Date(periodStart)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `INV-${year}-${month}-${roomId}`
}
