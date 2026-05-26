import type { HttpClient } from '../http/client.js'
import type { ServiceFeeDto } from '@ptas/contracts'

// ASYMMETRIC `unit` ↔ `unitLabel`: callers think in `unitLabel` ('$/mo'), the
// wire uses bare `unit` ('mo'). Strip `$/` on write.

export interface CreateServiceFeeArgs {
  name: string
  icon?: string
  defaultRate: number | string
  unitLabel?: string                       // '$/mo', '$/m³', '$/kWh', …
  isDefault?: boolean
}

export interface UpdateServiceFeeArgs {
  name?: string
  icon?: string
  defaultRate?: number | string
  unitLabel?: string
  isDefault?: boolean
}

export interface ServiceFeesApi {
  list(): Promise<ServiceFeeDto[]>
  create(args: CreateServiceFeeArgs): Promise<ServiceFeeDto>
  update(id: string, args: UpdateServiceFeeArgs): Promise<ServiceFeeDto>
  delete(id: string): Promise<null>
}

export function createServiceFeesApi(http: HttpClient): ServiceFeesApi {
  return {
    list: () => http.get('/service-fees'),

    create: ({ name, icon, defaultRate, unitLabel, isDefault }) => {
      const unit = (unitLabel || '$/mo').replace('$/', '')
      const body: Record<string, unknown> = {
        name,
        icon: icon || 'Box',
        serviceType: 'FIXED',
        defaultRate: Number(defaultRate) || 0,
        unit,
      }
      if (isDefault !== undefined) body.isDefault = !!isDefault
      return http.post('/service-fees', body)
    },

    update: (id, data) => {
      const body: Record<string, unknown> = {}
      if (data.name        !== undefined) body.name = data.name
      if (data.icon        !== undefined) body.icon = data.icon
      if (data.defaultRate !== undefined) body.defaultRate = Number(data.defaultRate) || 0
      if (data.unitLabel   !== undefined) body.unit = data.unitLabel.replace('$/', '')
      if (data.isDefault   !== undefined) body.isDefault = !!data.isDefault
      return http.patch(`/service-fees/${id}`, body)
    },

    delete: (id) => http.delete(`/service-fees/${id}`),
  }
}
