import type { HttpClient } from '../http/client.js'
import type { TelegramLinkDto, MintCodeResponse } from '@ptas/contracts'
import { HttpError } from '../http/error.js'

export interface TelegramLinksApi {
  list(): Promise<TelegramLinkDto[]>
  forRoom(roomId: string): Promise<TelegramLinkDto | null>
  requestCode(roomId: string): Promise<MintCodeResponse>
  remove(id: string): Promise<null>
}

export function createTelegramLinksApi(http: HttpClient): TelegramLinksApi {
  return {
    list: () => http.get('/telegram-links'),

    // 404 on "no link yet for this room" is a normal state — collapse to null.
    forRoom: (roomId) =>
      http.get<TelegramLinkDto>(`/telegram-links/room/${roomId}`).catch((e: unknown) => {
        if (e instanceof HttpError && e.status === 404) return null
        throw e
      }),

    requestCode: (roomId) => http.post('/telegram-links/code', { roomId }),
    remove:      (id)     => http.delete(`/telegram-links/${id}`),
  }
}
