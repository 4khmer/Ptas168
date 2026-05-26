import { NavLink, useLocation } from 'react-router-dom'
import { Home, Receipt, Wallet, BarChart3, MoreHorizontal } from 'lucide-react'
import { useT } from '../../lib/i18n'

const PRIMARY = [
  { to: '/',         labelKey: 'nav.rooms',    Icon: Home,           match: '/' },
  { to: '/billing',  labelKey: 'nav.billing',  Icon: Receipt,        match: '/billing' },
  { to: '/payments', labelKey: 'nav.payments', Icon: Wallet,         match: '/payments' },
  { to: '/report',   labelKey: 'nav.report',   Icon: BarChart3,      match: '/report' },
  { to: '/more',     labelKey: 'nav.more',     Icon: MoreHorizontal, match: '/more' },
]

// Tenants now lives under More, so /tenants and /tenant/:id light up "More"
// in the sidebar — same mental model as the mobile bottom-nav.
const MORE_PATHS = new Set([
  '/more',
  '/tenants',
  '/property',
  '/services',
  '/invoice-setup',
  '/sub-users',
  '/profile',
  '/terms',
])

function isActiveSection(currentPath, sectionPath) {
  if (sectionPath === '/') {
    return currentPath === '/' || currentPath.startsWith('/room/')
  }
  if (sectionPath === '/billing') {
    return currentPath === '/billing' || currentPath.startsWith('/invoice/')
  }
  if (sectionPath === '/payments') {
    return currentPath === '/payments'
  }
  if (sectionPath === '/report') {
    return currentPath === '/report' || currentPath.startsWith('/report/')
  }
  if (sectionPath === '/more') {
    return MORE_PATHS.has(currentPath) || currentPath.startsWith('/tenant/')
  }
  return false
}

export default function Sidebar() {
  const { pathname } = useLocation()
  const t = useT()

  return (
    <aside className="app-sidebar">
      <div className="px-5 py-5">
        <div className="text-[18px] font-bold text-[#0e0f0c] tracking-tight2">PBMS</div>
        <div className="text-[12px] text-[#454745] mt-0.5">Property Management</div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 scrollbar-hide">
        <div className="px-3 space-y-0.5">
          {PRIMARY.map(({ to, labelKey, Icon, match }) => {
            const active = isActiveSection(pathname, match)
            return (
              <NavLink
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-8 text-[14px] transition-colors ${
                  active
                    ? 'bg-[#e8ebe6] text-[#0e0f0c] font-semibold'
                    : 'text-[#0e0f0c] font-medium hover:bg-[#e8ebe6]'
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                <span>{t(labelKey)}</span>
                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#9fe870]" />}
              </NavLink>
            )
          })}
        </div>
      </nav>
    </aside>
  )
}
