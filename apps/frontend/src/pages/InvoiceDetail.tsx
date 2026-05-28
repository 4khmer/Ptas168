import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { invoicesApi } from '../sdk'
import PageHeader from '../components/layout/PageHeader'
import Button from '../components/ui/Button'
import InvoiceQR from '../components/ui/InvoiceQR'
import MarkPaidModal from '../components/modals/MarkPaidModal'
import CancelInvoiceModal from '../components/modals/CancelInvoiceModal'
import { formatUSD, formatKHR } from '../lib/billing'
import {
  CheckCircle2, Banknote, FileText, MessageSquare, Printer,
  Calendar, User, Home, Droplets, Zap,
  Sparkles, ShieldCheck, ArrowLeftRight, Hash, Receipt,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useT, invoiceStatusLabelKey } from '../lib/i18n'
import type { TFunction } from '../lib/i18n'
import { formatPhone } from '../lib/phone'
import { formatFullDate, formatShortDate } from '../lib/date'
import type { InvoiceUiDto } from '@ptas/sdk'

// ── Sub-components ────────────────────────────────────────────────────────────

// Hero amount card. The visual mood follows the invoice status so the
// payment state is felt before it's read:
//   progress  → blue    (active / awaiting payment)
//   paid      → green   (completed)
//   overdue   → red     (urgent — needs attention)
//   cancelled → grey    (inactive)
interface HeroCardProps {
  inv: InvoiceUiDto
  total: number
  rate: number
  isPaid: boolean
  isCancelled: boolean
  isOverdue: boolean
  fmtDate: (d: string) => string
  t: TFunction
  paymentMethod?: string | null
  paidAt?: string | null
  dueDate: string
  statusLabel: string
}
function HeroCard({ inv, total, rate, isPaid, isCancelled, isOverdue, fmtDate, t, paymentMethod, paidAt, dueDate, statusLabel }: HeroCardProps) {
  const palette = isPaid
    ? { ring: 'from-[#f0fdf4] to-[#e8f6ef]', border: 'border-[#cdebd7]', tag: 'text-[#1F6F4E]', accent: 'bg-[#1F6F4E]', meta: 'text-[#1F6F4E]' }
    : isCancelled
      ? { ring: 'from-[#f4f4f5] to-[#dde0db]', border: 'border-[#d1d3cf]', tag: 'text-[#454745]', accent: 'bg-[#454745]', meta: 'text-[#454745]' }
      : isOverdue
        ? { ring: 'from-[#fef2f2] to-[#fdecea]', border: 'border-[#f5c7c0]', tag: 'text-[#c13515]', accent: 'bg-[#c13515]', meta: 'text-[#c13515]' }
        // In-progress: soft sky-blue gradient — communicates "active /
        // pending" without the urgency of overdue red.
        : { ring: 'from-[#f0f6ff] to-[#e8efff]', border: 'border-[#cfdcff]', tag: 'text-[#1d63d0]', accent: 'bg-[#428bff]', meta: 'text-[#1d63d0]' }

  const Icon = isPaid ? CheckCircle2 : isCancelled ? FileText : Receipt
  const totalLabel = isPaid ? t('invoiceDetail.totalPaid') : isCancelled ? t('invoiceDetail.totalAmount') : t('invoiceDetail.totalDue')

  return (
    <div className={`rounded-3xl p-5 bg-gradient-to-br ${palette.ring} border ${palette.border} shadow-sm`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-[11px] font-bold uppercase tracking-wider ${palette.tag}`}>
            {statusLabel}
          </span>
        </div>
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white shadow-sm ${palette.accent}`}>
          <Icon size={18} strokeWidth={2.4} />
        </div>
      </div>

      <div className="text-[12px] text-[#454745] font-medium mb-1">{totalLabel}</div>
      <div className="text-[40px] font-extrabold text-[#0e0f0c] tracking-tight leading-none">
        {formatUSD(total)}
      </div>
      <div className="text-[12px] text-[#454745] mt-1">≈ {formatKHR(total, rate)}</div>

      <div className="mt-4 pt-4 border-t border-white/60 flex items-center gap-2 text-[12px] text-[#0e0f0c]">
        {isPaid ? (
          <>
            <CheckCircle2 size={14} className={palette.meta} />
            <span className="font-semibold">{t('invoiceDetail.paid')}</span>
            <span className="text-[#454745]">·</span>
            <span>{paidAt ? fmtDate(paidAt) : '—'}</span>
            {paymentMethod && (
              <>
                <span className="text-[#454745]">·</span>
                <span className="font-semibold">{paymentMethod}</span>
              </>
            )}
          </>
        ) : isCancelled ? (
          <>
            <FileText size={14} className={palette.meta} />
            <span>{t('invoiceDetail.cancelledOn')}</span>
            {inv.cancelledAt && (
              <>
                <span className="text-[#454745]">·</span>
                <span>{fmtDate(inv.cancelledAt)}</span>
              </>
            )}
          </>
        ) : (
          <>
            <Calendar size={14} className={palette.meta} />
            <span className="font-semibold">{t('invoiceDetail.due')}</span>
            <span className="text-[#454745]">·</span>
            <span>{fmtDate(dueDate)}</span>
          </>
        )}
      </div>
    </div>
  )
}

interface PanelCardProps {
  title?: ReactNode
  children: ReactNode
  className?: string
}
// Soft surface card with a leading section title.
function PanelCard({ title, children, className = '' }: PanelCardProps) {
  return (
    <div className={`rounded-2xl bg-white border border-[#dde0db] shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden ${className}`}>
      {title && (
        <div className="px-4 pt-3.5 pb-2 text-[11px] font-bold text-[#454745] uppercase tracking-[0.06em]">
          {title}
        </div>
      )}
      {children}
    </div>
  )
}

interface InfoRowProps {
  icon: LucideIcon
  label: ReactNode
  value: ReactNode
  mono?: boolean
}
// Single info row inside a PanelCard. Icon-led, label on the left,
// value on the right; supports multi-line values that wrap cleanly.
function InfoRow({ icon: Icon, label, value, mono = false }: InfoRowProps) {
  if (!value && value !== 0) return null
  return (
    <div className="flex items-start gap-3 px-4 py-3 border-t border-[#dde0db] first:border-t-0">
      <div className="w-7 h-7 rounded-lg bg-[#e8ebe6] flex items-center justify-center flex-shrink-0 text-[#454745]">
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-[#454745] font-medium">{label}</div>
        <div className={`text-[13.5px] text-[#0e0f0c] font-semibold ${mono ? 'font-mono' : ''} break-words`}>
          {value}
        </div>
      </div>
    </div>
  )
}

interface LineItemProps {
  icon: LucideIcon
  tone?: 'rent' | 'water' | 'elec' | 'fixed' | 'neutral'
  label: ReactNode
  detail?: ReactNode
  amount: ReactNode
}
// Line item in the breakdown card. Larger icon tile, label + sub-detail,
// amount on the right. Designed for the rent / water / electricity /
// fixed-service rows.
function LineItem({ icon: Icon, tone = 'neutral', label, detail, amount }: LineItemProps) {
  const tones: Record<NonNullable<LineItemProps['tone']>, string> = {
    rent:    'bg-[#e2f6d5] text-[#0e0f0c]',
    water:   'bg-[#eef4ff] text-[#428bff]',
    elec:    'bg-[#FFF3DF] text-[#B8860B]',
    fixed:   'bg-[#f3edff] text-[#6B3FA0]',
    neutral: 'bg-[#e8ebe6] text-[#454745]',
  }
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border-t border-[#dde0db] first:border-t-0">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${tones[tone] || tones.neutral}`}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-semibold text-[#0e0f0c] truncate">{label}</div>
        {detail && <div className="text-[11px] text-[#454745] mt-0.5 truncate">{detail}</div>}
      </div>
      <div className="text-[13.5px] font-bold text-[#0e0f0c] flex-shrink-0">{amount}</div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

interface TgStatus { variant: 'ok' | 'warn' | 'error'; message: string }

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const t = useT()
  const { getInvoiceById, loadInvoiceById, markInvoicePaid, cancelInvoice, exchangeRate, invoiceSettings } = useStore()
  const headerCfg = invoiceSettings.header
  const footerCfg = invoiceSettings.footer
  const qrCfg     = invoiceSettings.qr

  const [markPaidOpen, setMarkPaidOpen] = useState(false)
  const [cancelOpen,   setCancelOpen]   = useState(false)
  const [tgSharing,    setTgSharing]    = useState(false)
  const [tgStatus,     setTgStatus]     = useState<TgStatus | null>(null)
  const [fetching,     setFetching]     = useState(false)

  const cached = id ? getInvoiceById(id) : null
  useEffect(() => {
    if (!id || cached) return
    setFetching(true)
    loadInvoiceById(id).finally(() => setFetching(false))
  }, [id, cached, loadInvoiceById])

  // Reuses index.css's print stylesheet — only .invoice-paper content prints.
  function handlePrint() {
    if (typeof window !== 'undefined') window.print()
  }

  async function handleShareTelegram() {
    if (tgSharing || !id) return
    setTgSharing(true)
    setTgStatus(null)
    try {
      // Backend returns `{ linked: boolean; sent: boolean }`; the SDK
      // type is stale, so cast at the boundary.
      const r = await invoicesApi.shareToTelegram(id) as unknown as { linked?: boolean; sent?: boolean }
      if (!r?.linked)      setTgStatus({ variant: 'warn',  message: t('invoiceDetail.tgShare.noLink') })
      else if (!r.sent)    setTgStatus({ variant: 'error', message: t('invoiceDetail.tgShare.failed') })
      else                 setTgStatus({ variant: 'ok',    message: t('invoiceDetail.tgShare.sent') })
    } catch (e) {
      setTgStatus({ variant: 'error', message: (e as Error).message || t('invoiceDetail.tgShare.failed') })
    } finally {
      setTgSharing(false)
      setTimeout(() => setTgStatus(null), 4000)
    }
  }

  const inv = cached

  if (!inv) {
    return (
      <div className="app-shell">
        <PageHeader title={fetching ? t('common.loading') : t('invoiceDetail.notFound')} />
        {!fetching && (
          <div className="p-4 text-center text-[#454745]">{t('invoiceDetail.notFoundSub')}</div>
        )}
      </div>
    )
  }

  // ── Derive ────────────────────────────────────────────────────────────────
  const periodStart = new Date(inv.periodStart)
  const periodEnd   = new Date(inv.periodEnd)
  const billDays    = inv.billDays  || (Math.round((periodEnd.getTime() - periodStart.getTime()) / 86400000) + 1)
  const daysInMo    = inv.daysInMonth || new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0).getDate()
  const rentAmt     = inv.baseRent * (billDays / daysInMo)

  const waterUsage = inv.waterCurrent != null && inv.waterPrev != null ? Math.max(0, inv.waterCurrent - inv.waterPrev) : null
  const elecUsage  = inv.elecCurrent  != null && inv.elecPrev  != null ? Math.max(0, inv.elecCurrent  - inv.elecPrev)  : null
  const waterAmt   = waterUsage != null ? waterUsage * (inv.waterRate || 0) : null
  const elecAmt    = elecUsage  != null ? elecUsage  * (inv.elecRate  || 0) : null

  const fmtDate = (d: string) => formatFullDate(d)

  const canPay      = inv.status === 'progress' || inv.status === 'overdue'
  const canCancel   = inv.status !== 'cancelled' && inv.status !== 'paid'
  const isPaid      = inv.status === 'paid'
  const isCancelled = inv.status === 'cancelled'
  const isOverdue   = inv.status === 'overdue'

  const rate        = inv.exchangeRate || exchangeRate || 4000
  const statusLabel = t(invoiceStatusLabelKey(inv.status) || 'status.progress')

  const roomFull = [inv.roomSnapshot?.name, inv.roomSnapshot?.building, inv.roomSnapshot?.floor]
    .filter(Boolean).join(' · ')
  const periodLabel = `${fmtDate(inv.periodStart)} – ${fmtDate(inv.periodEnd)}`

  const headerTitle = inv.roomSnapshot?.name && inv.periodStart
    ? `${inv.roomSnapshot.name} — ${formatShortDate(inv.periodStart)}`
    : inv.invoiceNumber || inv.id

  return (
    <div className="app-shell">
      {/* Header chip removed: the hero card already carries the status
          tag + colour, so showing it in the nav bar was redundant. */}
      <PageHeader title={headerTitle} />

      <div className="page-content scrollbar-hide" style={{ paddingBottom: 0 }}>
        {/* Printable surface — .invoice-paper is what @media print keeps visible. */}
        <div className="invoice-paper px-4 pt-4 space-y-3 pb-6">

          {/* 1. Hero */}
          <HeroCard
            inv={inv}
            total={inv.total}
            rate={rate}
            isPaid={isPaid}
            isCancelled={isCancelled}
            isOverdue={isOverdue}
            fmtDate={fmtDate}
            t={t}
            paymentMethod={inv.paymentMethod}
            paidAt={inv.paidAt}
            dueDate={inv.dueDate}
            statusLabel={statusLabel}
          />

          {/* 2. Business header (optional, configured in Invoice Setup) */}
          {headerCfg.enabled && (
            <PanelCard>
              <div className="px-4 py-4 flex items-center gap-3">
                {headerCfg.profileImage ? (
                  <img src={headerCfg.profileImage} alt="logo" className="w-12 h-12 rounded-2xl object-cover flex-shrink-0 border border-[#dde0db]" />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-[#e2f6d5] flex items-center justify-center flex-shrink-0">
                    <Sparkles size={18} className="text-[#0e0f0c]" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-bold text-[#0e0f0c] truncate">
                    {headerCfg.bizName || t('invoiceDetail.bizDefault')}
                  </div>
                  {(headerCfg.bizPhone || headerCfg.tinNo) && (
                    <div className="text-[11px] text-[#454745] mt-0.5 truncate">
                      {headerCfg.bizPhone && <span>{formatPhone(headerCfg.bizPhone)}</span>}
                      {headerCfg.bizPhone && headerCfg.tinNo && <span className="mx-1.5">·</span>}
                      {headerCfg.tinNo && <span>TIN {headerCfg.tinNo}</span>}
                    </div>
                  )}
                  {headerCfg.address && (
                    <div className="text-[11px] text-[#454745] leading-snug mt-0.5">{headerCfg.address}</div>
                  )}
                </div>
              </div>
            </PanelCard>
          )}

          {/* 3. Invoice number → Tenant (name + phone in one contact-card
              style row) → Room → Period. Putting name + phone on a
              single row reads like a contact card and saves vertical
              space without losing either field. */}
          <PanelCard title={t('invoiceDetail.details')}>
            <InfoRow icon={Hash} label={t('invoiceDetail.invoice')} value={inv.invoiceNumber || inv.id} mono />

            {(inv.tenantSnapshot?.name || inv.tenantSnapshot?.phone) && (
              <div className="flex items-start gap-3 px-4 py-3 border-t border-[#dde0db]">
                <div className="w-7 h-7 rounded-lg bg-[#e8ebe6] flex items-center justify-center flex-shrink-0 text-[#454745]">
                  <User size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-[#454745] font-medium">
                    {t('invoiceDetail.tenant')}
                  </div>
                  <div className="text-[13.5px] text-[#0e0f0c] font-semibold truncate">
                    {inv.tenantSnapshot?.name || '—'}
                  </div>
                  {inv.tenantSnapshot?.phone && (
                    <a
                      href={`tel:${inv.tenantSnapshot.phone}`}
                      className="block text-[13.5px] text-[#0e0f0c] font-semibold truncate mt-0.5"
                    >
                      {formatPhone(inv.tenantSnapshot.phone)}
                    </a>
                  )}
                </div>
              </div>
            )}

            <InfoRow icon={Home}     label={t('invoiceDetail.room')}   value={roomFull} />
            <InfoRow icon={Calendar} label={t('invoiceDetail.period')} value={periodLabel} />
          </PanelCard>

          {/* 4. Breakdown */}
          <PanelCard title={t('invoiceDetail.lineItems')}>
            <LineItem
              icon={Home}
              tone="rent"
              label={t('invoiceDetail.baseRent')}
              detail={billDays === daysInMo
                ? `${billDays} ${t('invoiceDetail.fullMonth')}`
                : `${billDays}/${daysInMo} ${t('invoiceDetail.prorated')}`}
              amount={formatUSD(rentAmt)}
            />
            {waterUsage != null && waterAmt != null && (
              <LineItem
                icon={Droplets}
                tone="water"
                label={t('invoiceDetail.water')}
                detail={`${t('invoiceDetail.meterOld')} ${inv.waterPrev} → ${t('invoiceDetail.meterNew')} ${inv.waterCurrent} = ${waterUsage} m³ × $${inv.waterRate}`}
                amount={formatUSD(waterAmt)}
              />
            )}
            {elecUsage != null && elecAmt != null && (
              <LineItem
                icon={Zap}
                tone="elec"
                label={t('invoiceDetail.electricity')}
                detail={`${t('invoiceDetail.meterOld')} ${inv.elecPrev} → ${t('invoiceDetail.meterNew')} ${inv.elecCurrent} = ${elecUsage} kWh × $${inv.elecRate}`}
                amount={formatUSD(elecAmt)}
              />
            )}
            {(inv.fixedServices || []).map(svc => (
              <LineItem
                key={svc.name}
                icon={Sparkles}
                tone="fixed"
                label={svc.name}
                detail={t('invoiceDetail.fixedMonth')}
                amount={formatUSD(svc.amount)}
              />
            ))}

            {/* Totals — quieter rows under the line items, anchored by a
                bold Total row that visually closes the breakdown. */}
            <div className="px-4 py-3 border-t border-[#dde0db] bg-[#f3f5f1] space-y-1.5">
              <div className="flex justify-between text-[12px]">
                <span className="text-[#454745]">{t('invoiceDetail.subtotal')}</span>
                <span className="font-semibold text-[#0e0f0c]">{formatUSD(inv.subtotal)}</span>
              </div>
              {inv.securityDeposit > 0 && (
                <div className="flex justify-between text-[12px]">
                  <span className="text-[#454745] inline-flex items-center gap-1.5">
                    <ShieldCheck size={12} /> {t('invoiceDetail.deposit')}
                  </span>
                  <span className="text-[#454745]">{formatUSD(inv.securityDeposit)}</span>
                </div>
              )}
              <div className="flex justify-between text-[12px]">
                <span className="text-[#454745] inline-flex items-center gap-1.5">
                  <ArrowLeftRight size={12} /> {t('invoiceDetail.exchange')}
                </span>
                <span className="text-[#454745]">{rate.toLocaleString()} ៛/$</span>
              </div>
            </div>
            <div className="flex items-center justify-between px-4 py-3.5 bg-[#0e0f0c] text-white">
              <span className="text-[13px] font-bold uppercase tracking-wider">
                {isPaid ? t('invoiceDetail.totalPaid') : t('invoiceDetail.totalDue')}
              </span>
              <div className="text-right">
                <div className="text-[17px] font-extrabold leading-none">{formatUSD(inv.total)}</div>
                <div className="text-[10px] text-white/60 mt-0.5">≈ {formatKHR(inv.total, rate)}</div>
              </div>
            </div>
          </PanelCard>

          {/* 5. QR — only when payable AND configured */}
          {canPay && qrCfg.enabled && (
            <PanelCard>
              <div className="flex flex-col items-center px-4 py-5">
                <InvoiceQR value={qrCfg.qrString} size={200} />
                <div className="text-[11px] text-[#454745] mt-3 font-medium">{t('invoiceDetail.scanPay')}</div>
              </div>
            </PanelCard>
          )}

          {/* 6. Footer note */}
          {footerCfg.enabled && (
            <div className="text-[11px] text-[#454745] text-center px-2 pt-1 leading-relaxed">
              {footerCfg.note || t('invoiceDetail.thanks')}
            </div>
          )}

          {/* Cancel — kept outside the sticky CTA so it's never an easy
              mis-tap. Hidden on print since the receipt should not surface
              destructive actions. */}
          {canCancel && (
            <div className="no-print text-center pt-2">
              <button
                onClick={() => setCancelOpen(true)}
                className="text-[12px] font-semibold text-[#c13515] px-3 py-2 rounded-lg active:bg-[#fdecea]"
              >
                {t('invoiceDetail.cancel')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Sticky bottom action bar ─────────────────────────────────────────
          Sibling of .page-content inside the flex column app-shell, so it
          stays anchored to the bottom of the viewport while content scrolls
          above. Cancelled invoices have no actions worth keeping here. */}
      {!isCancelled && (
        <div
          className="no-print flex-shrink-0 bg-white border-t border-[#dde0db] px-4 pt-3"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
        >
          {/* Telegram-share status sits above the buttons so a successful
              send / failure is visible without competing with the CTA. */}
          {tgStatus && (
            <div className={`text-[12px] font-semibold text-center px-3 py-2 rounded-lg mb-2 ${
              tgStatus.variant === 'ok'   ? 'bg-[#E8F6EF] text-[#1F6F4E]' :
              tgStatus.variant === 'warn' ? 'bg-[#FFF3DF] text-[#8A6408]' :
                                             'bg-[#fdecea] text-[#c13515]'
            }`}>
              {tgStatus.message}
            </div>
          )}

          <div className="flex gap-2 mb-2">
            <Button
              variant="outline"
              size="sm"
              fullWidth={false}
              className="flex-1 min-w-0 text-[12px] leading-tight whitespace-normal text-center"
              onClick={handlePrint}
            >
              <Printer size={14} className="flex-shrink-0" />
              {isPaid ? t('invoiceDetail.shareReceipt') : t('invoiceDetail.shareBill')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              fullWidth={false}
              className="flex-1 min-w-0 text-[12px] leading-tight whitespace-normal text-center"
              onClick={handleShareTelegram}
              disabled={tgSharing}
            >
              <MessageSquare size={14} className="flex-shrink-0" />
              {tgSharing
                ? t('invoiceDetail.tgShare.sending')
                : isPaid ? t('invoiceDetail.tgShare.sendReceipt') : t('invoiceDetail.tgShare.sendBill')}
            </Button>
          </div>

          {canPay && (
            <Button onClick={() => setMarkPaidOpen(true)}>
              <Banknote size={16} /> {t('invoiceDetail.markPaid')} · {formatUSD(inv.total)}
            </Button>
          )}
        </div>
      )}

      <MarkPaidModal
        open={markPaidOpen}
        onClose={() => setMarkPaidOpen(false)}
        onConfirm={async method => {
          if (!id) return
          await markInvoicePaid(id, method)
          setMarkPaidOpen(false)
        }}
      />
      <CancelInvoiceModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={async reason => {
          if (!id) return
          await cancelInvoice(id, reason)
          setCancelOpen(false)
          navigate(-1)
        }}
      />
    </div>
  )
}
