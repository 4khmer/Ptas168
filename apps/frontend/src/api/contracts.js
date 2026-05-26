import { api } from './client.js'

export const contractsApi = {
  list: ({ roomId, tenantId, status } = {}) => {
    const qs = new URLSearchParams()
    if (roomId)   qs.set('roomId',   roomId)
    if (tenantId) qs.set('tenantId', tenantId)
    if (status)   qs.set('status',   status)
    const q = qs.toString()
    return api.get(`/contracts${q ? `?${q}` : ''}`)
  },

  addTenantToRoom: (roomId, { phone, fullName, moveInDate, startDate, endDate, baseRent, securityDeposit }) =>
    api.post(`/rooms/${roomId}/contracts`, {
      phone,
      fullName: fullName || undefined,
      moveInDate: moveInDate || startDate,
      endDate: endDate || null,
      baseRent: Number(baseRent) || 0,
      securityDeposit: Number(securityDeposit) || 0,
    }),

  update: (id, data) => {
    const body = {}
    if (data.baseRent        !== undefined) body.baseRent = Number(data.baseRent)
    if (data.securityDeposit !== undefined) body.securityDeposit = Number(data.securityDeposit)
    if ('startDate' in data && data.startDate) body.startDate = data.startDate
    if ('endDate' in data)                  body.endDate = data.endDate ?? null
    return api.patch(`/contracts/${id}`, body)
  },

  terminate: (id, reason) =>
    api.post(`/contracts/${id}/terminate`, { reason: reason || undefined }),
}
