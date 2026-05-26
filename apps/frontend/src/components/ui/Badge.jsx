/**
 * Badge / status pill — invoice-status colours are pinned to the
 * four-state palette (blue / green / red / grey) and intentionally do
 * NOT use the Wise brand lime (lime is reserved for primary CTAs).
 *
 * variant: 'green' | 'amber' | 'red' | 'blue' | 'grey' | 'purple' | 'wise' | 'dark'
 */
export default function Badge({ variant = 'grey', children, className = '' }) {
  const styles = {
    green:  'bg-[#E8F6EF] text-[#1F6F4E]',
    amber:  'bg-[#FFF3DF] text-[#8A6408]',
    red:    'bg-[#fdecea] text-[#c13515]',
    blue:   'bg-[#eef4ff] text-[#428bff]',
    grey:   'bg-[#e8ebe6] text-[#454745]',
    purple: 'bg-[#f3edff] text-[#460479]',
    // "wise" — Wise brand-accent pill (lime fill, ink text). Only used
    // when something is intentionally tied to the brand identity.
    wise:   'bg-[#e2f6d5] text-[#163300]',
    dark:   'bg-[#0e0f0c] text-white',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap flex-shrink-0 ${styles[variant] || styles.grey} ${className}`}>
      {children}
    </span>
  )
}

/** Map invoice status → badge variant.
 *  Colour system:
 *    progress  → blue    (active / awaiting payment)
 *    paid      → green   (completed)
 *    overdue   → red     (urgent — needs attention)
 *    cancelled → grey    (inactive / archived) */
export function invoiceStatusVariant(status) {
  switch (status) {
    case 'paid':      return 'green'
    case 'progress':  return 'blue'
    case 'overdue':   return 'red'
    case 'cancelled': return 'grey'
    default:          return 'grey'
  }
}

/** Human-readable invoice status */
export function invoiceStatusLabel(status) {
  switch (status) {
    case 'paid':      return 'Paid'
    case 'progress':  return 'In Progress'
    case 'overdue':   return 'Overdue'
    case 'cancelled': return 'Cancelled'
    default:          return status
  }
}
