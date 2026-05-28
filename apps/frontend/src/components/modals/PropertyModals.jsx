import { useState, useEffect } from 'react'
import { z } from 'zod'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import { useStore } from '../../store'
import { useT } from '../../lib/i18n'
import { createBuildingSchema, createFloorSchema } from '@ptas/contracts'
import { validate } from '../../lib/validate'

// ── New/Edit Building ──────────────────────────────────────────────────────

export function BuildingModal({ open, onClose, existing }) {
  const t = useT()
  const addBuilding = useStore(s => s.addBuilding)
  const updateBuilding = useStore(s => s.updateBuilding)
  const [name, setName] = useState('')
  const [remark, setRemark] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setName(existing?.name || '')
      setRemark(existing?.remark || '')
      setErrors({})
    }
  }, [open, existing])

  async function handleSubmit() {
    const result = validate(createBuildingSchema, { name: name.trim(), remark: remark.trim() || null })
    if (!result.ok) {
      setErrors({ ...result.errors, name: result.errors.name || t('propModal.errBuildingName') })
      if (!name.trim()) return setErrors({ name: t('propModal.errBuildingName') })
      return setErrors(result.errors)
    }
    setLoading(true)
    try {
      if (existing) {
        await updateBuilding(existing.id, result.data)
      } else {
        await addBuilding(result.data)
      }
      onClose()
    } catch (e) {
      setErrors({ submit: e.message || t('propModal.errBuildingSave') })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={existing ? t('propModal.editBuilding') : t('propModal.newBuilding')}>
      <Input label={t('propModal.buildingName')} placeholder={t('propModal.buildingNamePh')} value={name} onChange={e => { setName(e.target.value); setErrors({}) }} error={errors.name} />
      <Input label={t('propModal.remark')} placeholder={t('propModal.remarkBuildingPh')} value={remark} onChange={e => setRemark(e.target.value)} error={errors.remark} />
      {errors.submit && (
        <div className="bg-[#fdecea] rounded-xl px-4 py-2.5 text-[12px] text-[#c13515] mb-3">{errors.submit}</div>
      )}
      <Button onClick={handleSubmit} disabled={loading}>{loading ? t('common.saving') : existing ? t('common.saveChanges') : t('propModal.createBuilding')}</Button>
    </Modal>
  )
}

// ── New/Edit Floor ─────────────────────────────────────────────────────────

export function FloorModal({ open, onClose, existing, buildingId }) {
  const t = useT()
  const addFloor = useStore(s => s.addFloor)
  const updateFloor = useStore(s => s.updateFloor)
  const [name, setName] = useState('')
  const [remark, setRemark] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setName(existing?.name || '')
      setRemark(existing?.remark || '')
      setErrors({})
    }
  }, [open, existing])

  async function handleSubmit() {
    const result = validate(createFloorSchema, { name: name.trim(), remark: remark.trim() || null })
    if (!result.ok) {
      if (!name.trim()) return setErrors({ name: t('propModal.errFloorName') })
      return setErrors(result.errors)
    }
    setLoading(true)
    try {
      if (existing) {
        await updateFloor(existing.id, result.data)
      } else {
        await addFloor({ buildingId, ...result.data })
      }
      onClose()
    } catch (e) {
      setErrors({ submit: e.message || t('propModal.errFloorSave') })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={existing ? t('propModal.editFloor') : t('propModal.newFloor')}>
      <Input label={t('propModal.floorName')} placeholder={t('propModal.floorNamePh')} value={name} onChange={e => { setName(e.target.value); setErrors({}) }} error={errors.name} />
      <Input label={t('propModal.remark')} placeholder={t('propModal.remarkFloorPh')} value={remark} onChange={e => setRemark(e.target.value)} error={errors.remark} />
      {errors.submit && (
        <div className="bg-[#fdecea] rounded-xl px-4 py-2.5 text-[12px] text-[#c13515] mb-3">{errors.submit}</div>
      )}
      <Button onClick={handleSubmit} disabled={loading}>{loading ? t('common.saving') : existing ? t('common.saveChanges') : t('propModal.createFloor')}</Button>
    </Modal>
  )
}

// ── New/Edit Room ──────────────────────────────────────────────────────────

export function RoomModal({ open, onClose, existing, floorId, buildingId }) {
  const t = useT()
  const addRoom = useStore(s => s.addRoom)
  const updateRoom = useStore(s => s.updateRoom)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setName(existing?.name || '')
      setPrice(existing?.price || '')
      setErrors({})
    }
  }, [open, existing])

  async function handleSubmit() {
    // Form-shape schema (UI uses `price`; the SDK maps to wire `pricePerMonth`).
    const formSchema = z.object({
      name: z.string().trim().min(1, t('propModal.errRoomName')).max(120),
      price: z.coerce.number({ invalid_type_error: t('propModal.errRoomPrice') })
        .positive(t('propModal.errRoomPrice')),
    }).strict()

    const result = validate(formSchema, { name: name.trim(), price })
    if (!result.ok) { setErrors(result.errors); return }

    setLoading(true)
    try {
      if (existing) {
        await updateRoom(existing.id, result.data)
      } else {
        await addRoom({ floorId, buildingId, ...result.data })
      }
      onClose()
    } catch (e) {
      setErrors({ submit: e.message || t('propModal.errRoomSave') })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={existing ? t('propModal.editRoom') : t('propModal.newRoom')}>
      <Input label={t('propModal.roomName')} placeholder={t('propModal.roomNamePh')} value={name} onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })) }} error={errors.name} />
      <Input label={t('propModal.priceMo')} type="number" placeholder={t('propModal.pricePh')} value={price} onChange={e => { setPrice(e.target.value); setErrors(p => ({ ...p, price: '' })) }} error={errors.price} />
      {errors.submit && (
        <div className="bg-[#fdecea] rounded-xl px-4 py-2.5 text-[12px] text-[#c13515] mb-3">{errors.submit}</div>
      )}
      <Button onClick={handleSubmit} disabled={loading}>{loading ? t('common.saving') : existing ? t('common.saveChanges') : t('propModal.createRoom')}</Button>
    </Modal>
  )
}
