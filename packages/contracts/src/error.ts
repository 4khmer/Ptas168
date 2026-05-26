import { z } from 'zod'

// Every error code the backend can emit, by way of either an AppError
// subclass (apps/backend/src/utils/errors.ts) or the inline branches in
// apps/backend/src/middleware/error-handler.ts. Keep in sync if you add one.
export const ErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'DB_ERROR',
  'INTERNAL_ERROR',
])
export type ErrorCode = z.infer<typeof ErrorCodeSchema>

// Loose code schema for the response envelope — allows unknown codes to parse
// without throwing, so the frontend can degrade gracefully if the backend
// ships a new code before contracts catch up.
const ResponseErrorCode = z.union([ErrorCodeSchema, z.string()])

// Shape of every non-2xx response body from the API.
//   { error: { code, message, details?, stack? } }
// `stack` is only present in non-production environments.
export const ErrorEnvelopeSchema = z.object({
  error: z.object({
    code: ResponseErrorCode,
    message: z.string(),
    details: z.unknown().optional(),
    stack: z.string().optional(),
  }),
})
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>

// HTTP-status → default ErrorCode, useful when narrowing an unknown thrown
// value to the response shape in middleware. Add a row when adding a code.
export const ERROR_STATUS_TO_CODE = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  500: 'INTERNAL_ERROR',
} as const satisfies Record<number, ErrorCode>
