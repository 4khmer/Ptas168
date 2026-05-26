import PageHeader from '../components/layout/PageHeader'
import { useT } from '../lib/i18n'

const SECTION_KEYS = [
  ['terms.s1.title',  'terms.s1.body'],
  ['terms.s2.title',  'terms.s2.body'],
  ['terms.s3.title',  'terms.s3.body'],
  ['terms.s4.title',  'terms.s4.body'],
  ['terms.s5.title',  'terms.s5.body'],
  ['terms.s6.title',  'terms.s6.body'],
  ['terms.s7.title',  'terms.s7.body'],
  ['terms.s8.title',  'terms.s8.body'],
  ['terms.s9.title',  'terms.s9.body'],
  ['terms.s10.title', 'terms.s10.body'],
]

export default function TermsAndConditions() {
  const t = useT()
  return (
    <div className="app-shell">
      <PageHeader title={t('terms.title')} />

      <div className="page-content scrollbar-hide p-4 space-y-3" style={{ paddingBottom: '32px' }}>

        {/* Intro banner */}
        <div className="bg-[#e8ebe6] rounded-xl px-4 py-3">
          <div className="text-[12px] font-bold text-[#0e0f0c] mb-0.5">{t('terms.lastUpdated')}</div>
          <div className="text-[12px] text-[#0e0f0c]">
            {t('terms.intro')}
          </div>
        </div>

        {/* Sections */}
        {SECTION_KEYS.map(([titleKey, bodyKey]) => (
          <div key={titleKey} className="bg-white rounded-xl border border-[#d1d3cf] px-4 py-3.5">
            <div className="text-[13px] font-bold text-[#0e0f0c] mb-1.5">{t(titleKey)}</div>
            <p className="text-[12px] text-[#454745] leading-relaxed">{t(bodyKey)}</p>
          </div>
        ))}

      </div>
    </div>
  )
}
