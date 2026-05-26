// HTTP client + token helpers moved to @ptas/sdk; this file re-exports for
// legacy import paths. The actual fetch/auth/401 logic lives in
// packages/sdk/src/http/client.ts.
import { sdk } from '../sdk.js'

// Some legacy sites import `{ api }` directly — expose the same surface
// (get/post/put/patch/delete) backed by the SDK's HttpClient.
export const api = {
  get:    (path)         => sdk.http.get(path),
  post:   (path, body)   => sdk.http.post(path, body),
  put:    (path, body)   => sdk.http.put(path, body),
  patch:  (path, body)   => sdk.http.patch(path, body),
  delete: (path)         => sdk.http.delete(path),
}

export { getToken, setToken } from '../sdk.js'
