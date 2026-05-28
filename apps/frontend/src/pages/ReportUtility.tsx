import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Gauge } from 'lucide-react'
import EmptyState from '../components/ui/EmptyState'
import { useT } from '../lib/i18n'

export default function ReportUtility() {
  const navigate = useNavigate()
  const t = useT()

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 bg-white border-b border-[#d1d3cf]">
        <div className="relative flex items-center px-3 pt-2 pb-1 h-11">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label={t('common.back')}
            className="icon-btn flex-shrink-0"
          >
            <ChevronLeft size={18} className="text-[#0e0f0c]" />
          </button>
          <div className="absolute inset-x-0 flex items-center justify-center pointer-events-none px-14 md:static md:px-0 md:ml-3 md:justify-start">
            <h1 className="text-base font-semibold text-[#0e0f0c] leading-tight truncate tracking-tight2">
              {t('reportUtility.title')}
            </h1>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-hide">
        <div className="p-4">
          <EmptyState
            icon={<Gauge size={36} strokeWidth={1.5} />}
            title={t('reportUtility.empty.title')}
            subtitle={t('reportUtility.empty.sub')}
          />
        </div>
      </div>
    </div>
  )
}
