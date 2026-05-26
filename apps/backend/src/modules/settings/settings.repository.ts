import type { Setting } from '@prisma/client'
import { prisma } from '../../lib/prisma'

export const settingsRepository = {
  list: (): Promise<Setting[]> => prisma.setting.findMany(),

  get: async (key: string): Promise<string | null> => {
    const row = await prisma.setting.findUnique({ where: { key } })
    return row?.value ?? null
  },

  set: (key: string, value: string): Promise<Setting> =>
    prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    }),
}
