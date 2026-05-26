import type { MeterReading, Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'

export const meterReadingsRepository = {
  listForRoom: (roomId: string): Promise<MeterReading[]> =>
    prisma.meterReading.findMany({
      where: { roomId },
      orderBy: [{ recordDate: 'desc' }, { createdAt: 'desc' }],
    }),

  latestForRoom: (roomId: string, serviceType: 'WATER' | 'ELECTRICITY'): Promise<MeterReading | null> =>
    prisma.meterReading.findFirst({
      where: { roomId, serviceType },
      orderBy: [{ recordDate: 'desc' }, { createdAt: 'desc' }],
    }),

  create: (data: Prisma.MeterReadingUncheckedCreateInput): Promise<MeterReading> =>
    prisma.meterReading.create({ data }),
}
