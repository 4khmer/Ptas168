import { useState, useEffect } from 'react'
import { useStore } from '../store'
import PageHeader from '../components/layout/PageHeader'
import Card, { Divider } from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import { ConfirmModal } from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import { Plus, Edit2, Trash2, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { useT } from '../lib/i18n'
import type { TFunction } from '../lib/i18n'
import { formatPhone } from '../lib/phone'
import type { UserDto } from '@ptas/contracts'

const ROLES = [
  { value: 'manager', labelKey: 'subUsers.role.manager',  subKey: 'subUsers.role.managerSub', color: 'bg-[#e8ebe6] text-[#0e0f0c]' },
  { value: 'staff',   labelKey: 'subUsers.role.staff',    subKey: 'subUsers.role.staffSub',   color: 'bg-[#E8F6EF] text-[#1F6F4E]' },
  { value: 'viewer',  labelKey: 'subUsers.role.viewer',   subKey: 'subUsers.role.viewerSub',  color: 'bg-[#e8ebe6] text-[#454745]' },
]

function roleMeta(value: string) {
  return ROLES.find(r => r.value === value) || ROLES[2]
}

interface RoleBadgeProps { role: string; t: TFunction }
function RoleBadge({ role, t }: RoleBadgeProps) {
  const meta = roleMeta(role)
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.color}`}>
      {t(meta.labelKey)}
    </span>
  )
}

interface StatusDotProps { status: string }
function StatusDot({ status }: StatusDotProps) {
  return (
    <span className={`inline-block w-1.5 h-1.5 rounded-full ${status === 'active' ? 'bg-[#22C55E]' : 'bg-[#D1D5DB]'}`} />
  )
}

interface SubUserFormState {
  name: string
  role: string
  phone: string
  password: string
  status: 'active' | 'inactive'
}

const EMPTY_FORM: SubUserFormState = { name: '', role: 'staff', phone: '', password: '', status: 'active' }

export default function SubUsers() {
  const t = useT()
  const { subUsers, addSubUser, updateSubUser, deleteSubUser, loadSubUsers } = useStore()

  const [addOpen,    setAddOpen]    = useState(false)
  const [editTarget, setEditTarget] = useState<UserDto | null>(null)   // user object
  const [deleteId,   setDeleteId]   = useState<string | null>(null)
  const [saving,     setSaving]     = useState(false)
  const [saveError,  setSaveError]  = useState('')

  const [form,   setForm]   = useState<SubUserFormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPin, setShowPin] = useState(false)

  useEffect(() => { loadSubUsers() }, []) // eslint-disable-line

  function set<K extends keyof SubUserFormState>(key: K, val: SubUserFormState[K]) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function openAdd() {
    setForm(EMPTY_FORM)
    setErrors({})
    setShowPin(false)
    setAddOpen(true)
  }

  function openEdit(user: UserDto) {
    setForm({ name: user.name, role: user.role, phone: user.phone || '', password: '', status: user.status })
    setErrors({})
    setShowPin(false)
    setEditTarget(user)
  }

  function validate(isAdd: boolean) {
    const errs: Record<string, string> = {}
    if (!form.name.trim())  errs.name  = t('subUsers.errName')
    if (!form.phone.trim()) errs.phone = t('subUsers.errPhone')
    if (isAdd && (!form.password || form.password.length < 6)) errs.password = t('subUsers.errPwd')
    if (!isAdd && form.password && form.password.length < 6)   errs.password = t('subUsers.errPwd')
    return errs
  }

  async function handleSaveAdd() {
    const errs = validate(true)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    setSaveError('')
    try {
      await addSubUser({ name: form.name.trim(), role: form.role, phone: form.phone.trim(), password: form.password, status: form.status })
      setAddOpen(false)
    } catch (e) {
      setSaveError((e as Error).message || t('subUsers.errCreate'))
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveEdit() {
    if (!editTarget) return
    const errs = validate(false)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    setSaveError('')
    try {
      await updateSubUser(editTarget.id, { name: form.name.trim(), role: form.role, phone: form.phone.trim(), password: form.password, status: form.status })
      setEditTarget(null)
    } catch (e) {
      setSaveError((e as Error).message || t('subUsers.errUpdate'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await deleteSubUser(deleteId)
    } catch (_) { /* swallow */ }
    setDeleteId(null)
  }

  const isModalOpen = addOpen || !!editTarget
  const modalTitle  = addOpen ? t('subUsers.add') : `${t('subUsers.edit')} ${editTarget?.name}`

  function handleSave() { addOpen ? handleSaveAdd() : handleSaveEdit() }
  function closeModal()  { setAddOpen(false); setEditTarget(null); setSaveError('') }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader title={t('subUsers.title')} />

      <div className="flex-1 min-h-0 tab-list-scroll scrollbar-hide">
        <div className="tab-list-scroll-content tab-list-scroll-content--with-flush-fab space-y-4">

        {/* Info note */}
        <div className="bg-[#e8ebe6] rounded-xl px-4 py-3 text-[12px] text-[#0e0f0c]">
          {t('subUsers.helpNote')}
        </div>

        {/* List */}
        {subUsers.length === 0 ? (
          <div className="text-center py-10 text-[13px] text-[#454745]">{t('subUsers.noUsers')}</div>
        ) : (
          <Card padding={false}>
            {subUsers.map((user, i) => (
              <div key={user.id}>
                <div className="flex items-center justify-between px-4 py-3.5">
                  {/* Avatar + info */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#e8ebe6] flex items-center justify-center text-[#454745] font-bold text-[16px] flex-shrink-0">
                      {user.name[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[14px] font-bold text-[#0e0f0c]">{user.name}</span>
                        <StatusDot status={user.status} />
                      </div>
                      <div className="text-[12px] text-[#454745] mt-0.5">{formatPhone(user.phone)}</div>
                      <div className="mt-1">
                        <RoleBadge role={user.role} t={t} />
                      </div>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEdit(user)}
                      className="w-8 h-8 rounded-lg bg-[#e8ebe6] flex items-center justify-center text-[#454745]"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteId(user.id)}
                      className="w-8 h-8 rounded-lg bg-[#fdecea] flex items-center justify-center text-[#c13515]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {i < subUsers.length - 1 && <Divider />}
              </div>
            ))}
          </Card>
        )}
        </div>
      </div>

      {/* Floating Add Sub User — bottom-right */}
      <button
        type="button"
        onClick={openAdd}
        aria-label={t('common.add')}
        className="fab-bottom fab-flush flex items-center gap-1.5 pl-3.5 pr-4 h-12 rounded-full bg-[#9fe870] hover:bg-[#cdffad] active:scale-[0.97] text-[#0e0f0c] text-[14px] font-semibold shadow-lg transition-transform"
      >
        <Plus size={18} strokeWidth={2.5} />
        {t('common.add')}
      </button>

      {/* Add / Edit modal */}
      <Modal open={isModalOpen} onClose={closeModal} title={modalTitle}>

        {/* Role picker */}
        <div className="mb-3">
          <label className="text-[13px] font-semibold text-[#454745] mb-1.5 block">{t('subUsers.role')}</label>
          <div className="space-y-2">
            {ROLES.map(r => (
              <button
                key={r.value}
                onClick={() => set('role', r.value)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border-[1.5px] transition-colors ${
                  form.role === r.value
                    ? 'border-[#9fe870] bg-[#e8ebe6]'
                    : 'border-[#d1d3cf] bg-white'
                }`}
              >
                <div className="text-left">
                  <div className={`text-[13px] font-bold ${form.role === r.value ? 'text-[#0e0f0c]' : 'text-[#0e0f0c]'}`}>{t(r.labelKey)}</div>
                  <div className="text-[11px] text-[#454745]">{t(r.subKey)}</div>
                </div>
                {form.role === r.value && (
                  <ShieldCheck size={16} className="text-[#0e0f0c] flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>

        <Input
          label={t('subUsers.fullName')}
          placeholder={t('subUsers.fullNamePh')}
          value={form.name}
          onChange={e => set('name', e.target.value)}
          error={errors.name}
        />
        <Input
          label={t('subUsers.phone')}
          placeholder={t('subUsers.phonePh')}
          type="tel"
          value={form.phone}
          onChange={e => set('phone', e.target.value)}
          error={errors.phone}
        />

        {/* Password with show/hide */}
        <div className="mb-3">
          <label className="text-[13px] font-semibold text-[#454745] mb-1.5 block">{t('subUsers.password')}</label>
          <div className="relative">
            <input
              type={showPin ? 'text' : 'password'}
              placeholder={t('subUsers.passwordPh')}
              value={form.password}
              onChange={e => set('password', e.target.value)}
              className={`w-full px-3 py-2.5 pr-10 rounded-xl border-[1.5px] text-[14px] outline-none bg-white focus:border-[#9fe870] ${errors.password ? 'border-[#c13515]' : 'border-[#d1d3cf]'}`}
            />
            <button
              type="button"
              onClick={() => setShowPin(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#454745]"
            >
              {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && <p className="text-[11px] text-[#c13515] mt-1">{errors.password}</p>}
        </div>

        {/* Status toggle (edit only) */}
        {!!editTarget && (
          <div className="flex items-center justify-between bg-[#e8ebe6] rounded-xl px-4 py-3 mb-3">
            <div>
              <div className="text-[13px] font-bold text-[#0e0f0c]">{t('subUsers.accountStatus')}</div>
              <div className="text-[11px] text-[#454745]">{form.status === 'active' ? t('subUsers.activeNote') : t('subUsers.inactiveNote')}</div>
            </div>
            <button
              onClick={() => set('status', form.status === 'active' ? 'inactive' : 'active')}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${form.status === 'active' ? 'bg-[#9fe870]' : 'bg-[#D1D5DB]'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.status === 'active' ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        )}

        {saveError && (
          <div className="mb-2 rounded-xl bg-[#fdecea] px-3 py-2 text-[12px] font-semibold text-[#c13515]">
            {saveError}
          </div>
        )}
        <Button onClick={handleSave} disabled={saving}>
          {saving ? t('common.saving') : addOpen ? t('subUsers.create') : t('common.saveChanges')}
        </Button>
      </Modal>

      {/* Delete confirm */}
      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={t('subUsers.removeTitle')}
        message={t('subUsers.removeMsg')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        confirmVariant="danger"
      />
    </div>
  )
}
