import { api } from './client.js'

// Backend stores settings as a flat string key/value map.
// Known keys: KHR_EXCHANGE_RATE, INVOICE_HEADER_ENABLED, INVOICE_BIZ_NAME, INVOICE_TIN_NO,
// INVOICE_ADDRESS, INVOICE_BIZ_PHONE, INVOICE_NO_DIGITS, INVOICE_FOOTER_ENABLED, INVOICE_FOOTER_NOTE,
// INVOICE_QR_ENABLED, INVOICE_QR_STRING.

export const settingsApi = {
  get: () => api.get('/settings'),
  update: (kv) => api.patch('/settings', kv),
}

// Convert flat key/value bag → nested invoice settings shape used by the UI.
export function parseInvoiceSettings(s = {}) {
  return {
    header: {
      enabled: s.INVOICE_HEADER_ENABLED !== 'false',
      profileImage: null,
      bizName: s.INVOICE_BIZ_NAME || '',
      tinNo: s.INVOICE_TIN_NO || '',
      address: s.INVOICE_ADDRESS || '',
      bizPhone: s.INVOICE_BIZ_PHONE || '',
    },
    body: {
      enabled: true,
      invoiceNoDigits: parseInt(s.INVOICE_NO_DIGITS || '6', 10),
    },
    footer: {
      enabled: s.INVOICE_FOOTER_ENABLED !== 'false',
      note: s.INVOICE_FOOTER_NOTE || '',
    },
    qr: {
      enabled: s.INVOICE_QR_ENABLED === 'true',
      qrString: s.INVOICE_QR_STRING || '',
    },
  }
}
