import { api } from './client.js'

export const tenantsApi = {
  list: () => api.get('/tenants'),
  get: (id) => api.get(`/tenants/${id}`),
  lookupByPhone: (phone) => api.get(`/tenants/lookup?phone=${encodeURIComponent(phone)}`),
  create: ({ name, phone, photo }) =>
    api.post('/tenants', {
      fullName: name,
      phone,
      profilePhotoUrl: photo ?? null,
    }),
  update: (id, data) => {
    const body = {}
    if (data.name  !== undefined) body.fullName = data.name
    if (data.phone !== undefined) body.phone = data.phone
    if ('photo' in data)          body.profilePhotoUrl = data.photo ?? null
    if (data.status    !== undefined) body.status = data.status
    if (data.documents !== undefined) body.documents = data.documents
    return api.patch(`/tenants/${id}`, body)
  },
}
