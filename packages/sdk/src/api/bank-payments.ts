import type { HttpClient } from '../http/client.js'
import type { BankPaymentDto } from '@ptas/contracts'

export interface BankPaymentsApi {
  list(): Promise<BankPaymentDto[]>
}

export function createBankPaymentsApi(http: HttpClient): BankPaymentsApi {
  return {
    list: () => http.get('/bank-payments'),
  }
}
