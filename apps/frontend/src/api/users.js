import { api } from './client.js'

// Backend returns User shape: { id, name, username, phone, profileImage, role, status, via, createdAt }.
// The frontend's "sub-user" UI uses `name`, `phone`, `role`, `status` directly.

export const usersApi = {
  list: () => api.get('/users'),
  create: ({ name, phone, password, role, status }) =>
    api.post('/users', {
      username: phone,                 // username == phone for sub-users
      fullName: name,
      password,
      phone,
      role: (role || 'staff').toLowerCase(),
      active: (status || 'active') === 'active',
    }),
  update: (id, data) => {
    const body = {}
    if (data.name   !== undefined) body.fullName = data.name
    if (data.phone  !== undefined) body.phone = data.phone
    if (data.role   !== undefined) body.role = data.role.toLowerCase()
    if (data.status !== undefined) body.active = data.status === 'active'
    if (data.password)             body.password = data.password
    return api.patch(`/users/${id}`, body)
  },
  delete: (id) => api.delete(`/users/${id}`),
}
