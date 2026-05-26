import { useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { Textarea } from '../ui/Input'
import { useT } from '../../lib/i18n'

export default function CancelInvoiceModal({ open, onClose, onConfirm }) {
  const t = useT()
  const [reason, setReason] = useState('')

  function handleConfirm() {
    if (!reason.trim()) return
    onConfirm(reason.trim())
    setReason('')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={t('modal.cancelInv.title')}>
      <div className="bg-[#fdecea] rounded-xl p-3 mb-4">
        <p className="text-[13px] text-[#c13515] leading-relaxed">
          {t('modal.cancelInv.warn')}
        </p>
      </div>

      <Textarea
        label={t('modal.cancelInv.reason')}
        placeholder={t('modal.cancelInv.reasonPh')}
        value={reason}
        onChange={e => setReason(e.target.value)}
        rows={3}
        error={!reason.trim() && reason.length > 0 ? t('modal.cancelInv.reasonReq') : ''}
      />

      <Button variant="danger" onClick={handleConfirm} disabled={!reason.trim()}>
        {t('modal.cancelInv.confirm')}
      </Button>
    </Modal>
  )
}
