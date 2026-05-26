import { api } from './client.js'

export const buildingsApi = {
  list: () => api.get('/buildings'),
  create: ({ name, remark }) => api.post('/buildings', { name, remark: remark || null }),
  update: (id, { name, remark }) => api.patch(`/buildings/${id}`, { name, remark: remark || null }),
  delete: (id) => api.delete(`/buildings/${id}`),
}
