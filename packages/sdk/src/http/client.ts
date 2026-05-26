import { parseHttpError } from './error.js'

// Tokens are external to the SDK — the consumer wires up storage (localStorage
// on the frontend, a process env or fake on the backend/in tests).
export interface TokenStore {
  getToken: () => string | null
  setToken: (token: string | null) => void
}

export interface HttpClientConfig extends TokenStore {
  baseUrl: string
  // Called after setToken(null) when a 401 lands. The consumer's place to
  // also clear cached user state, redirect to /login, etc.
  on401?: () => void
}

export interface HttpClient extends TokenStore {
  baseUrl: string
  get<T = unknown>(path: string, init?: RequestInit): Promise<T>
  post<T = unknown>(path: string, body?: unknown, init?: RequestInit): Promise<T>
  put<T = unknown>(path: string, body?: unknown, init?: RequestInit): Promise<T>
  patch<T = unknown>(path: string, body?: unknown, init?: RequestInit): Promise<T>
  delete<T = unknown>(path: string, init?: RequestInit): Promise<T>
  // Multipart helper for /uploads — the JSON request() can't be reused since
  // it forces Content-Type: application/json.
  upload<T = unknown>(path: string, form: FormData): Promise<T>
}

export function createHttpClient(config: HttpClientConfig): HttpClient {
  const { baseUrl, getToken, setToken, on401 } = config

  function authHeader(extra: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = { Accept: 'application/json', ...extra }
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
    return headers
  }

  async function handle401(res: Response): Promise<never> {
    setToken(null)
    on401?.()
    throw await parseHttpError(res)
  }

  async function request<T>(method: string, path: string, body?: unknown, init?: RequestInit): Promise<T> {
    const headers = authHeader(body != null ? { 'Content-Type': 'application/json' } : {})
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
      ...init,
    })

    if (res.status === 401) await handle401(res)
    if (!res.ok) throw await parseHttpError(res)
    if (res.status === 204) return null as T

    const ct = res.headers.get('content-type') || ''
    if (!ct.includes('application/json')) return (await res.text()) as unknown as T

    return (await res.json()) as T
  }

  async function upload<T>(path: string, form: FormData): Promise<T> {
    // Do NOT set Content-Type — the browser/Node fetch adds the multipart
    // boundary for us.
    const headers = authHeader()
    const res = await fetch(`${baseUrl}${path}`, { method: 'POST', headers, body: form })
    if (res.status === 401) await handle401(res)
    if (!res.ok) throw await parseHttpError(res)
    return (await res.json()) as T
  }

  return {
    baseUrl,
    getToken,
    setToken,
    get:    (p, init)       => request('GET',    p, undefined, init),
    post:   (p, body, init) => request('POST',   p, body, init),
    put:    (p, body, init) => request('PUT',    p, body, init),
    patch:  (p, body, init) => request('PATCH',  p, body, init),
    delete: (p, init)       => request('DELETE', p, undefined, init),
    upload,
  }
}
