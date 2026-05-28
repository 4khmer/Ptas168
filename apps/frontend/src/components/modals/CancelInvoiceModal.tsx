import { useState } from 'react'
import { z } from 'zod'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { Textarea } from '../ui/Input'
import { useT } from '../../lib/i18n'
import { validate } from '../../lib/validate'

interface CancelInvoiceModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (reason: string) => void | Promise<void>
}

export default function CancelInvoiceModal({ open, onClose, onConfirm }: CancelInvoiceModalProps) {
  const t = useT()
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function handleConfirm() {
    const schema = z.object({
      reason: z.string().trim().min(1, t('modal.cancelInv.reasonReq')).max(500),
    }).strict()
    const result = validate(schema, { reason })
    if (!result.ok) { setErrors(result.errors); return }
    onConfirm(result.data.reason)
    setReason(''); setErrors({})
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
        onChange={e => { setReason(e.target.value); setErrors({}) }}
        rows={3}
        error={errors.reason}
      />

      <Button variant="danger" onClick={handleConfirm} disabled={!reason.trim()}>
        {t('modal.cancelInv.confirm')}
      </Button>
    </Modal>
  )
}
