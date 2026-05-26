import type { HttpClient } from '../http/client.js'
import type { UserDto, UserStatus } from '@ptas/contracts'

// ASYMMETRIC: UI uses `name`, `status: active|inactive`. Wire uses
// `fullName`, `active: boolean`. Username == phone for sub-users.

export interface CreateSubUserArgs {
  name: string
  phone: string
  password: string
  role?: string                            // 'manager' | 'staff' | 'viewer'
  status?: UserStatus
}

export interface UpdateSubUserArgs {
  name?: string
  phone?: string
  role?: string
  status?: UserStatus
  password?: string
}

export interface UsersApi {
  list(): Promise<UserDto[]>
  create(args: CreateSubUserArgs): Promise<UserDto>
  update(id: string, args: UpdateSubUserArgs): Promise<UserDto>
  delete(id: string): Promise<null>
}

export function createUsersApi(http: HttpClient): UsersApi {
  return {
    list: () => http.get('/users'),

    create: ({ name, phone, password, role, status }) =>
      http.post('/users', {
        username: phone,
        fullName: name,
        password,
        phone,
        role: (role || 'staff').toLowerCase(),
        active: (status || 'active') === 'active',
      }),

    update: (id, data) => {
      const body: Record<string, unknown> = {}
      if (data.name   !== undefined) body.fullName = data.name
      if (data.phone  !== undefined) body.phone = data.phone
      if (data.role   !== undefined) body.role = data.role.toLowerCase()
      if (data.status !== undefined) body.active = data.status === 'active'
      if (data.password)             body.password = data.password
      return http.patch(`/users/${id}`, body)
    },

    delete: (id) => http.delete(`/users/${id}`),
  }
}
