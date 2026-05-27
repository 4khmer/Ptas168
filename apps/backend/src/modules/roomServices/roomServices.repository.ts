import type { RoomService, ServiceFee } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'

export type RoomServiceWithFee = RoomService & { serviceFee: ServiceFee }

export const roomServicesRepository = {
  listForRoom: (roomId: string): Promise<RoomServiceWithFee[]> =>
    prisma.roomService.findMany({
      where: { roomId, active: true },
      include: { serviceFee: true },
      orderBy: { assignedAt: 'asc' },
    }) as Promise<RoomServiceWithFee[]>,
}
