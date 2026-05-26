import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import SearchBar from '../components/ui/SearchBar'
import { Wallet, ChevronRight, SlidersHorizontal, X, Banknote, QrCode, Landmark, RefreshCw } from 'lucide-react'
import { useT } from '../lib/i18n'
import { formatFullDate } from '../lib/date'

const METHOD_TABS = [
  { key: 'all',         labelKey: 'payments.tabs.all'  },
  { key: 'Cash',        labelKey: 'payments.tabs.cash' },
  { key: 'QR Transfer', labelKey: 'payments.tabs.qr'   },
  { key: 'Bank',        labelKey: 'payments.tabs.bank' },
]

function methodIcon(method) {
  if (method === 'Cash') return <Banknote size={14} />
  if (method === 'QR Transfer') return <QrCode size={14} />
  return null
}

function fmtMoney(n) { return `$${(n ?? 0).toFixed(2)}` }
function fmtBankMoney(p) {
  const amount = p.amount || 0
  if (p.currency === 'USD') return `$${amount.toFixed(2)}`
  if (p.currency === 'KHR') return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount)} KHR`
  return `${amount.toFixed(2)} ${p.currency}`
}
function fmtDate(s) {
  return formatFullDate(s)
}

function renderInvoiceRow(inv, t, navigate, fmtDateFn) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-[#e8ebe6] transition-colors"
      onClick={() => navigate(`/invoice/${inv.id}?from=${encodeURIComponent('/payments')}`)}
    >
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-bold text-[#0e0f0c] truncate">
          {inv.tenantSnapshot?.name || '—'}
        </div>
        <div className="text-[11px] text-[#454745] mt-0.5 truncate">
          {inv.roomSnapshot?.name} · {inv.invoiceNumber || inv.id}
        </div>
        <div className="text-[11px] text-[#454745] mt-0.5">{t('payments.paid')} {fmtDateFn(inv.paidAt)}</div>
      </div>
      <div className="flex items-center gap-2 ml-3 flex-shrink-0">
        <div className="text-right">
          <div className="text-[14px] font-bold text-[#0e0f0c]">{fmtMoney(inv.total)}</div>
          {inv.paymentMethod && (
            <div className="mt-0.5 inline-flex">
              <Badge variant="grey">
                <span className="inline-flex items-center gap-1">
                  {methodIcon(inv.paymentMethod)}
                  {inv.paymentMethod}
                </span>
              </Badge>
            </div>
          )}
        </div>
        <ChevronRight size={16} className="text-[#868685]" />
      </div>
    </div>
  )
}

function renderBankRow(p, t, fmtDateFn) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-bold text-[#0e0f0c] truncate">
          {p.senderName || '—'}
        </div>
        <div className="text-[11px] text-[#454745] mt-0.5 truncate font-mono">
          {p.bank}{p.senderAccount ? ` · *${p.senderAccount}` : ''} · {p.transactionId}
        </div>
        <div className="text-[11px] text-[#454745] mt-0.5">
          {t('payments.paid')} {fmtDateFn(p.paidAt)}
        </div>
      </div>
      <div className="flex items-center gap-2 ml-3 flex-shrink-0">
        <div className="text-right">
          <div className="text-[14px] font-bold text-[#0e0f0c]">
            {fmtBankMoney(p)}
          </div>
          <div className="mt-0.5 inline-flex">
            <Badge variant="grey">
              <span className="inline-flex items-center gap-1">
                <Landmark size={12} /> {p.bank}
              </span>
            </Badge>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Payments() {
  const navigate = useNavigate()
  const t = useT()
  const { getAllInvoices, loadAllInvoices, bankPayments, loadBankPayments } = useStore()

  useEffect(() => {
    loadAllInvoices()
    loadBankPayments()
  }, []) // eslint-disable-line

  const [activeTab,  setActiveTab]  = useState('all')
  const [search,     setSearch]     = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [dateFrom,   setDateFrom]   = useState('')
  const [dateTo,     setDateTo]     = useState('')

  const [refreshing, setRefreshing] = useState(false)
  async function refreshAll() {
    if (refreshing) return
    setRefreshing(true)
    try { await Promise.all([loadAllInvoices(), loadBankPayments()]) }
    finally { setRefreshing(false) }
  }

  const allInvoices = getAllInvoices()
  const paid = useMemo(() => allInvoices.filter(inv => inv.status === 'paid'), [allInvoices])

  const matchesSearch = (inv, q) => {
    if (!q) return true
    const needle = q.toLowerCase()
    const tenant = inv.tenantSnapshot?.name || ''
    const room   = inv.roomSnapshot?.name   || ''
    const num    = inv.invoiceNumber || inv.id || ''
    return tenant.toLowerCase().includes(needle)
        || room.toLowerCase().includes(needle)
        || String(num).toLowerCase().includes(needle)
  }

  const filteredPaid = useMemo(() => {
    let list = paid
    if (activeTab !== 'all') list = list.filter(inv => inv.paymentMethod === activeTab)
    if (dateFrom) list = list.filter(inv => inv.paidAt && inv.paidAt.slice(0, 10) >= dateFrom)
    if (dateTo)   list = list.filter(inv => inv.paidAt && inv.paidAt.slice(0, 10) <= dateTo)
    if (search)   list = list.filter(inv => matchesSearch(inv, search))
    return list.sort((a, b) => new Date(b.paidAt || 0) - new Date(a.paidAt || 0))
  }, [paid, activeTab, dateFrom, dateTo, search])


  const filteredBank = useMemo(() => {
    let list = bankPayments || []
    if (dateFrom) list = list.filter(p => p.paidAt && p.paidAt.slice(0, 10) >= dateFrom)
    if (dateTo)   list = list.filter(p => p.paidAt && p.paidAt.slice(0, 10) <= dateTo)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        (p.senderName || '').toLowerCase().includes(q) ||
        (p.transactionId || '').includes(q) ||
        (p.bank || '').toLowerCase().includes(q),
      )
    }
    return list
  }, [bankPayments, dateFrom, dateTo, search])

  // For the "All" tab — paid invoices + bank-confirmation rows interleaved
  // chronologically by paidAt. Each item is tagged with a kind so the
  // renderer can pick the right row layout.
  const allItems = useMemo(() => {
    if (activeTab !== 'all') return []
    const invoiceItems = filteredPaid.map(inv => ({ kind: 'invoice', date: inv.paidAt, data: inv }))
    // Filter bank payments by activeTab='all' uses the same date/search
    // already baked into filteredBank.
    const bankItems = filteredBank.map(p => ({ kind: 'bank', date: p.paidAt, data: p }))
    return [...invoiceItems, ...bankItems].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
  }, [activeTab, filteredPaid, filteredBank])

  const counts = useMemo(() => {
    let base = paid
    if (dateFrom) base = base.filter(inv => inv.paidAt && inv.paidAt.slice(0, 10) >= dateFrom)
    if (dateTo)   base = base.filter(inv => inv.paidAt && inv.paidAt.slice(0, 10) <= dateTo)
    if (search)   base = base.filter(inv => matchesSearch(inv, search))
    return {
      all:  base.length + filteredBank.length,
      Cash: base.filter(i => i.paymentMethod === 'Cash').length,
      'QR Transfer': base.filter(i => i.paymentMethod === 'QR Transfer').length,
      Bank: filteredBank.length,
    }
  }, [paid, dateFrom, dateTo, search, filteredBank])

  // Total summed in USD. Invoice totals are always USD; bank-payment
  // amounts may be USD or KHR — only USD bank rows contribute to keep
  // the total comparable.
  const filteredTotal = useMemo(() => {
    if (activeTab === 'Bank') return 0
    const invoiceSum = filteredPaid.reduce((sum, inv) => sum + (inv.total || 0), 0)
    if (activeTab !== 'all') return invoiceSum
    const bankUsdSum = filteredBank
      .filter(p => p.currency === 'USD')
      .reduce((sum, p) => sum + (p.amount || 0), 0)
    return invoiceSum + bankUsdSum
  }, [activeTab, filteredPaid, filteredBank])

  const hasDateFilter = dateFrom || dateTo
  function clearDates() { setDateFrom(''); setDateTo('') }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header chrome — fixed at top of page area, no scroll. */}
      <div className="flex-shrink-0 bg-white">
        <div className="px-4 pt-2 pb-1 text-center md:text-left">
          <h1 className="text-[22px] font-bold text-[#0e0f0c]">{t('payments.title')}</h1>
        </div>

        <div className="px-4 pb-3">
          <SearchBar
            placeholder={t('payments.searchPlaceholder')}
            value={search}
            onChange={setSearch}
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

        {/* Filter sheet */}
        {filterOpen && (
          <div className="px-4 md:px-6 pb-3 border-b border-[#d1d3cf]">
            <div className="bg-[#e8ebe6] rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] font-bold text-[#454745] uppercase tracking-wide">{t('payments.filterByPaidDate')}</span>
                {hasDateFilter && (
                  <button onClick={clearDates} className="flex items-center gap-1 text-[11px] font-semibold text-[#0e0f0c]">
                    <X size={11} /> {t('common.clear')}
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-[#454745] mb-1 block">{t('common.from')}</label>
                  <input
                    type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border-[1.5px] border-[#d1d3cf] text-[12px] bg-white outline-none focus:border-[#0e0f0c]"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-[#454745] mb-1 block">{t('common.to')}</label>
                  <input
                    type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border-[1.5px] border-[#d1d3cf] text-[12px] bg-white outline-none focus:border-[#0e0f0c]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Method tabs — refresh button anchored on the right side. */}
        <div className="flex items-center border-b border-[#d1d3cf] px-4 md:px-6">
          <div className="flex flex-1 min-w-0 overflow-x-auto scrollbar-hide">
            {METHOD_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 px-3 py-2.5 text-[12px] font-bold border-b-2 -mb-px transition-colors ${
                  activeTab === tab.key ? 'text-[#0e0f0c] border-[#0e0f0c]' : 'text-[#454745] border-transparent'
                }`}
              >
                {t(tab.labelKey)}
                <span className={`ml-1.5 text-[11px] ${activeTab === tab.key ? 'text-[#0e0f0c]' : 'text-[#868685]'}`}>
                  {counts[tab.key] ?? 0}
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={refreshAll}
            disabled={refreshing}
            aria-label={t('common.refresh')}
            className="ml-2 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[#454745] hover:bg-[#e8ebe6] active:bg-[#dde0db] disabled:opacity-60 transition-colors"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Scroll region — only this scrolls. */}
      <div className="flex-1 min-h-0 tab-list-scroll scrollbar-hide">
        <div className="tab-list-scroll-content md:px-6">
          {(() => {
            const displayCount = activeTab === 'all'
              ? allItems.length
              : activeTab === 'Bank'
                ? filteredBank.length
                : filteredPaid.length
            if (displayCount === 0) return null
            return (
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[11px] font-semibold text-[#454745] uppercase tracking-wide">
                  {displayCount}{' '}
                  {t(displayCount === 1 ? 'payments.stat.payment' : 'payments.stat.payments')}
                </span>
                {activeTab !== 'Bank' && (
                  <span className="text-[12px] font-bold text-[#0e0f0c]">{fmtMoney(filteredTotal)}</span>
                )}
              </div>
            )
          })()}

          {activeTab === 'all' ? (
            allItems.length === 0 ? (
              <EmptyState
                icon={<Wallet size={36} strokeWidth={1.5} />}
                title={t('payments.empty.title')}
                subtitle={hasDateFilter || search ? t('payments.empty.subFiltered') : t('payments.empty.subDefault')}
              />
            ) : (
              <Card padding={false}>
                {allItems.map((item, i) => (
                  <div key={`${item.kind}-${item.data.id}`}>
                    {item.kind === 'invoice'
                      ? renderInvoiceRow(item.data, t, navigate, fmtDate)
                      : renderBankRow(item.data, t, fmtDate)}
                    {i < allItems.length - 1 && <div className="h-px bg-[#d1d3cf] mx-4" />}
                  </div>
                ))}
              </Card>
            )
          ) : activeTab === 'Bank' ? (
            filteredBank.length === 0 ? (
              <EmptyState
                icon={<Landmark size={36} strokeWidth={1.5} />}
                title={t('payments.bankEmpty.title')}
                subtitle={hasDateFilter || search ? t('payments.empty.subFiltered') : t('payments.bankEmpty.sub')}
              />
            ) : (
              <Card padding={false}>
                {filteredBank.map((p, i) => (
                  <div key={p.id}>
                    {renderBankRow(p, t, fmtDate)}
                    {i < filteredBank.length - 1 && <div className="h-px bg-[#d1d3cf] mx-4" />}
                  </div>
                ))}
              </Card>
            )
          ) : filteredPaid.length === 0 ? (
            <EmptyState
              icon={<Wallet size={36} strokeWidth={1.5} />}
              title={t('payments.empty.title')}
              subtitle={hasDateFilter || activeTab !== 'all' ? t('payments.empty.subFiltered') : t('payments.empty.subDefault')}
            />
          ) : (
            <Card padding={false}>
              {filteredPaid.map((inv, i) => (
                <div key={inv.id}>
                  {renderInvoiceRow(inv, t, navigate, fmtDate)}
                  {i < filteredPaid.length - 1 && <div className="h-px bg-[#d1d3cf] mx-4" />}
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
