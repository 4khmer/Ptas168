import { useState, useRef } from 'react'
import { useStore } from '../store'
import PageHeader from '../components/layout/PageHeader'
import { useT } from '../lib/i18n'
import { resizeImageToBlob } from '../lib/image'
import { uploadsApi } from '../api/uploads'
import { Camera, Eye, EyeOff, Check } from 'lucide-react'

const ROLE_KEY = { owner: 'more.role.owner', manager: 'more.role.manager', staff: 'more.role.staff', viewer: 'more.role.viewer' }
const ROLE_COLOR = {
  owner:   'bg-[#e8ebe6] text-[#0e0f0c]',
  manager: 'bg-[#e8ebe6] text-[#0e0f0c]',
  staff:   'bg-[#E8F6EF] text-[#1F6F4E]',
  viewer:  'bg-[#e8ebe6] text-[#454745]',
}

function Field({ label, value, onChange, placeholder, type = 'text', readOnly = false }) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-[#454745] uppercase tracking-[0.4px] mb-1.5 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange ? e => onChange(e.target.value) : undefined}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`w-full px-4 py-3 rounded-xl border-[1.5px] text-[14px] outline-none transition-colors ${
          readOnly
            ? 'border-[#d1d3cf] bg-[#e8ebe6] text-[#454745] cursor-default'
            : 'border-[#d1d3cf] bg-white text-[#0e0f0c] focus:border-[#9fe870]'
        }`}
      />
    </div>
  )
}

function PasswordField({ label, value, onChange, placeholder, error }) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="text-[11px] font-semibold text-[#454745] uppercase tracking-[0.4px] mb-1.5 block">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full px-4 py-3 pr-12 rounded-xl border-[1.5px] text-[14px] outline-none bg-white transition-colors focus:border-[#9fe870] ${error ? 'border-[#c13515]' : 'border-[#d1d3cf]'}`}
        />
        <button type="button" onClick={() => setShow(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#868685]">
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      {error && <p className="text-[11px] text-[#c13515] mt-1">{error}</p>}
    </div>
  )
}

function SectionLabel({ children }) {
  return <div className="text-[11px] font-bold text-[#454745] uppercase tracking-wider pt-2 pb-1">{children}</div>
}

function SaveBanner({ show, label }) {
  if (!show) return null
  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-[#1F6F4E] text-white text-[13px] font-semibold px-4 py-2.5 rounded-full shadow-lg">
      <Check size={14} /> {label}
    </div>
  )
}

export default function Profile() {
  const t = useT()
  const { authUser, updateAuthProfile, changeAuthPassword } = useStore()

  // ── Profile form state ──
  const [name,     setName]     = useState(authUser?.name     || '')
  const [username, setUsername] = useState(authUser?.username || '')
  const [phone,    setPhone]    = useState(authUser?.phone    || '')
  const [avatar,   setAvatar]   = useState(authUser?.profileImage || null)

  // ── Password form state ──
  const [currentPwd,  setCurrentPwd]  = useState('')
  const [newPwd,      setNewPwd]      = useState('')
  const [confirmPwd,  setConfirmPwd]  = useState('')
  const [pwdErrors,   setPwdErrors]   = useState({})

  const [profileSaved, setProfileSaved] = useState(false)
  const [pwdSaved,     setPwdSaved]     = useState(false)
  const [pwdError,     setPwdError]     = useState('')
  const [profileError, setProfileError] = useState('')

  const fileRef = useRef(null)

  if (!authUser) return null

  // ── Avatar upload ──
  // Resize → POST /api/uploads → store the returned URL. The DB only
  // sees a short URL string, not the binary content.
  async function handleAvatarFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setProfileError('')
    try {
      const blob = await resizeImageToBlob(file, { maxDimension: 512 })
      const { url } = await uploadsApi.upload(new File([blob], 'avatar.jpg', { type: blob.type }))
      setAvatar(url)
    } catch (err) {
      setProfileError(err?.message || 'Upload failed')
    }
  }

  // ── Save profile ──
  async function handleSaveProfile() {
    if (!name.trim()) return
    setProfileError('')
    const trimmedUsername = username.trim()
    const usernameChanged = trimmedUsername && trimmedUsername !== authUser.username
    try {
      await updateAuthProfile({
        name: name.trim(),
        ...(usernameChanged ? { username: trimmedUsername } : {}),
        phone: phone.trim(),
        profileImage: avatar,
      })
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 2000)
    } catch (e) {
      setProfileError(e.message || 'Save failed')
      setUsername(authUser.username || '')   // revert local input on conflict
    }
  }

  // ── Change password ──
  async function handleChangePassword() {
    const errs = {}
    if (!currentPwd)                   errs.current = t('profile.errCurPwd')
    if (!newPwd || newPwd.length < 6)  errs.new     = t('profile.errNewPwd')
    if (newPwd !== confirmPwd)         errs.confirm  = t('profile.errMatch')
    if (Object.keys(errs).length) { setPwdErrors(errs); return }

    const result = await changeAuthPassword(currentPwd, newPwd)
    if (!result.success) {
      setPwdErrors({ current: result.error })
      return
    }
    setPwdErrors({})
    setPwdError('')
    setCurrentPwd('')
    setNewPwd('')
    setConfirmPwd('')
    setPwdSaved(true)
    setTimeout(() => setPwdSaved(false), 2000)
  }

  const isTelegram = authUser.via === 'telegram'

  return (
    <div className="app-shell">
      <PageHeader title={t('profile.title')} />

      <SaveBanner show={profileSaved || pwdSaved} label={t('profile.savedOk')} />

      <div className="page-content scrollbar-hide p-4 space-y-4" style={{ paddingBottom: '32px' }}>

        {/* ── Avatar ── */}
        <div className="flex flex-col items-center py-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#d1d3cf] bg-[#e8ebe6] flex items-center justify-center">
              {avatar ? (
                <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[36px] font-bold text-[#0e0f0c]">
                  {authUser.name?.[0]?.toUpperCase() || '?'}
                </span>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#9fe870] text-[#0e0f0c] flex items-center justify-center shadow border-2 border-white"
            >
              <Camera size={14} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
          </div>

          {/* Role badge — read only */}
          <div className={`mt-3 px-3 py-1 rounded-full text-[12px] font-bold ${ROLE_COLOR[authUser.role] || ROLE_COLOR.viewer}`}>
            {ROLE_KEY[authUser.role] ? t(ROLE_KEY[authUser.role]) : authUser.role}
            {authUser.via === 'telegram' && <span className="ml-1.5 text-[10px] font-bold text-[#2AABEE]">· Telegram</span>}
          </div>
        </div>

        {/* ── Personal Info — full name + phone ── */}
        <div className="bg-white rounded-2xl border border-[#d1d3cf] px-4 py-4 space-y-3">
          <SectionLabel>{t('profile.personalInfo')}</SectionLabel>

          <Field
            label={t('profile.fullName')}
            value={name}
            onChange={setName}
            placeholder={t('profile.fullNamePh')}
          />
          <Field
            label={t('profile.username')}
            value={username}
            onChange={setUsername}
            placeholder={t('profile.usernamePh')}
          />
          <Field
            label={t('profile.phone')}
            value={phone}
            onChange={setPhone}
            placeholder={t('profile.phonePh')}
            type="tel"
          />

          {profileError && (
            <div className="bg-[#fdecea] rounded-xl px-3 py-2 text-[12px] font-semibold text-[#c13515]">{profileError}</div>
          )}

          <button
            onClick={handleSaveProfile}
            disabled={!name.trim()}
            className="w-full py-3 rounded-xl bg-[#9fe870] text-[#0e0f0c] text-[14px] font-semibold active:opacity-80 disabled:opacity-40 transition-opacity mt-1"
          >
            {t('profile.saveProfile')}
          </button>
        </div>

        {/* ── Account Setting — password change ── */}
        <div className="bg-white rounded-2xl border border-[#d1d3cf] px-4 py-4 space-y-3">
          <SectionLabel>{t('profile.accountSetting')}</SectionLabel>

          {!isTelegram && (
            <>
              <PasswordField
                label={t('profile.currentPassword')}
                value={currentPwd}
                onChange={v => { setCurrentPwd(v); setPwdErrors(p => ({ ...p, current: '' })) }}
                placeholder={t('profile.currentPasswordPh')}
                error={pwdErrors.current}
              />
              <PasswordField
                label={t('profile.newPassword')}
                value={newPwd}
                onChange={v => { setNewPwd(v); setPwdErrors(p => ({ ...p, new: '' })) }}
                placeholder={t('profile.newPasswordPh')}
                error={pwdErrors.new}
              />
              <PasswordField
                label={t('profile.confirmPassword')}
                value={confirmPwd}
                onChange={v => { setConfirmPwd(v); setPwdErrors(p => ({ ...p, confirm: '' })) }}
                placeholder={t('profile.confirmPasswordPh')}
                error={pwdErrors.confirm}
              />

              <button
                onClick={handleChangePassword}
                className="w-full py-3 rounded-xl bg-[#0e0f0c] text-white text-[14px] font-semibold active:opacity-80 transition-opacity mt-1"
              >
                {t('profile.updatePassword')}
              </button>
            </>
          )}

          {isTelegram && (
            <p className="text-[11px] text-[#454745] -mt-1">{t('profile.tgNoPwd')}</p>
          )}
        </div>

      </div>
    </div>
  )
}
