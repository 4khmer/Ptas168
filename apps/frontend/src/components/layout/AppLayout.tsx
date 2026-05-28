import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import BottomNav from './BottomNav'
import Sidebar from './Sidebar'
import { tg, showBackButton, hideBackButton } from '../../lib/telegram'

const TAB_PATHS = ['/', '/billing', '/payments', '/report', '/more']

export default function AppLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const isTabRoute = TAB_PATHS.includes(pathname)

  // Telegram BackButton — appears on detail/form routes, routes through
  // React Router so users see in-app navigation instead of "Close".
  useEffect(() => {
    if (!tg) return
    if (isTabRoute) {
      hideBackButton()
      return
    }
    return showBackButton(() => navigate(-1))
  }, [pathname, isTabRoute, navigate])

  return (
    <>
      <Sidebar />
      <div className="web-content flex-1 flex flex-col min-h-0">
        {isTabRoute ? (
          <div className="page-content page-content--internal scrollbar-hide nav-fade">
            <Outlet />
          </div>
        ) : (
          <Outlet />
        )}
        {isTabRoute && <BottomNav />}
      </div>
    </>
  )
}
