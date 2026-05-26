import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import Badge, { invoiceStatusVariant } from '../components/ui/Badge'
import Card from '../components/ui/Card'
import SearchBar from '../components/ui/SearchBar'
import { ChevronRight, SlidersHorizontal, X } from 'lucide-react'
import { useT, invoiceStatusLabelKey } from '../lib/i18n'
import { formatFullDate, formatShortDate } from '../lib/date'

const STATUS_TABS = [
  { key: 'all',       labelKey: 'billing.tabs.all'        },
  { key: 'progress',  labelKey: 'billing.tabs.progress'   },
  { key: 'paid',      labelKey: 'billing.tabs.paid'       },
  { key: 'overdue',   labelKey: 'billing.tabs.overdue'    },
  { key: 'cancelled', labelKey: 'billing.tabs.cancelled'  },
]

const SEARCH_DEBOUNCE_MS = 300

export default function Billing() {
  const navigate = useNavigate()
  const t = useT()
  const { pagedInvoices, loadInvoicesPage, loadInvoiceCounts, resetPagedInvoices } = useStore()

  const [activeTab,   setActiveTab]   = useState('all')
  const [searchInput, setSearchInput] = useState('')      // raw textbox value
  const [search,      setSearch]      = useState('')      // debounced; what we send to server
  const [filterOpen,  setFilterOpen]  = useState(false)
  const [dateFrom,    setDateFrom]    = useState('')
  const [dateTo,      setDateTo]      = useState('')

  // Debounce search input → server query
  useEffect(() => {
    const handle = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [searchInput])

  // First page + counts whenever filter signature changes
  useEffect(() => {
    loadInvoicesPage({ q: search, status: activeTab === 'all' ? undefined : activeTab, from: dateFrom, to: dateTo })
    loadInvoiceCounts({ q: search, from: dateFrom, to: dateTo })
  }, [search, activeTab, dateFrom, dateTo]) // eslint-disable-line

  // Wipe paged state on unmount so reopening the tab starts fresh
  useEffect(() => () => resetPagedInvoices(), []) // eslint-disable-line

  const { items, hasMore, byStatus, loading } = pagedInvoices

  // IntersectionObserver sentinel — fires when bottom comes into view
  const sentinelRef = useRef(null)
  useEffect(() => {
    if (!sentinelRef.current) return
    const el = sentinelRef.current
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        loadInvoicesPage({ q: search, status: activeTab === 'all' ? undefined : activeTab, from: dateFrom, to: dateTo })
      }
    }, { rootMargin: '160px' })
    io.observe(el)
    return () => io.disconnect()
  }, [hasMore, loading, search, activeTab, dateFrom, dateTo, loadInvoicesPage])

  const hasDateFilter = dateFrom || dateTo
  function clearDates() { setDateFrom(''); setDateTo('') }

  const fmtPeriod = inv => formatShortDate(inv.periodStart)
  const fmtDue    = inv => formatFullDate(inv.dueDate)
  const fmtDate   = str => formatFullDate(str)

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 bg-white">
        <div className="px-4 pt-2 pb-1 text-center md:text-left">
          <h1 className="text-[22px] font-bold text-[#0e0f0c]">{t('billing.title')}</h1>
        </div>

        <div className="px-4 pb-3">
          <SearchBar
            placeholder={t('billing.searchPlaceholder')}
            value={searchInput}
            onChange={setSearchInput}
            rightSlot={
              <button
                type="button"
                onClick={() => setFilterOpen(v => !v)}
                aria-label={t('common.filter')}
                className={`relative w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                  hasDateFilter
                    ? 'bg-[#9fe870] text-[#0e0f0c]'
                    : 'bg-[#e8ebe6] hover:bg-[#dde0db] text-[#0e0f0c]'
                }`}
              >
                <SlidersHorizontal size={15} />
                {hasDateFilter && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-white text-[#0e0f0c] rounded-full text-[8px] font-bold flex items-center justify-center border border-[#9fe870]">1</span>
                )}
              </button>
            }
          />
        </div>

        {filterOpen && (
          <div className="px-4 pb-3 border-b border-[#d1d3cf]">
            <div className="bg-[#e8ebe6] rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] font-bold text-[#454745] uppercase tracking-wide">{t('billing.filterByPeriod')}</span>
                {hasDateFilter && (
                  <button onClick={clearDates} className="flex items-center gap-1 text-[11px] font-semibold text-[#0e0f0c]">
                    <X size={11} /> {t('common.clear')}
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-[#454745] mb-1 block">{t('common.from')}</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border-[1.5px] border-[#d1d3cf] text-[12px] bg-white outline-none focus:border-[#9fe870]" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-[#454745] mb-1 block">{t('common.to')}</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border-[1.5px] border-[#d1d3cf] text-[12px] bg-white outline-none focus:border-[#9fe870]" />
                </div>
              </div>
              {hasDateFilter && (
                <div className="text-[11px] text-[#454745]">
                  {t('billing.showing')}
                  {dateFrom && <> {t('common.from').toLowerCase()} <span className="font-semibold text-[#0e0f0c]">{fmtDate(dateFrom)}</span></>}
                  {dateTo   && <> {t('common.to').toLowerCase()} <span className="font-semibold text-[#0e0f0c]">{fmtDate(dateTo)}</span></>}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex border-b border-[#d1d3cf] px-4 overflow-x-auto scrollbar-hide">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 px-3 py-2.5 text-[12px] font-bold border-b-2 -mb-px transition-colors ${
                activeTab === tab.key ? 'text-[#0e0f0c] border-[#9fe870]' : 'text-[#454745] border-transparent'
              }`}
            >
              {t(tab.labelKey)}
              <span className={`ml-1.5 text-[11px] ${activeTab === tab.key ? 'text-[#0e0f0c]' : 'text-[#868685]'}`}>
                {byStatus[tab.key] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 tab-list-scroll scrollbar-hide">
        <div className="tab-list-scroll-content">
          {loading && items.length === 0 ? (
            <div className="text-center py-12 text-[14px] text-[#454745]">{t('common.loading')}</div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-[14px] text-[#454745]">{t('billing.notFound')}</div>
          ) : (
            <Card padding={false}>
              {items.map((inv, i) => (
                <div key={inv.id}>
                  <div
                    className="flex items-center justify-between px-4 py-3.5 cursor-pointer active:opacity-80"
                    onClick={() => navigate(`/invoice/${inv.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-bold text-[#0e0f0c]">
                        {inv.roomSnapshot?.name} — {fmtPeriod(inv)}
                      </div>
                      <div className="text-[11px] text-[#454745] mt-0.5">
                        {inv.tenantSnapshot?.name} · {t('billing.due')} {fmtDue(inv)}
                      </div>
                      <div className="text-[11px] text-[#454745]">{inv.invoiceNumber || inv.id}</div>
                    </div>
                    <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-[14px] font-bold text-[#0e0f0c]">${inv.total?.toFixed(2)}</div>
                        <Badge variant={invoiceStatusVariant(inv.status)}>{t(invoiceStatusLabelKey(inv.status) || 'status.progress')}</Badge>
                      </div>
                      <ChevronRight size={16} className="text-[#868685]" />
                    </div>
                  </div>
                  {i < items.length - 1 && <div className="h-px bg-[#d1d3cf] mx-4" />}
                </div>
              ))}
            </Card>
          )}

          {/* Sentinel — IntersectionObserver fires "load more" when this enters view */}
          {hasMore && (
            <div ref={sentinelRef} className="py-4 text-center text-[12px] text-[#454745]">
              {loading ? t('common.loading') : ''}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
