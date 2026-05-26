import { useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { useT } from '../../lib/i18n'
import { Banknote, QrCode } from 'lucide-react'
import { payInvoiceSchema } from '@ptas/contracts'
import { validate } from '../../lib/validate.js'

export default function MarkPaidModal({ open, onClose, onConfirm }) {
  const t = useT()
  const [method, setMethod] = useState(null)
  const [errors, setErrors] = useState({})

  function handleConfirm() {
    const result = validate(payInvoiceSchema, { method })
    if (!result.ok) { setErrors(result.errors); return }
    onConfirm(result.data.method)
    setMethod(null); setErrors({})
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={t('modal.markPaid.title')}>
      <p className="text-[13px] text-[#454745] mb-4">{t('modal.markPaid.help')}</p>

      <div className="flex gap-3 mb-2">
        <button
          onClick={() => { setMethod('Cash'); setErrors({}) }}
          className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-colors ${
            method === 'Cash'
              ? 'border-[#9fe870] bg-[#e8ebe6] text-[#0e0f0c]'
              : 'border-[#d1d3cf] bg-white text-[#454745]'
          }`}
        >
          <Banknote size={24} />
          <span className="text-[13px] font-semibold">{t('modal.markPaid.cash')}</span>
        </button>

        <button
          onClick={() => { setMethod('QR Transfer'); setErrors({}) }}
          className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-colors ${
            method === 'QR Transfer'
              ? 'border-[#9fe870] bg-[#e8ebe6] text-[#0e0f0c]'
              : 'border-[#d1d3cf] bg-white text-[#454745]'
          }`}
        >
          <QrCode size={24} />
          <span className="text-[13px] font-semibold">{t('modal.markPaid.qr')}</span>
        </button>
      </div>
      {errors.method && <p className="text-[11px] text-[#c13515] mb-3">{errors.method}</p>}

      <Button onClick={handleConfirm} disabled={!method}>
        {t('modal.markPaid.confirm')}
      </Button>
    </Modal>
  )
}
