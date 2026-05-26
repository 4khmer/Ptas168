import { useState } from 'react'
import { useStore } from '../store'
import PageHeader from '../components/layout/PageHeader'
import Card, { Divider } from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Toggle from '../components/ui/Toggle'
import { Droplets, Zap, ParkingSquare, Wifi, Brush, Shirt, Package, PawPrint, Box, Plus, Edit2, Trash2 } from 'lucide-react'
import { useT } from '../lib/i18n'

const ICON_MAP = { Droplets, Zap, ParkingSquare, Wifi, Brush, Shirt, Package, PawPrint, Box }
const ICON_OPTIONS = Object.keys(ICON_MAP)

function ServiceIcon({ name, size = 18 }) {
  const Icon = ICON_MAP[name] || Box
  return <Icon size={size} />
}

export default function ServiceFees() {
  const t = useT()
  const { masterServices, updateMasterService, addMasterService, deleteMasterService } = useStore()

  const [editModal, setEditModal] = useState({ open: false, service: null })
  const [newModal, setNewModal] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [newLoading, setNewLoading] = useState(false)
  const [editError, setEditError] = useState('')

  // Edit state
  const [editRate, setEditRate] = useState('')
  const [editName, setEditName] = useState('')
  const [editIcon, setEditIcon] = useState('Box')

  // New service state
  const [newName, setNewName] = useState('')
  const [newRate, setNewRate] = useState('')
  const [newIcon, setNewIcon] = useState('Box')
  const [newIsDefault, setNewIsDefault] = useState(false)
  const [newErrors, setNewErrors] = useState({})

  async function toggleDefault(svc) {
    try {
      await updateMasterService(svc.id, { isDefault: !svc.isDefault })
    } catch (e) {
      setDeleteError(e.message || t('svcFees.errUpdateDefault'))
    }
  }

  function openEdit(svc) {
    setEditRate(String(svc.defaultRate))
    setEditName(svc.name)
    setEditIcon(svc.icon)
    setEditError('')
    setEditModal({ open: true, service: svc })
  }

  async function handleSaveEdit() {
    const { service } = editModal
    setEditLoading(true)
    try {
      await updateMasterService(service.id, {
        name: editName.trim() || service.name,
        defaultRate: parseFloat(editRate) || service.defaultRate,
        icon: editIcon,
      })
      setEditModal({ open: false, service: null })
    } catch (e) {
      setEditError(e.message || t('svcFees.errSave'))
    } finally {
      setEditLoading(false)
    }
  }

  async function handleDelete(id) {
    try {
      await deleteMasterService(id)
      setDeleteError('')
    } catch (e) {
      setDeleteError(e.message || t('svcFees.errDelete'))
    }
  }

  async function handleAddNew() {
    const errs = {}
    if (!newName.trim()) errs.name = t('svcFees.errName')
    if (!newRate || parseFloat(newRate) <= 0) errs.rate = t('svcFees.errRate')
    if (Object.keys(errs).length) { setNewErrors(errs); return }
    setNewLoading(true)
    try {
      await addMasterService({
        name: newName.trim(),
        defaultRate: parseFloat(newRate),
        icon: newIcon,
        type: 'fixed',
        unitLabel: '$/mo',
        canDelete: true,
        isDefault: newIsDefault,
      })
      setNewName('')
      setNewRate('')
      setNewIcon('Box')
      setNewIsDefault(false)
      setNewErrors({})
      setNewModal(false)
    } catch (e) {
      setNewErrors({ submit: e.message || t('svcFees.errCreate') })
    } finally {
      setNewLoading(false)
    }
  }

  const utilities = masterServices.filter(s => s.type === 'utility')
  const custom    = masterServices.filter(s => s.type === 'fixed')

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader title={t('svcFees.title')} />

      <div className="flex-1 min-h-0 tab-list-scroll scrollbar-hide">
        <div className="tab-list-scroll-content tab-list-scroll-content--with-flush-fab space-y-4">

        {deleteError && (
          <div className="bg-[#fdecea] rounded-xl p-3 text-[13px] text-[#c13515]">{deleteError}</div>
        )}

        <div className="bg-[#e8ebe6] rounded-xl px-3 py-2.5 text-[12px] text-[#454745]">
          {t('svcFees.helpDefault')}
        </div>

        {/* Utilities — system-seeded Water + Electricity. Not deletable, but
            rate is editable and the Default toggle controls auto-add on new
            tenant contracts (backend: contracts.service.ts default-services). */}
        {utilities.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold text-[#454745] uppercase tracking-wide mb-2">{t('svcFees.utilities')}</div>
            <Card padding={false}>
              {utilities.map((svc, i) => (
                <div key={svc.id}>
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#e8ebe6] flex items-center justify-center text-[#454745]">
                        <ServiceIcon name={svc.icon} />
                      </div>
                      <div>
                        <div className="text-[14px] font-bold text-[#0e0f0c]">{svc.name}</div>
                        <div className="text-[11px] text-[#454745]">{svc.unitLabel}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-center mr-1">
                        <span className="text-[9px] text-[#454745] uppercase tracking-wide leading-none mb-1">{t('svcFees.default')}</span>
                        <Toggle on={!!svc.isDefault} onToggle={() => toggleDefault(svc)} />
                      </div>
                      <div className="text-[14px] font-bold text-[#0e0f0c]">${svc.defaultRate}</div>
                      <button
                        onClick={() => openEdit(svc)}
                        className="w-8 h-8 rounded-lg bg-[#e8ebe6] flex items-center justify-center text-[#454745]"
                      >
                        <Edit2 size={14} />
                      </button>
                    </div>
                  </div>
                  {i < utilities.length - 1 && <Divider />}
                </div>
              ))}
            </Card>
          </div>
        )}

        {/* Custom services */}
        <div>
          <div className="text-[11px] font-semibold text-[#454745] uppercase tracking-wide mb-2">{t('svcFees.custom')}</div>
          {custom.length === 0 ? (
            <div className="text-center py-6 text-[13px] text-[#454745]">{t('svcFees.noCustom')}</div>
          ) : (
            <Card padding={false}>
              {custom.map((svc, i) => (
                <div key={svc.id}>
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#e8ebe6] flex items-center justify-center text-[#454745]">
                        <ServiceIcon name={svc.icon} />
                      </div>
                      <div>
                        <div className="text-[14px] font-bold text-[#0e0f0c]">{svc.name}</div>
                        <div className="text-[11px] text-[#454745]">{svc.unitLabel}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-center mr-1">
                        <span className="text-[9px] text-[#454745] uppercase tracking-wide leading-none mb-1">{t('svcFees.default')}</span>
                        <Toggle on={!!svc.isDefault} onToggle={() => toggleDefault(svc)} />
                      </div>
                      <div className="text-[14px] font-bold text-[#0e0f0c]">${svc.defaultRate}</div>
                      <button
                        onClick={() => openEdit(svc)}
                        className="w-8 h-8 rounded-lg bg-[#e8ebe6] flex items-center justify-center text-[#454745]"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(svc.id)}
                        className="w-8 h-8 rounded-lg bg-[#fdecea] flex items-center justify-center text-[#c13515]"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {i < custom.length - 1 && <Divider />}
                </div>
              ))}
            </Card>
          )}
        </div>
        </div>
      </div>

      {/* Floating Add Service — bottom-right (no bottom-nav on detail routes) */}
      <button
        type="button"
        onClick={() => setNewModal(true)}
        aria-label={t('common.add')}
        className="fab-bottom fab-flush flex items-center gap-1.5 pl-3.5 pr-4 h-12 rounded-full bg-[#9fe870] hover:bg-[#cdffad] active:scale-[0.97] text-[#0e0f0c] text-[14px] font-semibold shadow-lg transition-transform"
      >
        <Plus size={18} strokeWidth={2.5} />
        {t('common.add')}
      </button>

      {/* Edit service modal */}
      <Modal
        open={editModal.open}
        onClose={() => setEditModal({ open: false, service: null })}
        title={`${t('svcFees.editTitle')} ${editModal.service?.name}`}
      >
        {editModal.service && !editModal.service.canDelete && (
          <div className="bg-[#e8ebe6] rounded-xl p-3 mb-3 text-[12px] text-[#0e0f0c]">
            {t('svcFees.rateNote')}
          </div>
        )}

        {editModal.service?.canDelete && (
          <div className="mb-3">
            <label className="text-[13px] font-semibold text-[#454745] mb-1.5 block">{t('svcFees.icon')}</label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map(name => {
                const Icon = ICON_MAP[name]
                return (
                  <button
                    key={name}
                    onClick={() => setEditIcon(name)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-colors ${
                      editIcon === name ? 'border-[#9fe870] bg-[#e8ebe6] text-[#0e0f0c]' : 'border-[#d1d3cf] bg-white text-[#454745]'
                    }`}
                  >
                    <Icon size={18} />
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {editModal.service?.canDelete && (
          <Input label={t('svcFees.serviceName')} value={editName} onChange={e => setEditName(e.target.value)} />
        )}

        <Input
          label={`${t('svcFees.monthlyRate').replace(' ($)', '')} (${editModal.service?.unitLabel || '$/mo'})`}
          type="number"
          step="0.01"
          value={editRate}
          onChange={e => setEditRate(e.target.value)}
        />
        {editError && (
          <div className="bg-[#fdecea] rounded-xl px-4 py-2.5 text-[12px] text-[#c13515] mb-3">{editError}</div>
        )}
        <Button onClick={handleSaveEdit} disabled={editLoading}>{editLoading ? t('common.saving') : t('common.saveChanges')}</Button>
      </Modal>

      {/* New service modal */}
      <Modal open={newModal} onClose={() => setNewModal(false)} title={t('svcFees.newTitle')}>
        <div className="mb-3">
          <label className="text-[13px] font-semibold text-[#454745] mb-1.5 block">{t('svcFees.icon')}</label>
          <div className="flex flex-wrap gap-2">
            {ICON_OPTIONS.map(name => {
              const Icon = ICON_MAP[name]
              return (
                <button
                  key={name}
                  onClick={() => setNewIcon(name)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-colors ${
                    newIcon === name ? 'border-[#9fe870] bg-[#e8ebe6] text-[#0e0f0c]' : 'border-[#d1d3cf] bg-white text-[#454745]'
                  }`}
                >
                  <Icon size={18} />
                </button>
              )
            })}
          </div>
        </div>
        <Input label={t('svcFees.serviceName')} placeholder={t('svcFees.serviceNamePh')} value={newName} onChange={e => setNewName(e.target.value)} error={newErrors.name} />
        <Input label={t('svcFees.monthlyRate')} type="number" placeholder={t('svcFees.monthlyRatePh')} value={newRate} onChange={e => setNewRate(e.target.value)} error={newErrors.rate} />
        <div className="flex items-center justify-between bg-[#e8ebe6] rounded-xl px-3.5 py-2.5 mb-3">
          <div>
            <div className="text-[13px] font-semibold text-[#0e0f0c]">{t('svcFees.defaultService')}</div>
            <div className="text-[11px] text-[#454745]">{t('svcFees.defaultServiceSub')}</div>
          </div>
          <Toggle on={newIsDefault} onToggle={() => setNewIsDefault(v => !v)} />
        </div>
        {newErrors.submit && (
          <div className="bg-[#fdecea] rounded-xl px-4 py-2.5 text-[12px] text-[#c13515] mb-3">{newErrors.submit}</div>
        )}
        <Button onClick={handleAddNew} disabled={newLoading}>{newLoading ? t('common.creating') : t('svcFees.createService')}</Button>
      </Modal>
    </div>
  )
}
