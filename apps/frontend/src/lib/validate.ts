import type { ZodSchema, ZodTypeAny } from 'zod'

// Thin wrapper around Zod's safeParse that returns errors keyed by field
// path — the shape the modals' `errors` state already consumes.
//
// Usage:
//   const { ok, data, errors } = validate(schema, formValues)
//   if (!ok) { setErrors(errors); return }
//   // submit `data` (with Zod-coerced/defaulted values)
//
// Field-path convention:
//   - Top-level fields → `'name'`, `'phone'`, …
//   - Nested → `'address.city'`
//   - Cross-field refines with no path → `'_'`

export type FieldErrors = Record<string, string>

export type ValidateResult<T> =
  | { ok: true;  data: T;     errors: FieldErrors }
  | { ok: false; data: null;  errors: FieldErrors }

export function validate<T>(
  schema: ZodSchema<T> | ZodTypeAny,
  data: unknown,
): ValidateResult<T> {
  const result = schema.safeParse(data)
  if (result.success) {
    return { ok: true, data: result.data as T, errors: {} }
  }
  const errors: FieldErrors = {}
  for (const issue of result.error.issues) {
    const key = issue.path.length ? issue.path.join('.') : '_'
    if (!(key in errors)) errors[key] = issue.message
  }
  return { ok: false, data: null, errors }
}
