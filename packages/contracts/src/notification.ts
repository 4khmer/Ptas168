import { z } from 'zod'
import { NotificationTypeResponseSchema } from './enums.js'

// Query ─────────────────────────────────────────────────────────────────────

export const listNotificationsQuery = z
  .object({
    size: z.string().regex(/^\d+$/).transform(Number).optional(),
    onlyUnread: z.string().transform(v => v === 'true').optional(),
  })
  .strict()

// Read DTO ──────────────────────────────────────────────────────────────────
// Prisma stores `type` UPPERCASE (OVERDUE_INVOICE, …); the backend adapter
// lowercases at the boundary. So response type is the lowercase form.

export const NotificationDtoSchema = z.object({
  id: z.string(),
  type: NotificationTypeResponseSchema,
  title: z.string(),
  body: z.string(),
  ref: z.string().nullable(),
  read: z.boolean(),
  createdAt: z.string(),
})
export type NotificationDto = z.infer<typeof NotificationDtoSchema>
