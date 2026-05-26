import type { HttpClient } from '../http/client.js'
import type { ContractDto, ContractStatus } from '@ptas/contracts'

export interface ListContractsArgs {
  roomId?: string
  tenantId?: string
  status?: ContractStatus
}

export interface AddTenantToRoomArgs {
  phone: string
  fullName?: string
  // The frontend stores call sites pass either `moveInDate` or `startDate`;
  // we coalesce here. Backend's schema only knows about `moveInDate`.
  moveInDate?: string
  startDate?: string
  endDate?: string | null
  baseRent: number | string
  securityDeposit: number | string
}

export interface UpdateContractArgs {
  baseRent?: number | string
  securityDeposit?: number | string
  startDate?: string
  endDate?: string | null
}

export interface ContractsApi {
  list(args?: ListContractsArgs): Promise<ContractDto[]>
  addTenantToRoom(roomId: string, args: AddTenantToRoomArgs): Promise<ContractDto>
  update(id: string, args: UpdateContractArgs): Promise<ContractDto>
  terminate(id: string, reason?: string): Promise<ContractDto>
}

export function createContractsApi(http: HttpClient): ContractsApi {
  return {
    list: ({ roomId, tenantId, status } = {}) => {
      const qs = new URLSearchParams()
      if (roomId)   qs.set('roomId',   roomId)
      if (tenantId) qs.set('tenantId', tenantId)
      if (status)   qs.set('status',   status)
      const q = qs.toString()
      return http.get(`/contracts${q ? `?${q}` : ''}`)
    },

    addTenantToRoom: (roomId, { phone, fullName, moveInDate, startDate, endDate, baseRent, securityDeposit }) =>
      http.post(`/rooms/${roomId}/contracts`, {
        phone,
        fullName: fullName || undefined,
        moveInDate: moveInDate || startDate,
        endDate: endDate || null,
        baseRent: Number(baseRent) || 0,
        securityDeposit: Number(securityDeposit) || 0,
      }),

    update: (id, data) => {
      const body: Record<string, unknown> = {}
      if (data.baseRent        !== undefined) body.baseRent = Number(data.baseRent)
      if (data.securityDeposit !== undefined) body.securityDeposit = Number(data.securityDeposit)
      if ('startDate' in data && data.startDate) body.startDate = data.startDate
      if ('endDate' in data)                    body.endDate = data.endDate ?? null
      return http.patch(`/contracts/${id}`, body)
    },

    terminate: (id, reason) =>
      http.post(`/contracts/${id}/terminate`, { reason: reason || undefined }),
  }
}
