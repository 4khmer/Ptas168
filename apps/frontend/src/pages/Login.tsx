import { useState, type FormEvent } from 'react'
import { useStore } from '../store'
import { useT } from '../lib/i18n'
import { Eye, EyeOff, Building2 } from 'lucide-react'

export default function Login() {
  const { loginWithCredentials } = useStore()
  const t = useT()

  const [phone,    setPhone]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleCredentials(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    if (!phone.trim())    { setError(t('login.errEnterPhone')); return }
    if (!password.trim()) { setError(t('login.errEnterPassword')); return }
    setLoading(true)
    const result = await loginWithCredentials(phone.trim(), password)
    setLoading(false)
    if (!result.success) setError(result.error || t('login.errLoginFailed'))
  }

  return (
    <div className="min-h-screen bg-[#e8ebe6] flex flex-col items-center justify-center px-5 py-10">

      {/* Logo / Brand */}
      <div className="flex flex-col items-center mb-10">
        <div className="w-20 h-20 rounded-3xl bg-[#9fe870] flex items-center justify-center shadow-lg mb-4">
          <Building2 size={38} className="text-white" strokeWidth={1.8} />
        </div>
        <h1 className="text-[26px] font-bold text-[#0e0f0c] tracking-tight">PBMS</h1>
        <p className="text-[13px] text-[#454745] mt-1">{t('login.brandSub')}</p>
      </div>

      <div className="w-full max-w-sm space-y-3">

        {/* Credentials form */}
        <form onSubmit={handleCredentials} className="space-y-3">
          <div>
            <label className="text-[12px] font-semibold text-[#454745] mb-1.5 block">{t('login.usernameLabel')}</label>
            <input
              type="text"
              value={phone}
              onChange={e => { setPhone(e.target.value); setError('') }}
              placeholder={t('login.usernamePlaceholder')}
              autoComplete="username"
              className="w-full px-4 py-3 rounded-xl border-[1.5px] border-[#d1d3cf] text-[14px] text-[#0e0f0c] outline-none bg-white focus:border-[#9fe870] transition-colors"
            />
          </div>

          <div>
            <label className="text-[12px] font-semibold text-[#454745] mb-1.5 block">{t('login.passwordLabel')}</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder={t('login.passwordPlaceholder')}
                autoComplete="current-password"
                className="w-full px-4 py-3 pr-12 rounded-xl border-[1.5px] border-[#d1d3cf] text-[14px] text-[#0e0f0c] outline-none bg-white focus:border-[#9fe870] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#868685]"
              >
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-[#fdecea] rounded-xl px-4 py-2.5 text-[12px] font-semibold text-[#c13515]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-[#9fe870] text-[#0e0f0c] text-[15px] font-semibold shadow-sm active:opacity-80 hover:bg-[#cdffad] disabled:opacity-60 transition-colors"
          >
            {loading ? t('common.signingIn') : t('common.signIn')}
          </button>
        </form>

        <div className="bg-white border border-[#d1d3cf] rounded-xl px-4 py-3 mt-2">
          <div className="text-[11px] font-bold text-[#454745] mb-1.5">{t('login.demoTitle')}</div>
          <div className="text-[11px] text-[#454745] space-y-0.5">
            <div>{t('login.demoUsername')} — <span className="font-mono font-semibold text-[#0e0f0c]">admin</span> / <span className="font-mono font-semibold text-[#0e0f0c]">admin123</span></div>
          </div>
        </div>

      </div>
    </div>
  )
}
