import { z } from 'zod'

// Known setting keys. Backend exposes a flat key/value store; the frontend
// re-shapes some into the nested invoice-settings UI shape (that UI shape
// belongs in packages/sdk per Phase 5, NOT here).
//
// Adding a key: add it here, then a default value in apps/backend/prisma/seed.ts.
export const SettingsKeySchema = z.enum([
  'KHR_EXCHANGE_RATE',
  'INVOICE_NO_DIGITS',
  'INVOICE_HEADER_ENABLED',
  'INVOICE_BIZ_NAME',
  'INVOICE_TIN_NO',
  'INVOICE_ADDRESS',
  'INVOICE_BIZ_PHONE',
  'INVOICE_FOOTER_ENABLED',
  'INVOICE_FOOTER_NOTE',
  'INVOICE_QR_ENABLED',
  'INVOICE_QR_STRING',
])
export type SettingsKey = z.infer<typeof SettingsKeySchema>

// What GET /settings returns and what PATCH /settings accepts. Backend's
// store is fully flexible (z.record(string, string)) — known keys are a
// hint, not a hard wall. Unknown keys pass through.
export const SettingsMapSchema = z.record(z.string(), z.string())
export type SettingsMap = Record<string, string>

export const updateSettingsSchema = SettingsMapSchema
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>
