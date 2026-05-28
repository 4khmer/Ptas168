import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import SearchBar from '../components/ui/SearchBar'
import Card from '../components/ui/Card'
import PageHeader from '../components/layout/PageHeader'
import { ChevronRight, SlidersHorizontal, X } from 'lucide-react'
import { useT } from '../lib/i18n'
import { formatPhone } from '../lib/phone'

const STATUS_OPTIONS = [
  { key: 'all',      labelKey: 'common.all'         },
  { key: 'active',   labelKey: 'status.active'      },
  { key: 'inactive', labelKey: 'status.inactive'    },
]

export default function Tenants() {
  const navigate = useNavigate()
  const t = useT()
  const { tenants, loadTenants, loading } = useStore()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [filterOpen, setFilterOpen] = useState(false)

  const hasFilter = statusFilter !== 'all'
  function clearFilters() { setStatusFilter('all') }

  useEffect(() => { loadTenants() }, []) // eslint-disable-line

  const filtered = useMemo(() => {
    let list = tenants
    if (statusFilter !== 'all') list = list.filter(t => (t.status || 'active') === statusFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(t => t.name.toLowerCase().includes(q) || t.phone.includes(q))
    }
    return list
  }, [tenants, statusFilter, search])

  const avatarColors = [
    'bg-[#e8ebe6] text-[#0e0f0c]',
    'bg-[#f3edff] text-[#460479]',
    'bg-[#E8F6EF] text-[#1F6F4E]',
    'bg-[#e8ebe6] text-[#0e0f0c]',
  ]

  const isLoading = loading.tenants

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden">
      {/* Title row — PageHeader gives us back-arrow + title on mobile and
          breadcrumbs ("More › Tenants") on web, matching Property /
          Service Fees / Invoice Setup which are also reached from More. */}
      <PageHeader title={t('tenants.title')} />

      {/* Search + filter chrome — sits below the header, doesn't scroll. */}
      <div className="flex-shrink-0 bg-white">
        <div className="px-4 pt-3 pb-3">
          <SearchBar
            placeholder={t('tenants.searchPlaceholder')}
            value={search}
            onChange={setSearch}
            rightSlot={
              <button
                type="button"
                onClick={() => setFilterOpen(v => !v)}
                aria-label={t('common.filter')}
                className={`relative w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                  hasFilter
                    ? 'bg-[#9fe870] text-[#0e0f0c]'
                    : 'bg-[#e8ebe6] hover:bg-[#dde0db] text-[#0e0f0c]'
                }`}
              >
                <SlidersHorizontal size={15} />
                {hasFilter && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-white text-[#0e0f0c] rounded-full text-[8px] font-bold flex items-center justify-center border border-[#9fe870]">1</span>
                )}
              </button>
            }
          />
        </div>

        {filterOpen && (
          <div className="px-4 pb-3 border-b border-[#d1d3cf]">
            <div className="bg-[#e8ebe6] rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#454745] uppercase tracking-wide">{t('tenants.filterByStatus')}</span>
                {hasFilter && (
                  <button onClick={clearFilters} className="flex items-center gap-1 text-[11px] font-semibold text-[#0e0f0c]">
                    <X size={11} /> {t('common.clear')}
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                {STATUS_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setStatusFilter(opt.key)}
                    className={`flex-1 py-2 rounded-lg border-[1.5px] text-[12px] font-semibold transition-colors ${
                      statusFilter === opt.key
                        ? 'border-[#9fe870] bg-white text-[#0e0f0c]'
                        : 'border-[#d1d3cf] bg-white text-[#454745]'
                    }`}
                  >
                    {t(opt.labelKey)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scroll region — only this scrolls. */}
      <div className="flex-1 min-h-0 tab-list-scroll scrollbar-hide">
        <div className="tab-list-scroll-content">
          {isLoading && tenants.length === 0 ? (
            <div className="text-center py-12 text-[14px] text-[#454745]">{t('common.loading')}</div>
          ) : (
            <Card padding={false}>
              {filtered.length === 0 ? (
                <div className="text-center py-8 text-[14px] text-[#454745]">{t('tenants.notFound')}</div>
              ) : (
                filtered.map((tenant, i) => (
                  <div key={tenant.id}>
                    <div
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer active:opacity-80"
                      onClick={() => navigate(`/tenant/${tenant.id}`)}
                    >
                      <div className={`w-11 h-11 rounded-full overflow-hidden flex items-center justify-center font-bold text-[18px] flex-shrink-0 border border-[#d1d3cf] ${tenant.photo ? '' : avatarColors[i % avatarColors.length]}`}>
                        {tenant.photo
                          ? <img src={tenant.photo} alt="avatar" className="w-full h-full object-cover" />
                          : tenant.name[0]
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-bold text-[#0e0f0c] truncate">{tenant.name}</div>
                        <div className="text-[12px] text-[#454745]">{formatPhone(tenant.phone)}</div>
                      </div>
                      <ChevronRight size={16} className="text-[#868685]" />
                    </div>
                    {i < filtered.length - 1 && <div className="h-px bg-[#d1d3cf] mx-4" />}
                  </div>
                ))
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
