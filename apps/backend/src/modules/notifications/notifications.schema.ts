import { z } from 'zod'

export const listNotificationsQuery = z
  .object({
    size: z.string().regex(/^\d+$/).transform(Number).optional(),
    onlyUnread: z.string().transform(v => v === 'true').optional(),
  })
  .strict()
