import { useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { useT } from '../../lib/i18n'
import { Banknote, QrCode } from 'lucide-react'

export default function MarkPaidModal({ open, onClose, onConfirm }) {
  const t = useT()
  const [method, setMethod] = useState(null)

  function handleConfirm() {
    if (!method) return
    onConfirm(method)
    setMethod(null)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={t('modal.markPaid.title')}>
      <p className="text-[13px] text-[#454745] mb-4">{t('modal.markPaid.help')}</p>

      <div className="flex gap-3 mb-5">
        <button
          onClick={() => setMethod('Cash')}
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
          onClick={() => setMethod('QR Transfer')}
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

      <Button onClick={handleConfirm} disabled={!method}>
        {t('modal.markPaid.confirm')}
      </Button>
    </Modal>
  )
}
