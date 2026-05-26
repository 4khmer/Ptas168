import type { HttpClient } from '../http/client.js'
import type { NotificationDto } from '@ptas/contracts'

export interface ListNotificationsArgs {
  size?: number
  onlyUnread?: boolean
}

export interface NotificationsApi {
  list(args?: ListNotificationsArgs): Promise<NotificationDto[]>
  markRead(id: string): Promise<NotificationDto>
  markAllRead(): Promise<{ success: true }>
  clear(): Promise<null>
}

export function createNotificationsApi(http: HttpClient): NotificationsApi {
  return {
    list: ({ size, onlyUnread } = {}) => {
      const qs = new URLSearchParams()
      if (size !== undefined)       qs.set('size', String(size))
      if (onlyUnread !== undefined) qs.set('onlyUnread', String(onlyUnread))
      const s = qs.toString()
      return http.get(`/notifications${s ? `?${s}` : ''}`)
    },
    markRead:    (id) => http.post(`/notifications/${id}/read`, {}),
    markAllRead: ()   => http.post('/notifications/read-all', {}),
    clear:       ()   => http.delete('/notifications'),
  }
}
