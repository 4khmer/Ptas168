import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import { Droplets, Zap } from 'lucide-react'
import { useT } from '../../lib/i18n'

/**
 * Add a meter reading. Shows Water / Electricity rows based on which services
 * are enabled for the current tenant.
 *
 * Props:
 *   services       — array of room services (only enabled services should be passed in)
 *   lastReading    — most recent grouped reading row { waterCurrent?, elecCurrent? }
 */
export default function AddMeterModal({ open, onClose, onConfirm, lastReading, services = [] }) {
  const t = useT()
  const today = new Date().toISOString().split('T')[0]

  const hasWater = services.some(s => s.serviceType === 'WATER')
  const hasElec  = services.some(s => s.serviceType === 'ELECTRICITY')

  const [date, setDate] = useState(today)
  const [waterCurrent, setWaterCurrent] = useState('')
  const [elecCurrent, setElecCurrent] = useState('')
  const [errors, setErrors] = useState({})

  // Reset form whenever the modal opens
  useEffect(() => {
    if (!open) return
    setDate(today)
    setWaterCurrent('')
    setElecCurrent('')
    setErrors({})
  }, [open]) // eslint-disable-line

  const waterPrev = lastReading?.waterCurrent ?? 0
  const elecPrev  = lastReading?.elecCurrent ?? 0

  function validate() {
    const errs = {}
    if (hasWater) {
      const wc = parseFloat(waterCurrent)
      if (!waterCurrent) errs.water = t('modal.addMeter.errReq')
      else if (wc < waterPrev) errs.water = `${t('modal.addMeter.errLess')} (${waterPrev})`
    }
    if (hasElec) {
      const ec = parseFloat(elecCurrent)
      if (!elecCurrent) errs.elec = t('modal.addMeter.errReq')
      else if (ec < elecPrev) errs.elec = `${t('modal.addMeter.errLess')} (${elecPrev})`
    }
    return errs
  }

  function handleSubmit() {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    onConfirm({
      date,
      recorder: 'Manager',
      waterPrev: hasWater ? waterPrev : null,
      waterCurrent: hasWater ? parseFloat(waterCurrent) : null,
      elecPrev: hasElec ? elecPrev : null,
      elecCurrent: hasElec ? parseFloat(elecCurrent) : null,
    })
    onClose()
  }

  // Neither service enabled — show a clear empty state instead of a useless form
  if (!hasWater && !hasElec) {
    return (
      <Modal open={open} onClose={onClose} hideClose title={t('modal.addMeter.title')}>
        <div className="text-center py-6 text-[13px] text-[#454745]">
          {t('modal.addMeter.empty')}<br />
          {t('modal.addMeter.enableHint')}
        </div>
        <Button onClick={onClose} variant="outline">{t('common.close')}</Button>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={onClose} hideClose title={t('modal.addMeter.title')}>
      <Input
        label={t('modal.addMeter.date')}
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
        className="mb-4"
      />

      {hasWater && (
        <div className="bg-[#EEF7F8] rounded-xl p-3 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-[#e8ebe6] flex items-center justify-center">
              <Droplets size={14} className="text-[#0e0f0c]" />
            </div>
            <span className="text-[13px] font-bold text-[#0e0f0c]">{t('modal.addMeter.water')}</span>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-[#454745] mb-1 block">{t('modal.addMeter.previous')}</label>
              <input className="input-base bg-[#e8ebe6] text-[#454745]" value={waterPrev} readOnly />
            </div>
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-[#454745] mb-1 block">{t('modal.addMeter.current')}</label>
              <input
                type="number"
                className={`input-base ${errors.water ? 'border-[#c13515]' : ''}`}
                placeholder={t('modal.addMeter.enterRead')}
                value={waterCurrent}
                onChange={e => { setWaterCurrent(e.target.value); setErrors(p => ({ ...p, water: '' })) }}
              />
            </div>
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-[#454745] mb-1 block">{t('modal.addMeter.usage')}</label>
              <div className="input-base bg-[#e8ebe6] text-[#0e0f0c] font-bold">
                +{Math.max(0, (parseFloat(waterCurrent) || 0) - waterPrev)}
              </div>
            </div>
          </div>
          {errors.water && <p className="text-[11px] text-[#c13515] mt-1">{errors.water}</p>}
        </div>
      )}

      {hasElec && (
        <div className="bg-[#FFF8E6] rounded-xl p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-[#FFF3DF] flex items-center justify-center">
              <Zap size={14} className="text-[#8A6408]" />
            </div>
            <span className="text-[13px] font-bold text-[#0e0f0c]">{t('modal.addMeter.elec')}</span>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-[#454745] mb-1 block">{t('modal.addMeter.previous')}</label>
              <input className="input-base bg-[#e8ebe6] text-[#454745]" value={elecPrev} readOnly />
            </div>
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-[#454745] mb-1 block">{t('modal.addMeter.current')}</label>
              <input
                type="number"
                className={`input-base ${errors.elec ? 'border-[#c13515]' : ''}`}
                placeholder={t('modal.addMeter.enterRead')}
                value={elecCurrent}
                onChange={e => { setElecCurrent(e.target.value); setErrors(p => ({ ...p, elec: '' })) }}
              />
            </div>
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-[#454745] mb-1 block">{t('modal.addMeter.usage')}</label>
              <div className="input-base bg-[#e8ebe6] text-[#0e0f0c] font-bold">
                +{Math.max(0, (parseFloat(elecCurrent) || 0) - elecPrev)}
              </div>
            </div>
          </div>
          {errors.elec && <p className="text-[11px] text-[#c13515] mt-1">{errors.elec}</p>}
        </div>
      )}

      {/* Footer — Close on the left, Save on the right, equal width. */}
      <div className="flex gap-2">
        <Button onClick={onClose} variant="outline" fullWidth={false} className="flex-1">
          {t('common.close')}
        </Button>
        <Button onClick={handleSubmit} fullWidth={false} className="flex-1">
          {t('modal.addMeter.save')}
        </Button>
      </div>
    </Modal>
  )
}
