import { z } from 'zod'

// Generic page wrapper used by paginated list endpoints (e.g. /invoices/page).
// Build per-endpoint instances with PageSchema(itemSchema).
export function PageSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1).max(100),
    hasMore: z.boolean(),
  })
}

// Hand-written generic type so consumers don't need to call z.infer on
// PageSchema(...) for each item type.
export interface Page<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}
