import { NotFoundError } from '../../utils/errors'
import { toRoomDto, type RoomDto } from '../../utils/adapters'
import { floorsRepository } from '../floors/floors.repository'
import { roomsRepository, type RoomWithRelations } from './rooms.repository'
import type { CreateRoomInput, UpdateRoomInput } from './rooms.schema'

// Billing cycle is anchored on the contract's start-date anniversary, not
// the calendar month. Start Bill unlocks in the last `START_BILL_WINDOW`
// days of the 30-day cycle so the manager can wrap up the period that's
// about to end.
const CYCLE_LENGTH = 30
const START_BILL_WINDOW = 7

// Days elapsed in the current billing cycle, counted from the most recent
// monthly anniversary of the contract's start date. Mirrors the frontend's
// lib/dayCounter.js → getDaysSinceStart so both sides agree.
function cycleDaySinceContractStart(startDate: Date, today: Date): number {
  const start = new Date(startDate)
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  let cycleStart = new Date(todayDay.getFullYear(), todayDay.getMonth(), startDay.getDate())
  if (cycleStart > todayDay) {
    cycleStart = new Date(todayDay.getFullYear(), todayDay.getMonth() - 1, startDay.getDate())
  }
  if (cycleStart < startDay) cycleStart = startDay
  const oneDay = 24 * 60 * 60 * 1000
  return Math.max(0, Math.round((todayDay.getTime() - cycleStart.getTime()) / oneDay))
}

function decorate(room: RoomWithRelations): RoomDto {
  const activeContract = room.contracts[0] ?? null
  const hasOpenInvoice = room.invoices.length > 0
  const today = new Date()
  const dayOfMonth = today.getDate()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()

  let canStartBill = false
  if (activeContract && !hasOpenInvoice) {
    const cycleDay = cycleDaySinceContractStart(activeContract.startDate, today)
    canStartBill = cycleDay >= CYCLE_LENGTH - START_BILL_WINDOW
  }

  return toRoomDto(room, {
    activeContract,
    floor: room.floor,
    building: room.building,
    canStartBill,
    dayCounter: dayOfMonth,
    daysInMonth,
    dayCounterColor: null,
  })
}

export const roomsService = {
  async list(): Promise<RoomDto[]> {
    const rows = await roomsRepository.list()
    return rows.map(decorate)
  },

  async getById(id: string): Promise<RoomDto> {
    const row = await roomsRepository.findById(id)
    if (!row) throw new NotFoundError('Room')
    return decorate(row)
  },

  async create(floorId: string, input: CreateRoomInput): Promise<RoomDto> {
    const floor = await floorsRepository.findById(floorId)
    if (!floor) throw new NotFoundError('Floor')
    const created = await roomsRepository.create({
      floorId,
      buildingId: floor.buildingId,
      name: input.name,
      size: input.size,
      pricePerMonth: input.pricePerMonth,
    })
    const reloaded = await roomsRepository.findById(created.id)
    if (!reloaded) throw new NotFoundError('Room')
    return decorate(reloaded)
  },

  async update(id: string, input: UpdateRoomInput): Promise<RoomDto> {
    const existing = await roomsRepository.findById(id)
    if (!existing) throw new NotFoundError('Room')
    await roomsRepository.update(id, input)
    const reloaded = await roomsRepository.findById(id)
    if (!reloaded) throw new NotFoundError('Room')
    return decorate(reloaded)
  },

  async delete(id: string): Promise<void> {
    const existing = await roomsRepository.findById(id)
    if (!existing) throw new NotFoundError('Room')
    await roomsRepository.delete(id)
  },
}
