// Build breadcrumb segments from a route + the current store snapshot.
// Returns an array of { label, to? }. The last segment has no `to`.
//
// `search` is the URLSearchParams of the current page (or null). Some routes
// (notably /invoice/:id) inspect `?from=...` to re-root the breadcrumbs at the
// caller's surface — e.g. coming from Room Detail vs from the Billing menu.

import { formatShortDate } from '../../lib/date'

/** Build "Room 19 — 05 / 2026" — the same label mobile shows in PageHeader. */
function invoiceTitle(inv, fallbackTitle) {
  const room = inv?.roomSnapshot?.name
  if (room && inv?.periodStart) return `${room} — ${formatShortDate(inv.periodStart)}`
  return inv?.invoiceNumber || fallbackTitle || 'Invoice'
}

export function buildBreadcrumbs(pathname, store, fallbackTitle, search) {
  if (pathname === '/')         return [{ label: 'Rooms' }]
  if (pathname === '/tenants')  return [{ label: 'More', to: '/more' }, { label: 'Tenants' }]
  if (pathname === '/billing')  return [{ label: 'Billing' }]
  if (pathname === '/payments') return [{ label: 'Payments' }]
  if (pathname === '/report')   return [{ label: 'Report' }]
  if (pathname === '/more')     return [{ label: 'More' }]

  const tenantMatch = pathname.match(/^\/tenant\/(.+)/)
  if (tenantMatch) {
    const tenant = store.tenants.find(t => t.id === tenantMatch[1])
    return [
      { label: 'More', to: '/more' },
      { label: 'Tenants', to: '/tenants' },
      { label: tenant?.name || fallbackTitle || 'Tenant' },
    ]
  }

  const roomMatch = pathname.match(/^\/room\/(.+)/)
  if (roomMatch) {
    const room = store.rooms.find(r => r.id === roomMatch[1])
    return [
      { label: 'Rooms', to: '/' },
      { label: room?.name || fallbackTitle || 'Room' },
    ]
  }

  const invoiceMatch = pathname.match(/^\/invoice\/(.+)/)
  if (invoiceMatch) {
    // The Billing tab populates `pagedInvoices.items` separately from the
    // global `invoices` cache, so look in both before falling back.
    const invId = invoiceMatch[1]
    const inv =
      store.pagedInvoices?.items?.find(i => i.id === invId) ||
      store.invoices.find(i => i.id === invId)
    const invLabel = invoiceTitle(inv, fallbackTitle)

    // Use ?from=… (URL-encoded original href) to re-root breadcrumbs.
    const fromRaw = search?.get?.('from')
    if (fromRaw) {
      const from = safeDecode(fromRaw)

      // From Room Detail → Rooms › <room name> › Invoice
      const fromRoomId = from.match(/^\/room\/([^/?#]+)/)?.[1]
      if (fromRoomId) {
        const room = store.rooms?.find(r => r.id === fromRoomId)
        return [
          { label: 'Rooms',                 to: '/' },
          { label: room?.name || 'Room',    to: from },
          { label: invLabel },
        ]
      }

      // From Tenant Detail → Tenants › <tenant name> › Invoice
      const fromTenantId = from.match(/^\/tenant\/([^/?#]+)/)?.[1]
      if (fromTenantId) {
        const tenant = store.tenants?.find(t => t.id === fromTenantId)
        return [
          { label: 'Tenants',                  to: '/tenants' },
          { label: tenant?.name || 'Tenant',   to: from },
          { label: invLabel },
        ]
      }

      // From Payments → Payments › Invoice
      if (from.startsWith('/payments')) {
        return [
          { label: 'Payments', to: '/payments' },
          { label: invLabel },
        ]
      }
    }

    // Default — opened from the Billing menu (or unknown source)
    return [
      { label: 'Billing', to: '/billing' },
      { label: invLabel },
    ]
  }

  if (pathname === '/property')      return [{ label: 'More', to: '/more' }, { label: 'Property' }]
  if (pathname === '/services')      return [{ label: 'More', to: '/more' }, { label: 'Service Fees' }]
  if (pathname === '/invoice-setup') return [{ label: 'More', to: '/more' }, { label: 'Invoice Setup' }]
  if (pathname === '/sub-users')     return [{ label: 'More', to: '/more' }, { label: 'Sub-Users' }]
  if (pathname === '/profile')       return [{ label: 'More', to: '/more' }, { label: 'Profile' }]
  if (pathname === '/terms')         return [{ label: 'More', to: '/more' }, { label: 'Terms & Conditions' }]

  return [{ label: fallbackTitle || '' }]
}

function safeDecode(s) {
  try { return decodeURIComponent(s) } catch { return s }
}
