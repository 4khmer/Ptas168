import { NavLink } from 'react-router-dom'
import { Home, Receipt, Wallet, BarChart3, MoreHorizontal } from 'lucide-react'
import { useT } from '../../lib/i18n'

const NAV_ITEMS = [
  { to: '/',         labelKey: 'nav.rooms',    Icon: Home           },
  { to: '/billing',  labelKey: 'nav.billing',  Icon: Receipt        },
  { to: '/payments', labelKey: 'nav.payments', Icon: Wallet         },
  { to: '/report',   labelKey: 'nav.report',   Icon: BarChart3      },
  { to: '/more',     labelKey: 'nav.more',     Icon: MoreHorizontal },
]

export default function BottomNav() {
  const t = useT()
  return (
    <nav className="bottom-nav">
      <div className="flex justify-around items-center h-14">
        {NAV_ITEMS.map(({ to, labelKey, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-1.5 cursor-pointer transition-colors ${isActive ? 'text-[#0e0f0c]' : 'text-[#454745]'}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-[10px] ${isActive ? 'font-semibold' : 'font-medium'}`}>{t(labelKey)}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
