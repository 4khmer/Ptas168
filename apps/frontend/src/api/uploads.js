// File-upload helper. Uses multipart/form-data; the JSON `api` wrapper
// can't be reused because it forces Content-Type to application/json.
import { getToken, setToken } from './client.js'

const BASE = import.meta.env.VITE_API_URL ?? '/api'

async function parseError(res) {
  let payload
  try { payload = await res.json() } catch { payload = null }
  const err = new Error(payload?.error?.message || `HTTP ${res.status}`)
  err.status = res.status
  err.code   = payload?.error?.code || `HTTP_${res.status}`
  err.details = payload?.error?.details
  return err
}

export const uploadsApi = {
  // Send a Blob/File to POST /api/uploads. Returns { url, filename, size, mimetype }.
  async upload(file, fieldName = 'file') {
    const form = new FormData()
    form.append(fieldName, file)

    const headers = { Accept: 'application/json' }
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`

    const res = await fetch(`${BASE}/uploads`, {
      method: 'POST',
      headers,                      // do NOT set Content-Type — browser adds the boundary
      body: form,
    })

    if (res.status === 401) {
      setToken(null)
      throw await parseError(res)
    }
    if (!res.ok) throw await parseError(res)
    return res.json()
  },
}
