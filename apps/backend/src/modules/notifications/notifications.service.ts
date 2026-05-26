import { toNotificationDto, type NotificationDto } from '../../utils/adapters'
import { notificationsRepository } from './notifications.repository'

export const notificationsService = {
  async list(userId: string, opts: { take?: number; onlyUnread?: boolean }): Promise<{ data: NotificationDto[] }> {
    const rows = await notificationsRepository.list(userId, opts)
    return { data: rows.map(toNotificationDto) }
  },
  async markRead(id: string, userId: string): Promise<void> {
    await notificationsRepository.markRead(id, userId)
  },
  async markAllRead(userId: string): Promise<void> {
    await notificationsRepository.markAllRead(userId)
  },
  async clear(userId: string): Promise<void> {
    await notificationsRepository.clear(userId)
  },
}
