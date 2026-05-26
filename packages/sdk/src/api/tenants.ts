import type { HttpClient } from '../http/client.js'
import type { TenantDto, TenantDocumentDto, TenantStatus } from '@ptas/contracts'

// ASYMMETRIC: the SDK accepts the read-shape fields (`name`, `photo`) and
// translates them to the write-shape (`fullName`, `profilePhotoUrl`) at the
// boundary. Callers always think in the read shape.

export interface CreateTenantArgs {
  name: string
  phone: string
  photo?: string | null
}

export interface UpdateTenantArgs {
  name?: string
  phone?: string
  photo?: string | null
  status?: TenantStatus
  documents?: TenantDocumentDto[]
}

export interface TenantsApi {
  list(): Promise<TenantDto[]>
  get(id: string): Promise<TenantDto>
  lookupByPhone(phone: string): Promise<TenantDto | null>
  create(input: CreateTenantArgs): Promise<TenantDto>
  update(id: string, input: UpdateTenantArgs): Promise<TenantDto>
}

export function createTenantsApi(http: HttpClient): TenantsApi {
  return {
    list: () => http.get('/tenants'),
    get:  (id) => http.get(`/tenants/${id}`),
    lookupByPhone: (phone) =>
      http.get(`/tenants/lookup?phone=${encodeURIComponent(phone)}`),
    create: ({ name, phone, photo }) =>
      http.post('/tenants', {
        fullName: name,
        phone,
        profilePhotoUrl: photo ?? null,
      }),
    update: (id, data) => {
      const body: Record<string, unknown> = {}
      if (data.name      !== undefined) body.fullName = data.name
      if (data.phone     !== undefined) body.phone = data.phone
      if ('photo' in data)              body.profilePhotoUrl = data.photo ?? null
      if (data.status    !== undefined) body.status = data.status
      if (data.documents !== undefined) body.documents = data.documents
      return http.patch(`/tenants/${id}`, body)
    },
  }
}
