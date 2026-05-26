import type { SettingsMap } from '@ptas/contracts'

// UI shape that the frontend's invoice-setup form binds to.
export interface InvoiceSettings {
  header: {
    enabled: boolean
    profileImage: string | null
    bizName: string
    tinNo: string
    address: string
    bizPhone: string
  }
  body: {
    enabled: boolean
    invoiceNoDigits: number
  }
  footer: {
    enabled: boolean
    note: string
  }
  qr: {
    enabled: boolean
    qrString: string
  }
}

// Flat key/value bag → nested invoice settings shape.
export function parseInvoiceSettings(s: SettingsMap = {}): InvoiceSettings {
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
