import { api } from './client.js'

export const roomsApi = {
  list: () => api.get('/rooms'),
  get: (id) => api.get(`/rooms/${id}`),
  create: (floorId, { name, size, price }) =>
    api.post(`/floors/${floorId}/rooms`, {
      name,
      size: size || undefined,
      pricePerMonth: Number(price) || 0,
    }),
  update: (id, data) => {
    const body = {}
    if (data.name  !== undefined) body.name = data.name
    if (data.size  !== undefined) body.size = data.size
    if (data.price !== undefined) body.pricePerMonth = Number(data.price) || 0
    if (data.meterReadingMode !== undefined) body.meterReadingMode = data.meterReadingMode
    if (data.assets !== undefined) body.assets = data.assets
    return api.patch(`/rooms/${id}`, body)
  },
  delete: (id) => api.delete(`/rooms/${id}`),
}
