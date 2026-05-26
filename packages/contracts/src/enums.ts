import { z } from 'zod'

// One source of truth for every enum that crosses the wire. Each export
// gives you both the Zod schema (runtime validation) and an inferred TS
// string-union type, matching the Prisma enums in:
//   apps/backend/prisma/schema.prisma
//
// IMPORTANT: keep these in sync with schema.prisma. The Prisma migration
// generator does not read this file — it's the other way around.

// ── Auth / users ───────────────────────────────────────────────────────────

export const UserRoleSchema = z.enum(['owner', 'manager', 'staff', 'viewer'])
export type UserRole = z.infer<typeof UserRoleSchema>

export const UserStatusSchema = z.enum(['active', 'inactive'])
export type UserStatus = z.infer<typeof UserStatusSchema>

export const AuthViaSchema = z.enum(['credentials', 'telegram'])
export type AuthVia = z.infer<typeof AuthViaSchema>

// ── Tenants & contracts ────────────────────────────────────────────────────

export const TenantStatusSchema = z.enum(['active', 'inactive'])
export type TenantStatus = z.infer<typeof TenantStatusSchema>

export const ContractStatusSchema = z.enum(['active', 'terminated'])
export type ContractStatus = z.infer<typeof ContractStatusSchema>

// ── Services ───────────────────────────────────────────────────────────────

export const ServiceTypeSchema = z.enum(['WATER', 'ELECTRICITY', 'FIXED'])
export type ServiceType = z.infer<typeof ServiceTypeSchema>

// ── Invoices ───────────────────────────────────────────────────────────────

// Persisted statuses only. `overdue` is derived in the backend adapter at
// read time when status === 'progress' && dueDate < now — see
// apps/backend/src/utils/adapters.ts. Response DTOs that surface `overdue`
// should use a separate union that extends this one.
export const InvoiceStatusSchema = z.enum(['progress', 'paid', 'cancelled'])
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>

// What the API actually emits on read. Includes the derived `overdue`.
export const InvoiceStatusResponseSchema = z.enum([
  'progress',
  'paid',
  'cancelled',
  'overdue',
])
export type InvoiceStatusResponse = z.infer<typeof InvoiceStatusResponseSchema>

export const InvoicePaymentMethodSchema = z.enum(['Cash', 'QRTransfer'])
export type InvoicePaymentMethod = z.infer<typeof InvoicePaymentMethodSchema>

export const LineItemTypeSchema = z.enum([
  'RENT',
  'WATER',
  'ELECTRICITY',
  'FIXED_SERVICE',
])
export type LineItemType = z.infer<typeof LineItemTypeSchema>

// ── Notifications ──────────────────────────────────────────────────────────

// DB-side enum (Prisma stores uppercase).
export const NotificationTypeSchema = z.enum([
  'OVERDUE_INVOICE',
  'PAYMENT_RECEIVED',
  'TENANT_ADDED',
  'GENERIC',
])
export type NotificationType = z.infer<typeof NotificationTypeSchema>

// Wire shape (the backend adapter lowercases at the boundary; the frontend
// reads the lowercase form). Use this for response DTOs.
export const NotificationTypeResponseSchema = z.enum([
  'overdue_invoice',
  'payment_received',
  'tenant_added',
  'generic',
])
export type NotificationTypeResponse = z.infer<typeof NotificationTypeResponseSchema>

// ── Convenience constants ──────────────────────────────────────────────────

// Useful for building <select> options or admin dashboards without
// importing the schema and calling .options.
export const ALL_USER_ROLES = UserRoleSchema.options
export const ALL_SERVICE_TYPES = ServiceTypeSchema.options
export const ALL_INVOICE_STATUSES = InvoiceStatusResponseSchema.options
export const ALL_LINE_ITEM_TYPES = LineItemTypeSchema.options
