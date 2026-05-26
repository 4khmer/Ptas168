import type { InvoiceDto } from '../../utils/adapters'

function fmtDate(s: string): string {
  if (!s) return ''
  return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtUSD(n: number): string {
  return `$${(n ?? 0).toFixed(2)}`
}

function fmtKHR(usd: number, rate: number): string {
  const khr = Math.round(usd * (rate || 4000))
  return `${khr.toLocaleString()} ៛`
}

function statusBadge(status: string): string {
  switch (status) {
    case 'paid':      return '✅ PAID'
    case 'overdue':   return '⚠️ OVERDUE'
    case 'cancelled': return '✖ CANCELLED'
    default:          return '🧾 UNPAID'
  }
}

/**
 * Render an invoice as a Telegram-friendly plain-text message.
 * Mirrors the on-screen "share bill" / "share receipt" text the
 * frontend builds, but driven by the server-side DTO + saved settings.
 */
export function formatInvoiceForTelegram(
  inv: InvoiceDto,
  settings: Record<string, string>,
): string {
  const headerEnabled = settings.INVOICE_HEADER_ENABLED !== 'false'
  const footerEnabled = settings.INVOICE_FOOTER_ENABLED !== 'false'
  const bizName = settings.INVOICE_BIZ_NAME || ''
  const bizPhone = settings.INVOICE_BIZ_PHONE || ''
  const footerNote = settings.INVOICE_FOOTER_NOTE || ''

  const lines: string[] = []

  lines.push(statusBadge(inv.status))
  if (headerEnabled && bizName) {
    lines.push(bizName)
    if (bizPhone) lines.push(bizPhone)
  }
  lines.push('—'.repeat(24))

  lines.push(`Invoice: ${inv.invoiceNumber}`)
  if (inv.tenantName) lines.push(`Tenant: ${inv.tenantName}`)
  const roomBits = [inv.roomName, inv.buildingName, inv.floorName].filter(Boolean).join(' · ')
  if (roomBits) lines.push(`Room: ${roomBits}`)
  lines.push(`Period: ${fmtDate(inv.billPeriodStart)} – ${fmtDate(inv.billPeriodEnd)}`)
  if (inv.status !== 'paid') {
    lines.push(`Due: ${fmtDate(inv.dueDate)}`)
  }
  lines.push('—'.repeat(24))

  for (const li of inv.lineItems) {
    if (li.lineItemType === 'WATER' || li.lineItemType === 'ELECTRICITY') {
      const unit = li.lineItemType === 'WATER' ? 'm³' : 'kWh'
      const usage = (li.currentReading ?? 0) - (li.previousReading ?? 0)
      const rate = li.unitPrice ?? 0
      lines.push(
        `${li.description}: ${li.previousReading ?? 0} → ${li.currentReading ?? 0} (${usage.toFixed(2)} ${unit} × $${rate}) = ${fmtUSD(li.amount)}`,
      )
    } else {
      lines.push(`${li.description}: ${fmtUSD(li.amount)}`)
    }
  }
  lines.push('—'.repeat(24))

  lines.push(`Subtotal: ${fmtUSD(inv.subtotal)}`)
  if (inv.securityDeposit > 0) {
    lines.push(`Security deposit: ${fmtUSD(inv.securityDeposit)}`)
  }
  lines.push(`Total: ${fmtUSD(inv.totalAmount)} (≈ ${fmtKHR(inv.totalAmount, inv.exchangeRate)})`)

  if (inv.status === 'paid') {
    lines.push('')
    if (inv.paidAt) lines.push(`Paid on: ${fmtDate(inv.paidAt)}`)
    if (inv.paymentMethod) lines.push(`Method: ${inv.paymentMethod}`)
    lines.push('Thank you for your payment.')
  } else if (inv.status !== 'cancelled') {
    lines.push('')
    lines.push(`Please pay by ${fmtDate(inv.dueDate)}.`)
  }

  if (footerEnabled && footerNote) {
    lines.push('')
    lines.push(footerNote)
  }

  return lines.join('\n')
}
