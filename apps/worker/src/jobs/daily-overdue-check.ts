import { Job } from 'bullmq'
import { prisma } from '../config/prisma.js'
import { logger } from '../config/logger.js'
import { overdueCheckPayloadSchema, type OverdueCheckPayload } from '../queues.js'

// Find invoices that are progress + dueDate has passed, and create an
// OVERDUE_INVOICE notification for each owner-role user — but only if a
// notification for that (user, invoice) doesn't already exist.
//
// This is the FIRST notification producer in the system. Before this, the
// backend never wrote to the notifications table (it only read/marked-read).
export async function processOverdueCheck(job: Job<OverdueCheckPayload>): Promise<{
  scanned: number
  newNotifications: number
}> {
  overdueCheckPayloadSchema.parse(job.data)

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      status: 'progress',
      dueDate: { lt: today },
    },
    select: { id: true, invoiceNumber: true, tenantName: true, dueDate: true, totalAmount: true },
  })

  if (overdueInvoices.length === 0) {
    logger.info({ jobId: job.id }, 'overdue-check: no overdue invoices')
    return { scanned: 0, newNotifications: 0 }
  }

  const owners = await prisma.user.findMany({
    where: { role: { in: ['owner', 'manager'] }, status: 'active' },
    select: { id: true },
  })
  if (owners.length === 0) {
    logger.warn({ jobId: job.id }, 'overdue-check: no owner/manager users to notify')
    return { scanned: overdueInvoices.length, newNotifications: 0 }
  }

  let created = 0
  for (const inv of overdueInvoices) {
    for (const owner of owners) {
      const existing = await prisma.notification.findFirst({
        where: { userId: owner.id, type: 'OVERDUE_INVOICE', ref: inv.id },
        select: { id: true },
      })
      if (existing) continue

      await prisma.notification.create({
        data: {
          userId: owner.id,
          type: 'OVERDUE_INVOICE',
          title: `Invoice ${inv.invoiceNumber} is overdue`,
          body: `${inv.tenantName} — $${inv.totalAmount.toString()} due ${inv.dueDate.toISOString().slice(0, 10)}`,
          ref: inv.id,
        },
      })
      created++
    }
  }

  logger.info(
    { jobId: job.id, scanned: overdueInvoices.length, newNotifications: created },
    'overdue-check completed',
  )
  return { scanned: overdueInvoices.length, newNotifications: created }
}
