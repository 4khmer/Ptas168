import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store'
import { persistLanguage } from './lib/i18n'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/Login'
import Rooms from './pages/Rooms'
import RoomDetail from './pages/RoomDetail'
import Tenants from './pages/Tenants'
import TenantDetail from './pages/TenantDetail'
import Billing from './pages/Billing'
import Payments from './pages/Payments'
import InvoiceDetail from './pages/InvoiceDetail'
import Report from './pages/Report'
import ReportUtility from './pages/ReportUtility'
import More from './pages/More'
import Property from './pages/Property'
import ServiceFees from './pages/ServiceFees'
import InvoiceSetup from './pages/InvoiceSetup'
import SubUsers from './pages/SubUsers'
import Profile from './pages/Profile'
import TermsAndConditions from './pages/TermsAndConditions'
import TelegramBot from './pages/TelegramBot'
import PaymentNotification from './pages/PaymentNotification'

export default function App() {
  const isLoggedIn = useStore(s => s.isLoggedIn)
  const language = useStore(s => s.language)
  const bootstrapSession = useStore(s => s.bootstrapSession)
  useEffect(() => { persistLanguage(language) }, [language])

  // After reload, the JWT survives but authUser is null until we call /auth/me.
  // Without this, the profile menu in More tab stays hidden.
  useEffect(() => { if (isLoggedIn) bootstrapSession() }, [isLoggedIn, bootstrapSession])

  if (!isLoggedIn) {
    return (
      <div className="app-shell auth-shell">
        <Login />
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Rooms />} />
          <Route path="/tenants" element={<Tenants />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/report" element={<Report />} />
          <Route path="/report/utility" element={<ReportUtility />} />
          <Route path="/more" element={<More />} />
          <Route path="/room/:id" element={<RoomDetail />} />
          <Route path="/tenant/:id" element={<TenantDetail />} />
          <Route path="/invoice/:id" element={<InvoiceDetail />} />
          <Route path="/property" element={<Property />} />
          <Route path="/services" element={<ServiceFees />} />
          <Route path="/invoice-setup" element={<InvoiceSetup />} />
          <Route path="/sub-users" element={<SubUsers />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/terms" element={<TermsAndConditions />} />
          <Route path="/telegram-bot" element={<TelegramBot />} />
          <Route path="/payment-notification" element={<PaymentNotification />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
