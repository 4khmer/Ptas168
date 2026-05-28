import { useState } from 'react'
import { z } from 'zod'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import { useStore } from '../../store'
import { useT } from '../../lib/i18n'
import { formatPhone } from '../../lib/phone'
import { validate } from '../../lib/validate'
import { Search, CheckCircle, UserPlus } from 'lucide-react'
import type { TenantDto } from '@ptas/contracts'

interface AddTenantModalProps {
  open: boolean
  onClose: () => void
  roomId: string
  roomName: string
  roomPrice?: number | string
}

export default function AddTenantModal({ open, onClose, roomId, roomName, roomPrice = 0 }: AddTenantModalProps) {
  const t = useT()
  const { lookupTenantByPhone, addTenantToRoom } = useStore()

  const [step,         setStep]         = useState<'phone' | 'found' | 'new' | 'contract'>('phone')
  const [phone,        setPhone]        = useState('')
  const [foundTenant,  setFoundTenant]  = useState<TenantDto | null>(null)
  const [newName,      setNewName]      = useState('')
  const [moveInDate,   setMoveInDate]   = useState(new Date().toISOString().split('T')[0])
  const [secDeposit,   setSecDeposit]   = useState('')
  const [errors,       setErrors]       = useState<Record<string, string>>({})
  const [loading,      setLoading]      = useState(false)

  function reset() {
    setStep('phone'); setPhone(''); setFoundTenant(null); setNewName('')
    setMoveInDate(new Date().toISOString().split('T')[0]); setSecDeposit(''); setErrors({})
  }

  async function handleLookup() {
    const phoneSchema = z.object({
      phone: z.string().trim().min(3, t('modal.addTenant.errEnterPhone')),
    })
    const r = validate(phoneSchema, { phone })
    if (!r.ok) { setErrors(r.errors); return }
    setLoading(true)
    try {
      const found = await lookupTenantByPhone(r.data.phone)
      if (found) { setFoundTenant(found); setStep('found') }
      else        setStep('new')
      setErrors({})
    } catch (e) {
      setErrors({ phone: (e as Error).message || t('modal.addTenant.errLookup') })
    } finally {
      setLoading(false)
    }
  }

  function handleNewNext() {
    const nameSchema = z.object({
      name: z.string().trim().min(1, t('modal.addTenant.errNameReq')).max(120),
    })
    const r = validate(nameSchema, { name: newName })
    if (!r.ok) { setErrors(r.errors); return }
    setErrors({}); setStep('contract')
  }

  async function handleFinalSubmit() {
    const contractSchema = z.object({
      moveIn:  z.string().min(1, t('modal.addTenant.errMoveIn')),
      // The deposit field is optional in the UI; only validate when a value
      // is present. Negative values are rejected.
      deposit: z.union([z.literal(''), z.coerce.number().nonnegative(t('modal.addTenant.errDeposit'))]),
    })
    const r = validate(contractSchema, { moveIn: moveInDate, deposit: secDeposit })
    if (!r.ok) { setErrors(r.errors); return }

    setLoading(true)
    try {
      await addTenantToRoom(roomId, {
        phone: phone.trim(),
        fullName: foundTenant ? undefined : newName.trim(),
        moveInDate,
        // Base rent follows the room's set price; the owner can override
        // later from Room Detail → Tenant tab.
        baseRent: Number(roomPrice) || 0,
        securityDeposit: r.data.deposit === '' ? 0 : Number(r.data.deposit),
        endDate: null,
      })
      reset()
      onClose()
    } catch (e) {
      setErrors({ submit: (e as Error).message || t('modal.addTenant.errAdd') })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title={t('modal.addTenant.title')}>

      {/* Step: Phone lookup */}
      {step === 'phone' && (
        <div>
          <p className="text-[13px] text-[#454745] mb-4">
            {t('modal.addTenant.lookupHelp')}
          </p>
          <Input
            label={t('modal.addTenant.phone')}
            type="tel"
            placeholder={t('modal.addTenant.phonePh')}
            value={phone}
            onChange={e => { setPhone(e.target.value); setErrors({}) }}
            error={errors.phone}
            onKeyDown={e => e.key === 'Enter' && handleLookup()}
          />
          <Button onClick={handleLookup} disabled={loading}>
            <Search size={16} /> {loading ? t('modal.addTenant.lookingUp') : t('modal.addTenant.lookup')}
          </Button>
        </div>
      )}

      {/* Step: Existing tenant found */}
      {step === 'found' && foundTenant && (
        <div>
          <div className="flex items-center gap-2 text-[#1F6F4E] bg-[#E8F6EF] rounded-xl p-3 mb-4">
            <CheckCircle size={18} />
            <span className="text-[13px] font-semibold">{t('modal.addTenant.foundExisting')}</span>
          </div>
          <div className="bg-[#e8ebe6] rounded-xl p-4 mb-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#e8ebe6] flex items-center justify-center text-[#0e0f0c] font-bold text-[18px]">
              {(foundTenant.name || '?')[0]}
            </div>
            <div>
              <div className="text-[15px] font-bold text-[#0e0f0c]">{foundTenant.name}</div>
              <div className="text-[13px] text-[#454745]">{formatPhone(foundTenant.phone)}</div>
            </div>
          </div>
          <Button onClick={() => setStep('contract')}>{t('modal.addTenant.confirmCont')}</Button>
          <button onClick={() => setStep('phone')} className="w-full text-center text-[13px] text-[#454745] mt-3 py-2">
            {t('modal.addTenant.diffNumber')}
          </button>
        </div>
      )}

      {/* Step: New tenant */}
      {step === 'new' && (
        <div>
          <div className="flex items-center gap-2 text-[#0e0f0c] bg-[#e8ebe6] rounded-xl p-3 mb-4">
            <UserPlus size={18} />
            <span className="text-[13px] font-semibold">{t('modal.addTenant.noMatch')}</span>
          </div>
          <div className="bg-[#e8ebe6] rounded-xl p-3 mb-3 text-[13px] text-[#454745]">
            {t('modal.addTenant.phone')}: <span className="font-bold text-[#0e0f0c]">{formatPhone(phone)}</span>
          </div>
          <Input
            label={t('modal.addTenant.fullName')}
            placeholder={t('modal.addTenant.fullNamePh')}
            value={newName}
            onChange={e => { setNewName(e.target.value); setErrors({}) }}
            error={errors.name}
          />
          <Button onClick={handleNewNext}>{t('common.next')}</Button>
          <button onClick={() => setStep('phone')} className="w-full text-center text-[13px] text-[#454745] mt-3 py-2">{t('common.back')}</button>
        </div>
      )}

      {/* Step: Contract details */}
      {step === 'contract' && (
        <div>
          <div className="text-[13px] font-semibold text-[#454745] mb-3">{t('modal.addTenant.contractFor')} {roomName}</div>
          <Input label={t('modal.addTenant.moveIn')} type="date" value={moveInDate}
            onChange={e => { setMoveInDate(e.target.value); setErrors(p => ({ ...p, moveIn: '' })) }} error={errors.moveIn} />
          <Input label={t('modal.addTenant.deposit')} type="number" step="0.01" placeholder={t('modal.addTenant.depositPh')}
            value={secDeposit} onChange={e => { setSecDeposit(e.target.value); setErrors(p => ({ ...p, deposit: '' })) }} error={errors.deposit} />
          <div className="bg-[#e8ebe6] rounded-xl p-3 mb-4 flex items-center justify-between">
            <span className="text-[12px] text-[#454745]">{t('modal.addTenant.rentFromRoom')}</span>
            <span className="text-[14px] font-bold text-[#0e0f0c]">${(Number(roomPrice) || 0).toFixed(2)}/mo</span>
          </div>
          <div className="bg-[#FFF3DF] rounded-xl p-3 mb-4">
            <p className="text-[12px] text-[#8A6408]">
              {t('modal.addTenant.rentNote')}
            </p>
          </div>
          {errors.submit && (
            <div className="bg-[#fdecea] rounded-xl px-4 py-2.5 text-[12px] text-[#c13515] mb-3">{errors.submit}</div>
          )}
          <Button onClick={handleFinalSubmit} disabled={loading}>
            {loading ? t('common.adding') : t('modal.addTenant.confirmAdd')}
          </Button>
          <button onClick={() => setStep(foundTenant ? 'found' : 'new')} className="w-full text-center text-[13px] text-[#454745] mt-3 py-2">{t('common.back')}</button>
        </div>
      )}
    </Modal>
  )
}
