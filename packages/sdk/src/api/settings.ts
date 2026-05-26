import type { HttpClient } from '../http/client.js'
import type { SettingsMap } from '@ptas/contracts'

export interface SettingsApi {
  get(): Promise<SettingsMap>
  update(kv: Record<string, string>): Promise<SettingsMap>
}

export function createSettingsApi(http: HttpClient): SettingsApi {
  return {
    get:    ()    => http.get('/settings'),
    update: (kv)  => http.patch('/settings', kv),
  }
}
