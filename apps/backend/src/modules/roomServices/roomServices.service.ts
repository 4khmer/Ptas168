import { NotFoundError } from '../../utils/errors.js'
import { toRoomServiceDto, type RoomServiceDto } from '../../utils/adapters.js'
import { prisma } from '../../lib/prisma.js'
import { roomsRepository } from '../rooms/rooms.repository.js'
import { roomServicesRepository } from './roomServices.repository.js'
import type { SetRoomServicesInput } from './roomServices.schema.js'

function parsePriceOverride(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(v)
  return Number.isFinite(n) ? n : null
}

export const roomServicesService = {
  async listForRoom(roomId: string): Promise<RoomServiceDto[]> {
    const room = await roomsRepository.findById(roomId)
    if (!room) throw new NotFoundError('Room')
    const rows = await roomServicesRepository.listForRoom(roomId)
    return rows.map(toRoomServiceDto)
  },

  async setForRoom(roomId: string, input: SetRoomServicesInput): Promise<RoomServiceDto[]> {
    const room = await roomsRepository.findById(roomId)
    if (!room) throw new NotFoundError('Room')

    await prisma.$transaction(async (tx) => {
      // Mark all current as inactive, then re-upsert the desired enabled set
      await tx.roomService.updateMany({ where: { roomId }, data: { active: false } })
      for (const svc of input.services) {
        if (!svc.enabled) continue
        const override = parsePriceOverride(svc.priceOverride)
        await tx.roomService.upsert({
          where: { roomId_serviceFeeId: { roomId, serviceFeeId: svc.serviceId } },
          update: { active: true, priceOverride: override },
          create: { roomId, serviceFeeId: svc.serviceId, active: true, priceOverride: override },
        })
      }
    })

    const rows = await roomServicesRepository.listForRoom(roomId)
    return rows.map(toRoomServiceDto)
  },
}
