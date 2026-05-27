import type { Prisma } from '@prisma/client'
import { ConflictError, NotFoundError, ValidationError } from '../../utils/errors'
import { toInvoiceDto, type InvoiceDto } from '../../utils/adapters'
import { prisma } from '../../lib/prisma'
import { roomsRepository } from '../rooms/rooms.repository'
import { contractsRepository } from '../contracts/contracts.repository'
import { roomServicesRepository } from '../roomServices/roomServices.repository'
import { meterReadingsRepository } from '../meterReadings/meterReadings.repository'
import { settingsRepository } from '../settings/settings.repository'
import { settingsService } from '../settings/settings.service'
import { telegramLinksRepository } from '../telegramLinks/telegramLinks.repository'
import { invoicesRepository } from './invoices.repository'
import { formatInvoiceForTelegram } from './invoices.formatter'
import { enqueueInvoicePaid, enqueueTelegramSend } from '../../lib/queue'
import type { CreateInvoiceInput, ListInvoicesPageInput, InvoiceCountsInput } from './invoices.schema'

function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime()
  return Math.max(1, Math.round(ms / 86400000) + 1)
}

function daysInMonthOf(d: Date): number {
  return new Date(d.getUTCFullYear(), d.getUTCMonth() + 1, 0).getUTCDate()
}

function offsetDate(base: Date, days: number): Date {
  const d = new Date(base)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

function pad(n: number, len: number): string {
  return String(n).padStart(len, '0')
}

// Translates the Billing-page filter state into a Prisma where clause.
// "overdue" is derived: status=progress AND dueDate < now.
function buildInvoiceWhere(input: {
  q?: string
  status?: string
  from?: string
  to?: string
}): Prisma.InvoiceWhereInput {
  const where: Prisma.InvoiceWhereInput = {}
  if (input.q) {
    where.OR = [
      { invoiceNumber: { contains: input.q, mode: 'insensitive' } },
      { tenantName:    { contains: input.q, mode: 'insensitive' } },
      { roomName:      { contains: input.q, mode: 'insensitive' } },
    ]
  }
  if (input.from || input.to) {
    where.billPeriodStart = {
      ...(input.from ? { gte: new Date(input.from) } : {}),
      ...(input.to   ? { lte: new Date(input.to)   } : {}),
    }
  }
  if (input.status === 'overdue') {
    where.status = 'progress'
    where.dueDate = { lt: new Date() }
  } else if (input.status === 'progress') {
    where.status = 'progress'
    where.dueDate = { gte: new Date() }
  } else if (input.status === 'paid' || input.status === 'cancelled') {
    where.status = input.status
  }
  return where
}

export const invoicesService = {
  async list(filters: { roomId?: string; tenantId?: string; status?: string }): Promise<InvoiceDto[]> {
    const where: Prisma.InvoiceWhereInput = {}
    if (filters.roomId) where.roomId = filters.roomId
    if (filters.tenantId) where.tenantId = filters.tenantId
    if (filters.status === 'paid' || filters.status === 'cancelled' || filters.status === 'progress') {
      where.status = filters.status
    }
    const rows = await invoicesRepository.list(where)
    let dtos = rows.map(toInvoiceDto)
    if (filters.status === 'overdue') dtos = dtos.filter(d => d.status === 'overdue')
    return dtos
  },

  async listPage(input: ListInvoicesPageInput): Promise<{
    items: InvoiceDto[]
    total: number
    page: number
    pageSize: number
    hasMore: boolean
  }> {
    const where = buildInvoiceWhere(input)
    const skip = (input.page - 1) * input.pageSize
    const [rows, total] = await Promise.all([
      invoicesRepository.listPaginated(where, skip, input.pageSize),
      invoicesRepository.count(where),
    ])
    return {
      items: rows.map(toInvoiceDto),
      total,
      page: input.page,
      pageSize: input.pageSize,
      hasMore: skip + rows.length < total,
    }
  },

  async countsByStatus(input: InvoiceCountsInput): Promise<{
    all: number
    progress: number
    paid: number
    overdue: number
    cancelled: number
  }> {
    const base = buildInvoiceWhere({ q: input.q, from: input.from, to: input.to })
    const now = new Date()
    const [all, progressOpen, paid, overdue, cancelled] = await Promise.all([
      invoicesRepository.count(base),
      invoicesRepository.count({ ...base, status: 'progress', dueDate: { gte: now } }),
      invoicesRepository.count({ ...base, status: 'paid' }),
      invoicesRepository.count({ ...base, status: 'progress', dueDate: { lt: now } }),
      invoicesRepository.count({ ...base, status: 'cancelled' }),
    ])
    return { all, progress: progressOpen, paid, overdue, cancelled }
  },

  async getById(id: string): Promise<InvoiceDto> {
    const inv = await invoicesRepository.findById(id)
    if (!inv) throw new NotFoundError('Invoice')
    return toInvoiceDto(inv)
  },

  /**
   * Share an invoice (in_progress, overdue, or paid) into the Telegram
   * group that's linked to this invoice's room. Returns:
   *   - linked: false   → the room has no Telegram group yet
   *   - linked: true, sent: true  → message delivered
   *   - linked: true, sent: false → bot couldn't deliver (kicked, etc.)
   */
  async shareToTelegram(id: string): Promise<{ linked: boolean; sent: boolean }> {
    const inv = await this.getById(id)
    const link = await telegramLinksRepository.findByRoomId(inv.roomId)
    if (!link) return { linked: false, sent: false }

    const settings = await settingsService.getAll()
    const text = formatInvoiceForTelegram(inv, settings)
    // Fire-and-forget: apps/telegram-bot owns the bot token and actually
    // calls Telegram. We return `sent: true` to mean "enqueued"; the
    // worker retries on transient failures (attempts: 3).
    await enqueueTelegramSend({ chatId: link.chatId, text })
    return { linked: true, sent: true }
  },

  async create(input: CreateInvoiceInput): Promise<InvoiceDto> {
    const room = await roomsRepository.findById(input.roomId)
    if (!room) throw new NotFoundError('Room')

    const contract = await contractsRepository.findActiveForRoom(input.roomId)
    if (!contract) throw new ValidationError('No active tenant on this room')

    const open = await invoicesRepository.countOpenForRoom(input.roomId)
    if (open > 0) throw new ConflictError('Room already has an in-progress invoice')

    const periodStart = new Date(input.billPeriodStart)
    const periodEnd = new Date(input.billPeriodEnd)
    if (periodEnd < periodStart) throw new ValidationError('billPeriodEnd must be on or after billPeriodStart')

    // Rent always uses a fixed 30-day month so Feb (28) and Mar (31) both bill
    // the full rent for a full-month period. Partial months prorate against 30.
    const actualBillDays = daysBetween(periodStart, periodEnd)
    const actualDaysInMonth = daysInMonthOf(periodStart)
    const isFullMonth = actualBillDays >= actualDaysInMonth
    const billDays = isFullMonth ? 30 : Math.min(actualBillDays, 30)
    const daysInMonth = 30
    const dueDate = offsetDate(new Date(), input.dueDateOffsetDays)

    // Pull room services (with effective rates) + latest meter readings
    const services = await roomServicesRepository.listForRoom(input.roomId)
    const water = services.find(s => s.serviceFee.serviceType === 'WATER')
    const elec  = services.find(s => s.serviceFee.serviceType === 'ELECTRICITY')
    const fixed = services.filter(s => s.serviceFee.serviceType === 'FIXED')

    const lastWater = water ? await meterReadingsRepository.latestForRoom(input.roomId, 'WATER') : null
    const lastElec  = elec  ? await meterReadingsRepository.latestForRoom(input.roomId, 'ELECTRICITY') : null

    const baseRent = contract.baseRent.toNumber()
    const securityDeposit = contract.securityDeposit.toNumber()
    const rentAmount = baseRent * (billDays / daysInMonth)

    const exchangeRateRaw = await settingsRepository.get('KHR_EXCHANGE_RATE')
    const exchangeRate = exchangeRateRaw ? parseFloat(exchangeRateRaw) || 4000 : 4000

    const lineItems: Prisma.InvoiceLineItemUncheckedCreateWithoutInvoiceInput[] = [
      { lineItemType: 'RENT', description: 'Base Rent (prorated)', amount: rentAmount },
    ]

    let waterAmount = 0
    if (water && lastWater) {
      const prev = lastWater.previousReading.toNumber()
      const curr = lastWater.currentReading.toNumber()
      const usage = Math.max(0, curr - prev)
      const rate = water.priceOverride?.toNumber() ?? water.serviceFee.defaultRate.toNumber()
      waterAmount = usage * rate
      lineItems.push({
        lineItemType: 'WATER',
        description: 'Water',
        previousReading: prev,
        currentReading: curr,
        unitPrice: rate,
        amount: waterAmount,
      })
    }

    let elecAmount = 0
    if (elec && lastElec) {
      const prev = lastElec.previousReading.toNumber()
      const curr = lastElec.currentReading.toNumber()
      const usage = Math.max(0, curr - prev)
      const rate = elec.priceOverride?.toNumber() ?? elec.serviceFee.defaultRate.toNumber()
      elecAmount = usage * rate
      lineItems.push({
        lineItemType: 'ELECTRICITY',
        description: 'Electricity',
        previousReading: prev,
        currentReading: curr,
        unitPrice: rate,
        amount: elecAmount,
      })
    }

    let fixedAmount = 0
    for (const f of fixed) {
      const amt = (f.priceOverride ?? f.serviceFee.defaultRate).toNumber()
      fixedAmount += amt
      lineItems.push({
        lineItemType: 'FIXED_SERVICE',
        description: f.serviceFee.name,
        amount: amt,
      })
    }

    const subtotal = rentAmount + waterAmount + elecAmount + fixedAmount

    // Invoice number: INV-YYYYMM-NNNNNN
    const noDigitsRaw = await settingsRepository.get('INVOICE_NO_DIGITS')
    const noDigits = noDigitsRaw ? parseInt(noDigitsRaw, 10) || 6 : 6
    const seq = (await invoicesRepository.countCreated()) + 1
    const today = new Date()
    const invoiceNumber = `INV-${today.getUTCFullYear()}${pad(today.getUTCMonth() + 1, 2)}-${pad(seq, noDigits)}`

    const invRow = await prisma.invoice.create({
      data: {
        invoiceNumber,
        roomId: input.roomId,
        tenantId: contract.tenantId,
        tenantName: contract.tenantName,
        tenantPhone: contract.tenantPhone,
        roomName: room.name,
        buildingName: room.building.name,
        floorName: room.floor.name,
        billPeriodStart: periodStart,
        billPeriodEnd: periodEnd,
        dueDate,
        billDays,
        daysInMonth,
        status: 'progress',
        baseRent,
        securityDeposit,
        subtotal,
        totalAmount: subtotal,
        exchangeRate,
        khrAmount: subtotal * exchangeRate,
        lineItems: { create: lineItems },
      },
      include: { lineItems: true },
    })

    return toInvoiceDto(invRow)
  },

  async pay(id: string, method: 'Cash' | 'QR Transfer'): Promise<InvoiceDto> {
    const inv = await invoicesRepository.findById(id)
    if (!inv) throw new NotFoundError('Invoice')
    if (inv.status === 'paid') return toInvoiceDto(inv)
    if (inv.status === 'cancelled') throw new ValidationError('Invoice is cancelled')
    const row = await invoicesRepository.update(id, {
      status: 'paid',
      paymentMethod: method === 'QR Transfer' ? 'QRTransfer' : 'Cash',
      paidAt: new Date(),
    })
    // Fire-and-forget: the worker creates PAYMENT_RECEIVED notifications.
    // Enqueue failures (e.g. Redis down) log but never break the API.
    const dto = toInvoiceDto(row)
    void enqueueInvoicePaid({
      invoiceId: dto.id,
      invoiceNumber: dto.invoiceNumber,
      tenantName: dto.tenantName,
      totalAmount: dto.totalAmount,
      paymentMethod: dto.paymentMethod,
    })
    return dto
  },

  async cancel(id: string, reason?: string): Promise<InvoiceDto> {
    const inv = await invoicesRepository.findById(id)
    if (!inv) throw new NotFoundError('Invoice')
    if (inv.status === 'paid') throw new ValidationError('Cannot cancel a paid invoice')
    if (inv.status === 'cancelled') return toInvoiceDto(inv)
    const row = await invoicesRepository.update(id, {
      status: 'cancelled',
      cancelReason: reason ?? null,
      cancelledAt: new Date(),
    })
    return toInvoiceDto(row)
  },
}
