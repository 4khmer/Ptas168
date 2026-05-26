import { api } from './client.js'

export const floorsApi = {
  list: (buildingId) => api.get(`/floors${buildingId ? `?buildingId=${encodeURIComponent(buildingId)}` : ''}`),
  create: (buildingId, { name, remark }) =>
    api.post(`/buildings/${buildingId}/floors`, { name, remark: remark || null }),
  update: (id, { name, remark }) => api.patch(`/floors/${id}`, { name, remark: remark || null }),
  delete: (id) => api.delete(`/floors/${id}`),
}
