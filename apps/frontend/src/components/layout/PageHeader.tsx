import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { useStore } from '../../store'
import { buildBreadcrumbs } from './breadcrumbs'

interface PageHeaderProps {
  title?: ReactNode
  subtitle?: ReactNode
  /** Pass `false` to suppress the back button entirely, or a handler to override. */
  onBack?: false | (() => void)
  rightSlot?: ReactNode
  backTo?: string
}

/**
 * Page header
 * Mobile (<768px): circular back button + title + subtitle + rightSlot
 * Web (≥768px): breadcrumbs (auto-derived) + rightSlot
 */
export default function PageHeader({ title, subtitle, onBack, rightSlot, backTo }: PageHeaderProps = {}) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  const { tenants, rooms, invoices, pagedInvoices } = useStore()

  function handleBack() {
    if (typeof onBack === 'function') return onBack()
    if (backTo) return navigate(backTo)
    navigate(-1)
  }

  const crumbs = buildBreadcrumbs(
    pathname,
    { tenants, rooms, invoices, pagedInvoices },
    typeof title === 'string' ? title : undefined,
    searchParams,
  )

  return (
    <div className="bg-white border-b border-[#d1d3cf] flex-shrink-0">
      {/* Mobile header — back on the left, title centered, action on the right */}
      <div className="md:hidden relative flex items-center px-3 h-11">
        <div className="flex items-center flex-shrink-0">
          {(onBack !== false) && (
            <button
              onClick={handleBack}
              aria-label="Back"
              className="icon-btn"
            >
              <ChevronLeft size={18} className="text-[#0e0f0c]" />
            </button>
          )}
        </div>

        <div className="absolute inset-x-0 flex items-center justify-center pointer-events-none px-14">
          <div className="min-w-0 max-w-full text-center">
            <h1 className="text-base font-semibold text-[#0e0f0c] leading-tight truncate tracking-tight2">{title}</h1>
            {subtitle && (
              <div className="text-[11px] text-[#454745] truncate">{subtitle}</div>
            )}
          </div>
        </div>

        <div className="flex-1" />
        {rightSlot && (
          <div className="flex-shrink-0">{rightSlot}</div>
        )}
      </div>

      {/* Web header */}
      <div className="hidden md:flex items-center justify-between px-6 h-12">
        <nav aria-label="Breadcrumb" className="min-w-0">
          <ol className="flex items-center gap-1.5 text-sm">
            {crumbs.map((c, i) => {
              const isLast = i === crumbs.length - 1
              return (
                <li key={i} className="flex items-center gap-1.5 min-w-0">
                  {i > 0 && <ChevronRight size={14} className="text-[#868685] flex-shrink-0" />}
                  {c.to && !isLast ? (
                    <Link to={c.to} className="text-[#454745] hover:text-[#0e0f0c] underline-offset-2 hover:underline truncate transition-colors">
                      {c.label}
                    </Link>
                  ) : (
                    <span className={`truncate ${isLast ? 'text-[#0e0f0c] font-semibold' : 'text-[#454745]'}`}>
                      {c.label}
                    </span>
                  )}
                </li>
              )
            })}
          </ol>
          {subtitle && (
            <div className="text-xs text-[#454745] mt-0.5">{subtitle}</div>
          )}
        </nav>
        {rightSlot && (
          <div className="flex-shrink-0 ml-3">{rightSlot}</div>
        )}
      </div>
    </div>
  )
}
