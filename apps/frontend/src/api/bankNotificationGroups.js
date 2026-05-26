import { api } from './client.js'

export const bankNotificationGroupsApi = {
  list:        ()   => api.get('/bank-notification-groups'),
  requestCode: ()   => api.post('/bank-notification-groups/code', {}),
  remove:      (id) => api.delete(`/bank-notification-groups/${id}`),
}
