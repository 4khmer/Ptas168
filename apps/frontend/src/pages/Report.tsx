import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Gauge, ChevronRight } from 'lucide-react'
import { useStore } from '../store'
import OutstandingBalanceCard from '../components/reports/OutstandingBalanceCard'
import MonthlyCollectionsCard from '../components/reports/MonthlyCollectionsCard'
import MonthlyUsageCard from '../components/reports/MonthlyUsageCard'
import { useT } from '../lib/i18n'

export default function Report() {
  const navigate = useNavigate()
  const t = useT()
  const loadAllInvoices = useStore(s => s.loadAllInvoices)

  // Charts read from the full invoices cache; ensure it's loaded.
  useEffect(() => { loadAllInvoices() }, []) // eslint-disable-line

  const MENU = [
    {
      icon: Gauge,
      iconBg: 'bg-[#E8F6EF]',
      iconColor: 'text-[#1F6F4E]',
      label: t('report.menu.utility.label'),
      sub: t('report.menu.utility.sub'),
      action: () => navigate('/report/utility'),
    },
  ]

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 bg-white px-4 pt-2 pb-3 border-b border-[#d1d3cf] text-center md:text-left">
        <h1 className="text-[22px] font-bold text-[#0e0f0c]">{t('report.title')}</h1>
      </div>

      <div className="flex-1 min-h-0 tab-list-scroll scrollbar-hide">
        <div className="tab-list-scroll-content space-y-3">
          {/* Report cards — single column on mobile (the 430px app
              shell), 2×2 grid from the md breakpoint up on web. Each
              card is self-contained so they can lay out side-by-side
              without the headline / chart legend overflowing. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <OutstandingBalanceCard title={t('report.outstanding.title')} />
            <MonthlyCollectionsCard  title={t('report.collections.title')} />
            <MonthlyUsageCard
              title={t('report.water.title')}
              dataKey="water"
              unit="m³"
              color="#3B82F6"
            />
            <MonthlyUsageCard
              title={t('report.electricity.title')}
              dataKey="electricity"
              unit="kWh"
              color="#F59E0B"
            />
          </div>

          {MENU.map(item => (
            <button
              key={item.label}
              onClick={item.action}
              className="w-full flex items-center justify-between bg-white rounded-xl border border-[#d1d3cf] px-4 py-3.5 active:bg-[#e8ebe6] text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl ${item.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <item.icon size={20} className={item.iconColor} />
                </div>
                <div className="min-w-0">
                  <div className="text-[14px] font-bold text-[#0e0f0c] truncate">{item.label}</div>
                  <div className="text-[12px] text-[#454745] truncate">{item.sub}</div>
                </div>
              </div>
              <ChevronRight size={18} className="text-[#868685] flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
