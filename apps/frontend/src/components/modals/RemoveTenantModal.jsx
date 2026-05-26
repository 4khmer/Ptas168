import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { useT } from '../../lib/i18n'

export default function RemoveTenantModal({ open, onClose, onConfirm, tenantName, roomName }) {
  const t = useT()

  function handleConfirm() {
    onConfirm()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={t('modal.removeTenant.title')}>
      <div className="mb-4">
        <div className="text-[14px] font-bold text-[#0e0f0c] mb-1">
          {t('modal.removeTenant.head', { tenant: tenantName, room: roomName })}
        </div>
        <div className="text-[13px] text-[#454745] leading-relaxed">
          {t('modal.removeTenant.body')}
        </div>
      </div>

      <Button variant="danger" onClick={handleConfirm}>
        {t('modal.removeTenant.confirm')}
      </Button>
    </Modal>
  )
}
