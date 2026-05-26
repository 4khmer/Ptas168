import { api } from './client.js'

export const bankPaymentsApi = {
  list: () => api.get('/bank-payments'),
}
