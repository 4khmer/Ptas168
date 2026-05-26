import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2, Settings, FileText, Languages, Users, LogOut, ChevronRight,
  ScrollText, UserCircle, Check, MessageSquare, Banknote,
} from 'lucide-react'
import { useStore } from '../store'
import { useT } from '../lib/i18n'

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'km', label: 'Khmer',   native: 'ភាសាខ្មែរ' },
]

const ROLE_KEY = {
  owner: 'more.role.owner',
  manager: 'more.role.manager',
  staff: 'more.role.staff',
  viewer: 'more.role.viewer',
}

// Uniform menu row — every icon tile uses the same neutral chrome
// (light-grey sage tile + body-grey glyph) so the eye scans the list
// for labels, not for colour. Per-row colour overrides are intentionally
// no-ops; the iconBg / iconColor props are kept on the signature so the
// callsites don't need to change, but the values are ignored.
function MenuRow({ icon: Icon, label, sub, right, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between bg-white px-4 py-3.5 active:bg-[#e8ebe6] text-left"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-[#e8ebe6] flex items-center justify-center flex-shrink-0">
          <Icon size={20} className="text-[#454745]" />
        </div>
        <div className="min-w-0">
          <div className="text-[14px] font-bold text-[#0e0f0c] truncate">{label}</div>
          {sub && <div className="text-[12px] text-[#454745] truncate">{sub}</div>}
        </div>
      </div>
      {right ?? <ChevronRight size={18} className="text-[#868685] flex-shrink-0" />}
    </button>
  )
}

function SectionHeader({ children }) {
  return (
    <div className="px-4 pt-4 pb-1.5">
      <span className="text-[11px] font-bold text-[#454745] uppercase tracking-wide">{children}</span>
    </div>
  )
}

function SectionCard({ children }) {
  return (
    <div className="mx-4 bg-white rounded-xl border border-[#d1d3cf] overflow-hidden divide-y divide-[#dde0db]">
      {children}
    </div>
  )
}

export default function More() {
  const navigate = useNavigate()
  const { language, setLanguage, authUser, logout } = useStore()
  const t = useT()
  const [langOpen, setLangOpen] = useState(false)

  const currentLang = LANGUAGES.find(l => l.code === language) ?? LANGUAGES[0]

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 bg-white px-4 pt-2 pb-3 border-b border-[#d1d3cf] text-center md:text-left">
        <h1 className="text-[22px] font-bold text-[#0e0f0c]">{t('more.title')}</h1>
      </div>

      <div className="flex-1 min-h-0 tab-list-scroll scrollbar-hide">
        <div className="tab-list-scroll-content tab-list-scroll-content--flush">

        {/* 1. Profile */}
        {authUser && (
          <div className="px-4 pt-4">
            <button
              onClick={() => navigate('/profile')}
              className="w-full bg-white rounded-xl border border-[#d1d3cf] px-4 py-3.5 flex items-center gap-3 active:bg-[#e8ebe6] text-left"
            >
              <div className="w-11 h-11 rounded-full bg-[#e8ebe6] flex items-center justify-center text-[#0e0f0c] font-bold text-[18px] flex-shrink-0 overflow-hidden">
                {authUser.profileImage
                  ? <img src={authUser.profileImage} alt="avatar" className="w-full h-full object-cover" />
                  : authUser.name?.[0]?.toUpperCase() || '?'
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-bold text-[#0e0f0c] truncate">{authUser.name}</div>
                <div className="text-[12px] text-[#454745] truncate">{t('profile.menuSub')}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] text-[#454745]">{ROLE_KEY[authUser.role] ? t(ROLE_KEY[authUser.role]) : authUser.role}</span>
                  {authUser.via === 'telegram' && (
                    <span className="text-[10px] font-bold text-[#2AABEE] bg-[#E8F6FF] px-1.5 py-0.5 rounded">Telegram</span>
                  )}
                </div>
              </div>
              <ChevronRight size={16} className="text-[#868685] flex-shrink-0" />
            </button>
          </div>
        )}

        {/* 2. Rental Settings */}
        <SectionHeader>{t('more.section.rental')}</SectionHeader>
        <SectionCard>
          <MenuRow
            icon={UserCircle}
            iconBg="bg-[#e8ebe6]"
            iconColor="text-[#0e0f0c]"
            label={t('more.menu.tenants.label')}
            sub={t('more.menu.tenants.sub')}
            onClick={() => navigate('/tenants')}
          />
          <MenuRow
            icon={Building2}
            iconBg="bg-[#e8ebe6]"
            iconColor="text-[#0e0f0c]"
            label={t('more.menu.property.label')}
            sub={t('more.menu.property.sub')}
            onClick={() => navigate('/property')}
          />
          <MenuRow
            icon={Settings}
            iconBg="bg-[#E8F6EF]"
            iconColor="text-[#1F6F4E]"
            label={t('more.menu.services.label')}
            sub={t('more.menu.services.sub')}
            onClick={() => navigate('/services')}
          />
          <MenuRow
            icon={FileText}
            iconBg="bg-[#e8ebe6]"
            iconColor="text-[#0e0f0c]"
            label={t('more.menu.invoice.label')}
            sub={t('more.menu.invoice.sub')}
            onClick={() => navigate('/invoice-setup')}
          />
          <MenuRow
            icon={MessageSquare}
            iconBg="bg-[#E8F6FF]"
            iconColor="text-[#2AABEE]"
            label={t('more.menu.telegram.label')}
            sub={t('more.menu.telegram.sub')}
            onClick={() => navigate('/telegram-bot')}
          />
        </SectionCard>

        {/* 3. App Settings */}
        <SectionHeader>{t('more.section.app')}</SectionHeader>
        <SectionCard>
          {/* Language — collapses into the same card style as the rest. */}
          <MenuRow
            icon={Languages}
            iconBg="bg-[#F3EEFF]"
            iconColor="text-[#6B3FA0]"
            label={t('more.lang.title')}
            sub={currentLang.native}
            onClick={() => setLangOpen(v => !v)}
          />
          {langOpen && (
            <div className="bg-[#f3f5f1] px-4 py-3 flex gap-2">
              {LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => { setLanguage(lang.code); setLangOpen(false) }}
                  className={`flex-1 py-2.5 rounded-xl border-[1.5px] text-center transition-colors flex items-center justify-center gap-1.5 ${
                    language === lang.code
                      ? 'border-[#9fe870] bg-white'
                      : 'border-[#d1d3cf] bg-white'
                  }`}
                >
                  {language === lang.code && <Check size={14} className="text-[#0e0f0c]" />}
                  <span className={`text-[13px] font-bold ${language === lang.code ? 'text-[#0e0f0c]' : 'text-[#0e0f0c]'}`}>
                    {lang.native}
                  </span>
                </button>
              ))}
            </div>
          )}
          <MenuRow
            icon={Users}
            iconBg="bg-[#F3EEFF]"
            iconColor="text-[#6B3FA0]"
            label={t('more.menu.subusers.label')}
            sub={t('more.menu.subusers.sub')}
            onClick={() => navigate('/sub-users')}
          />
          <MenuRow
            icon={Banknote}
            iconBg="bg-[#E8F6EF]"
            iconColor="text-[#1F6F4E]"
            label={t('more.menu.paymentNotif.label')}
            sub={t('more.menu.paymentNotif.sub')}
            onClick={() => navigate('/payment-notification')}
          />
          <MenuRow
            icon={ScrollText}
            iconBg="bg-[#e8ebe6]"
            iconColor="text-[#454745]"
            label={t('more.menu.terms.label')}
            sub={t('more.menu.terms.sub')}
            onClick={() => navigate('/terms')}
          />
        </SectionCard>

        {/* Visual gap before logout */}
        <div className="h-6" />

        {/* 4. Logout — destructive intent stays in the label colour;
            the icon tile follows the same neutral chrome as the rest so
            the row scans consistently with the menu above it. */}
        <div className="px-4">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 bg-white rounded-xl border border-[#d1d3cf] px-4 py-3.5 active:bg-[#e8ebe6] text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-[#e8ebe6] flex items-center justify-center flex-shrink-0">
              <LogOut size={20} className="text-[#454745]" />
            </div>
            <span className="text-[14px] font-bold text-[#d03238]">{t('more.logout')}</span>
          </button>
        </div>

        <div className="h-4" />
        </div>
      </div>
    </div>
  )
}
