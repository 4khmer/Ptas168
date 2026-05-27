import { settingsRepository } from './settings.repository.js'

export const settingsService = {
  async getAll(): Promise<Record<string, string>> {
    const rows = await settingsRepository.list()
    return Object.fromEntries(rows.map(r => [r.key, r.value]))
  },

  async setMany(data: Record<string, string>): Promise<Record<string, string>> {
    for (const [k, v] of Object.entries(data)) {
      await settingsRepository.set(k, v)
    }
    return this.getAll()
  },
}
