import type { HttpClient } from '../http/client.js'
import type { BankNotificationGroupDto, MintCodeResponse } from '@ptas/contracts'

export interface BankNotificationGroupsApi {
  list(): Promise<BankNotificationGroupDto[]>
  requestCode(): Promise<MintCodeResponse>
  remove(id: string): Promise<null>
}

export function createBankNotificationGroupsApi(http: HttpClient): BankNotificationGroupsApi {
  return {
    list:        ()   => http.get('/bank-notification-groups'),
    requestCode: ()   => http.post('/bank-notification-groups/code', {}),
    remove:      (id) => http.delete(`/bank-notification-groups/${id}`),
  }
}
