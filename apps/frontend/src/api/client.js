// Lightweight fetch wrapper.
// - Reads BASE from VITE_API_URL (build-time) or falls back to /api (Vite proxy).
// - Stores JWT in localStorage as `pbms_token`.
// - Sends `Authorization: Bearer <token>` on every request.
// - Surfaces backend `{ error: { code, message, details? } }` as a thrown Error.

const BASE = import.meta.env.VITE_API_URL ?? '/api'
const TOKEN_KEY = 'pbms_token'

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else       localStorage.removeItem(TOKEN_KEY)
  } catch { /* noop */ }
}

function buildHeaders(extra = {}) {
  const headers = { Accept: 'application/json', ...extra }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

async function parseError(res) {
  let payload
  try { payload = await res.json() } catch { payload = null }
  const err = new Error(payload?.error?.message || `HTTP ${res.status}`)
  err.status = res.status
  err.code   = payload?.error?.code || `HTTP_${res.status}`
  err.details = payload?.error?.details
  return err
}

async function request(method, path, body, opts = {}) {
  const headers = buildHeaders(body != null ? { 'Content-Type': 'application/json' } : {})
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
    ...opts,
  })

  // Auto-logout on 401 (token expired/invalid)
  if (res.status === 401) {
    setToken(null)
    throw await parseError(res)
  }

  if (!res.ok) throw await parseError(res)
  if (res.status === 204) return null

  // Non-JSON responses (rare) → return text
  const ct = res.headers.get('content-type') || ''
  if (!ct.includes('application/json')) return await res.text()

  return res.json()
}

export const api = {
  get:    (path)         => request('GET',    path),
  post:   (path, body)   => request('POST',   path, body),
  put:    (path, body)   => request('PUT',    path, body),
  patch:  (path, body)   => request('PATCH',  path, body),
  delete: (path)         => request('DELETE', path),
}
