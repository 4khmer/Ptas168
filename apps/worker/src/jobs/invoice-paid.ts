import { Job } from 'bullmq'
import { prisma } from '../config/prisma.js'
import { logger } from '../config/logger.js'
import { invoicePaidPayloadSchema, type InvoicePaidPayload } from '../queues.js'

// Fires when the backend marks an invoice paid. Creates a
// PAYMENT_RECEIVED notification for every owner/manager.
export async function processInvoicePaid(job: Job<InvoicePaidPayload>): Promise<{
  notificationsCreated: number
}> {
  const data = invoicePaidPayloadSchema.parse(job.data)

  const owners = await prisma.user.findMany({
    where: { role: { in: ['owner', 'manager'] }, status: 'active' },
    select: { id: true },
  })

  let created = 0
  for (const owner of owners) {
    await prisma.notification.create({
      data: {
        userId: owner.id,
        type: 'PAYMENT_RECEIVED',
        title: `Payment received — ${data.invoiceNumber}`,
        body: `${data.tenantName} paid $${data.totalAmount.toFixed(2)}${data.paymentMethod ? ` (${data.paymentMethod})` : ''}`,
        ref: data.invoiceId,
      },
    })
    created++
  }

  logger.info({ jobId: job.id, invoiceId: data.invoiceId, notificationsCreated: created }, 'invoice-paid handled')
  return { notificationsCreated: created }
}
