import type { ErrorEnvelope } from '@ptas/contracts'

// Thrown by every non-2xx response from the HTTP client. Mirrors the legacy
// frontend client.js: `.status`, `.code`, `.details` ride on the Error.
export class HttpError extends Error {
  public readonly status: number
  public readonly code: string
  public readonly details: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = code
    this.details = details
  }
}

// Pull the legacy `{ error: { code, message, details? } }` envelope off a
// non-2xx Response and turn it into an HttpError. Falls back gracefully if
// the body is missing or non-JSON.
export async function parseHttpError(res: Response): Promise<HttpError> {
  let payload: ErrorEnvelope | null = null
  try {
    payload = (await res.json()) as ErrorEnvelope
  } catch {
    payload = null
  }
  const message = payload?.error?.message || `HTTP ${res.status}`
  const code = payload?.error?.code ? String(payload.error.code) : `HTTP_${res.status}`
  return new HttpError(res.status, code, message, payload?.error?.details)
}
