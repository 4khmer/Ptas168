import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Toggle from '../ui/Toggle'
import { useStore } from '../../store'
import { useT } from '../../lib/i18n'
import { Droplets, Zap, ParkingSquare, Wifi, Brush, Shirt, Package, PawPrint, Box } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { RoomServiceInput } from '@ptas/sdk'

const ICON_MAP: Record<string, LucideIcon> = {
  Droplets, Zap, ParkingSquare, Wifi, Brush, Shirt, Package, PawPrint, Box,
}

interface ServiceIconProps { name: string; size?: number }
function ServiceIcon({ name, size = 16 }: ServiceIconProps) {
  const Icon = ICON_MAP[name] || Box
  return <Icon size={size} />
}

interface LocalService extends RoomServiceInput {
  serviceId: string
  name: string
  icon: string
  type: 'fixed' | 'utility'
  defaultRate: number
  unitLabel: string
  enabled: boolean
  priceOverride: number | string
}

interface AddServiceModalProps {
  open: boolean
  onClose: () => void
  roomId: string
  onSave: (services: RoomServiceInput[]) => void | Promise<void>
}

export default function AddServiceModal({ open, onClose, roomId, onSave }: AddServiceModalProps) {
  const t = useT()
  const masterServices = useStore(s => s.masterServices)
  const allRoomServices = useStore(s => s.roomServices)
  const activeContract = useStore(s => s.getActiveContract(roomId))
  const tenantName = activeContract?.tenantName || null

  const [localServices, setLocalServices] = useState<LocalService[]>([])

  useEffect(() => {
    if (!open) return
    // Build state from master services + current room services
    const services = masterServices.map(ms => {
      const existing = allRoomServices.find(rs => rs.roomId === roomId && rs.serviceId === ms.id)
      return {
        serviceId: ms.id,
        name: ms.name,
        icon: ms.icon,
        type: ms.type,
        defaultRate: ms.defaultRate,
        unitLabel: ms.unitLabel,
        enabled: existing?.enabled ?? false,
        priceOverride: existing?.priceOverride ?? '',
      }
    })
    setLocalServices(services)
  }, [open, roomId, masterServices, allRoomServices])

  function toggleService(serviceId: string) {
    setLocalServices(prev =>
      prev.map(s => s.serviceId === serviceId ? { ...s, enabled: !s.enabled } : s)
    )
  }

  function setOverride(serviceId: string, value: string) {
    setLocalServices(prev =>
      prev.map(s => s.serviceId === serviceId ? { ...s, priceOverride: value } : s)
    )
  }

  function handleSave() {
    onSave(localServices)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={tenantName ? t('modal.addService.titleTenant', { tenant: tenantName }) : t('modal.addService.titleRoom')}>
      <p className="text-[13px] text-[#454745] mb-4">
        {tenantName ? t('modal.addService.helpTenant') : t('modal.addService.helpRoom')}
      </p>

      <div className="space-y-0">
        {localServices.map((svc, i) => (
          <div key={svc.serviceId}>
            <div className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    svc.type === 'utility' ? 'bg-[#e8ebe6] text-[#0e0f0c]' : 'bg-[#e8ebe6] text-[#454745]'
                  }`}>
                    <ServiceIcon name={svc.icon} size={16} />
                  </div>
                  <div>
                    <div className="text-[14px] font-bold text-[#0e0f0c]">{svc.name}</div>
                    <div className="text-[11px] text-[#454745]">
                      {t('modal.addService.default')}: ${svc.defaultRate} {svc.unitLabel}
                    </div>
                  </div>
                </div>
                <Toggle on={svc.enabled} onToggle={() => toggleService(svc.serviceId)} />
              </div>

              {svc.enabled && (
                <div className="mt-2.5 ml-10">
                  <label className="text-[12px] font-semibold text-[#454745] mb-1 block">
                    {t('modal.addService.priceOv')} ({svc.unitLabel})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={`${svc.defaultRate} ${t('modal.addService.useDefault')}`}
                    value={svc.priceOverride}
                    onChange={e => setOverride(svc.serviceId, e.target.value)}
                    className="input-base text-[13px]"
                  />
                </div>
              )}
            </div>
            {i < localServices.length - 1 && (
              <div className="h-px bg-[#d1d3cf]" />
            )}
          </div>
        ))}
      </div>

      <div className="mt-4">
        <Button onClick={handleSave}>{t('modal.addService.save')}</Button>
      </div>
    </Modal>
  )
}
