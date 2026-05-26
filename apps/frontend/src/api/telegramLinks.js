import { api } from './client.js'

export const telegramLinksApi = {
  list:        ()        => api.get('/telegram-links'),
  forRoom:     (roomId)  => api.get(`/telegram-links/room/${roomId}`).catch(e => e.status === 404 ? null : Promise.reject(e)),
  requestCode: (roomId)  => api.post('/telegram-links/code', { roomId }),
  remove:      (id)      => api.delete(`/telegram-links/${id}`),
}
