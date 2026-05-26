import { api } from './client.js'

export const serviceFeesApi = {
  list: () => api.get('/service-fees'),
  create: ({ name, icon, defaultRate, unitLabel, isDefault }) => {
    const unit = (unitLabel || '$/mo').replace('$/', '')
    return api.post('/service-fees', {
      name,
      icon: icon || 'Box',
      serviceType: 'FIXED',
      defaultRate: Number(defaultRate) || 0,
      unit,
      ...(isDefault !== undefined ? { isDefault: !!isDefault } : {}),
    })
  },
  update: (id, data) => {
    const body = {}
    if (data.name        !== undefined) body.name = data.name
    if (data.icon        !== undefined) body.icon = data.icon
    if (data.defaultRate !== undefined) body.defaultRate = Number(data.defaultRate) || 0
    if (data.unitLabel   !== undefined) body.unit = data.unitLabel.replace('$/', '')
    if (data.isDefault   !== undefined) body.isDefault = !!data.isDefault
    return api.patch(`/service-fees/${id}`, body)
  },
  delete: (id) => api.delete(`/service-fees/${id}`),
}
