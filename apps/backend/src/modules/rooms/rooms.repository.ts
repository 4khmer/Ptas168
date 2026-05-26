import { Prisma, type Building, type Contract, type Floor, type Invoice, type Room } from '@prisma/client'
import { prisma } from '../../lib/prisma'

export type RoomWithRelations = Room & {
  floor: Floor
  building: Building
  contracts: Contract[]
  invoices: Invoice[]
}

export const roomsRepository = {
  list: (): Promise<RoomWithRelations[]> =>
    prisma.room.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        floor: true,
        building: true,
        contracts: { where: { status: 'active' } },
        invoices: { where: { status: 'progress' } },
      },
    }) as Promise<RoomWithRelations[]>,

  findById: (id: string): Promise<RoomWithRelations | null> =>
    prisma.room.findUnique({
      where: { id },
      include: {
        floor: true,
        building: true,
        contracts: { where: { status: 'active' } },
        invoices: { where: { status: 'progress' } },
      },
    }) as Promise<RoomWithRelations | null>,

  create: (data: {
    floorId: string
    buildingId: string
    name: string
    size?: string | null
    pricePerMonth: number
  }): Promise<Room> =>
    prisma.room.create({
      data: {
        floorId: data.floorId,
        buildingId: data.buildingId,
        name: data.name,
        size: data.size ?? null,
        pricePerMonth: data.pricePerMonth,
      },
    }),

  update: (
    id: string,
    data: {
      name?: string
      size?: string | null
      pricePerMonth?: number
      meterReadingMode?: 'manual' | 'auto'
      assets?: Prisma.InputJsonValue
    },
  ): Promise<Room> => prisma.room.update({ where: { id }, data }),

  delete: (id: string): Promise<Room> => prisma.room.delete({ where: { id } }),
}
