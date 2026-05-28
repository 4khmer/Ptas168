import { useRef, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import { useStore } from '../store'
import PageHeader from '../components/layout/PageHeader'
import { ImagePlus, X, FileText, AlignLeft, QrCode, Hash, Eye } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { formatUSD, formatKHR } from '../lib/billing'
import { useT } from '../lib/i18n'
import type { TFunction } from '../lib/i18n'
import { formatPhone } from '../lib/phone'
import { formatFullDate } from '../lib/date'
import { decodeQRFromImage } from '../lib/qr'
import { parseKHQR } from '../lib/khqr'
import { resizeImageToBlob } from '../lib/image'
import { uploadsApi } from '../sdk'
import InvoiceQR from '../components/ui/InvoiceQR'
import type { InvoiceSettings } from '@ptas/sdk'

// ── Toggle switch ─────────────────────────────────────────────────────────────
interface ToggleProps { value: boolean; onChange: (v: boolean) => void }
function Toggle({ value, onChange }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-[#9fe870]' : 'bg-[#D1D5DB]'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  )
}

// ── Section card wrapper ──────────────────────────────────────────────────────
interface SectionCardProps {
  icon: LucideIcon
  iconBg: string
  iconColor: string
  title: string
  enabled: boolean
  onToggle: (v: boolean) => void
  children: ReactNode
}
function SectionCard({ icon: Icon, iconBg, iconColor, title, enabled, onToggle, children }: SectionCardProps) {
  return (
    <div className="bg-white rounded-xl border border-[#d1d3cf] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
            <Icon size={18} className={iconColor} />
          </div>
          <span className="text-[14px] font-bold text-[#0e0f0c]">{title}</span>
        </div>
        <Toggle value={enabled} onChange={onToggle} />
      </div>
      {enabled && (
        <div className="border-t border-[#d1d3cf] px-4 py-3.5 space-y-3">
          {children}
        </div>
      )}
    </div>
  )
}

// ── Text field ────────────────────────────────────────────────────────────────
interface FieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  textarea?: boolean
}
function Field({ label, value, onChange, placeholder, type = 'text', textarea = false }: FieldProps) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-[#454745] uppercase tracking-[0.4px] mb-1 block">{label}</label>
      {textarea ? (
        <textarea
          rows={3}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 rounded-lg border-[1.5px] border-[#d1d3cf] text-[13px] text-[#0e0f0c] outline-none resize-none focus:border-[#9fe870] bg-white"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 rounded-lg border-[1.5px] border-[#d1d3cf] text-[13px] text-[#0e0f0c] outline-none focus:border-[#9fe870] bg-white"
        />
      )}
    </div>
  )
}

// ── Image uploader ────────────────────────────────────────────────────────────
interface ImageUploaderProps {
  label: string
  value: string | null
  onChange: (v: string | null) => void
  circular?: boolean
  uploadLabel?: string
}
function ImageUploader({ label, value, onChange, circular = false, uploadLabel = 'Upload' }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  // Resize → POST /api/uploads → store the returned URL. Same pattern
  // as the Profile avatar — invoice header logos cap at 1024px.
  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploading(true)
    try {
      const blob = await resizeImageToBlob(file, { maxDimension: 1024 })
      if (!blob) return
      const { url } = await uploadsApi.upload(new File([blob], 'image.jpg', { type: blob.type }))
      onChange(url)
    } catch {
      // Surface failure visually by keeping the previous value; the
      // parent can wire its own error toast if needed.
    } finally {
      setUploading(false)
    }
  }
  return (
    <div>
      <label className="text-[11px] font-semibold text-[#454745] uppercase tracking-[0.4px] mb-2 block">{label}</label>
      {value ? (
        <div className="relative inline-block">
          <img
            src={value}
            alt="uploaded"
            className={`object-cover border border-[#d1d3cf] ${circular ? 'w-20 h-20 rounded-full' : 'w-32 h-20 rounded-xl'}`}
          />
          <button
            onClick={() => onChange(null)}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#c13515] text-white rounded-full flex items-center justify-center"
          >
            <X size={10} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={`flex flex-col items-center justify-center gap-1.5 border-[1.5px] border-dashed border-[#D1D5DB] bg-[#e8ebe6] text-[#454745] active:opacity-70 disabled:opacity-50 transition-opacity ${
            circular ? 'w-20 h-20 rounded-full' : 'w-full h-20 rounded-xl'
          }`}
        >
          <ImagePlus size={20} />
          <span className="text-[11px] font-semibold">{uploading ? 'Uploading…' : uploadLabel}</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  )
}

// ── QR picker — decodes an uploaded image to its payload string. When
// the payload is a Bakong KHQR, the preview shows the standard KHQR
// card with bank + account name. Only the payload string is persisted.
interface QrPickerProps {
  value: string
  onChange: (v: string) => void
  label: string
  t: TFunction
}
function QrPicker({ value, onChange, label, t }: QrPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const khqr = value ? parseKHQR(value) : null

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    setBusy(true)
    try {
      const text = await decodeQRFromImage(file)
      if (!text) {
        setError(t('invSetup.qrErrUnreadable'))
        return
      }
      onChange(text)
    } catch (err) {
      setError((err as Error).message || t('invSetup.qrErrUnreadable'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <label className="text-[11px] font-semibold text-[#454745] uppercase tracking-[0.4px] mb-2 block">{label}</label>

      {value ? (
        <div className="flex items-start gap-3">
          <InvoiceQR value={value} size={140} compact />
          <div className="flex-1 min-w-0">
            {khqr ? (
              <>
                <div className="text-[10px] font-bold text-[#454745] uppercase tracking-wide">{t('invSetup.qrBank')}</div>
                <div className="text-[13px] font-bold text-[#0e0f0c] truncate">{khqr.bankName || '—'}</div>
                <div className="text-[10px] font-bold text-[#454745] uppercase tracking-wide mt-2">{t('invSetup.qrAccountName')}</div>
                <div className="text-[13px] font-bold text-[#0e0f0c] truncate">{khqr.merchantName || '—'}</div>
              </>
            ) : (
              <div className="text-[12px] text-[#454745]">{t('invSetup.qrPlain')}</div>
            )}
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-[11px] font-semibold text-[#0e0f0c] bg-[#e8ebe6] hover:bg-[#dde0db] px-3 py-1.5 rounded-lg"
              >
                {t('invSetup.qrReplace')}
              </button>
              <button
                type="button"
                onClick={() => onChange('')}
                className="text-[11px] font-semibold text-[#c13515] bg-[#fdecea] hover:bg-[#f9d6d2] px-3 py-1.5 rounded-lg"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="w-full h-24 flex flex-col items-center justify-center gap-1.5 border-[1.5px] border-dashed border-[#D1D5DB] bg-[#e8ebe6] text-[#454745] rounded-xl active:opacity-70 transition-opacity disabled:opacity-50"
        >
          <ImagePlus size={20} />
          <span className="text-[11px] font-semibold">{busy ? t('invSetup.qrDecoding') : t('common.upload')}</span>
        </button>
      )}

      {error && (
        <p className="text-[11px] text-[#c13515] mt-1.5">{error}</p>
      )}

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  )
}

// ── Sample invoice data for preview ──────────────────────────────────────────
const SAMPLE_INV = {
  id: 'INV-24032026-000001',
  tenantName: 'Somchai Kongchai',
  tenantPhone: '081-234-5678',
  room: 'Room 101',
  building: 'Block A · Floor 1',
  periodStart: '2026-03-01',
  periodEnd: '2026-03-31',
  dueDate: '2026-04-07',
  baseRent: 650,
  billDays: 31,
  daysInMonth: 31,
  waterPrev: 1268, waterCurrent: 1298, waterRate: 0.28,
  elecPrev: 3920,  elecCurrent: 3998,  elecRate: 0.12,
  fixedServices: [
    { name: 'Parking', amount: 50 },
    { name: 'WiFi',    amount: 30 },
  ],
  securityDeposit: 1300,
  total: 747.76,
}

// ── Invoice Preview Modal ─────────────────────────────────────────────────────
interface PreviewModalProps {
  open: boolean
  onClose: () => void
  settings: InvoiceSettings
  exchangeRate: number
  t: TFunction
}
function PreviewModal({ open, onClose, settings, exchangeRate, t }: PreviewModalProps) {
  if (!open) return null
  const { header, body, footer, qr } = settings
  const inv = SAMPLE_INV

  const waterUsage = inv.waterCurrent - inv.waterPrev
  const elecUsage  = inv.elecCurrent  - inv.elecPrev
  const waterAmt   = waterUsage * inv.waterRate
  const elecAmt    = elecUsage  * inv.elecRate
  const rentAmt    = inv.baseRent * (inv.billDays / inv.daysInMonth)

  const fmtDate = (d: string) => formatFullDate(d)

  // Invoice number preview
  const digits = body.invoiceNoDigits === 4 ? '0001' : '000001'
  const dateStr = new Date(inv.periodStart)
    .toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .replace(/\//g, '')
  const invoiceNo = `INV-${dateStr}-${digits}`

  const rate = exchangeRate || 4000

  return (
    <div
      className="modal-overlay fade-in"
      onClick={onClose}
    >
      <div
        className="modal-sheet slide-up bg-[#e8ebe6] scrollbar-hide"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 bg-[#d1d3cf] rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2.5" />
        {/* Modal header */}
        <div className="sticky top-0 bg-white border-b border-[#d1d3cf] px-5 pt-5 pb-3 flex items-center justify-between z-10">
          <span className="text-[15px] font-bold text-[#0e0f0c]">{t('invSetup.previewTitle')}</span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full border border-[#d1d3cf] bg-[#e8ebe6] flex items-center justify-center text-[#454745]"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-4">
          {/* Paper invoice */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">

            {/* ── HEADER ── */}
            {header.enabled && (
              <div className="px-5 pt-5 pb-4 border-b border-[#d1d3cf]">
                <div className="flex items-center gap-4">
                  {header.profileImage ? (
                    <img src={header.profileImage} alt="logo" className="w-14 h-14 rounded-full object-cover flex-shrink-0 border border-[#d1d3cf]" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-[#e8ebe6] flex items-center justify-center flex-shrink-0">
                      <FileText size={22} className="text-[#0e0f0c]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-bold text-[#0e0f0c] truncate">
                      {header.bizName || t('invoiceDetail.bizDefault')}
                    </div>
                    {header.tinNo && (
                      <div className="text-[11px] text-[#454745] mt-0.5">TIN: {header.tinNo}</div>
                    )}
                    {header.bizPhone && (
                      <div className="text-[11px] text-[#454745]">{header.bizPhone}</div>
                    )}
                    {header.address && (
                      <div className="text-[11px] text-[#454745] leading-snug mt-0.5">{header.address}</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── INVOICE TITLE + INFO ── */}
            <div className="px-5 pt-4 pb-3">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-[18px] font-bold text-[#0e0f0c]">{t('invoiceDetail.invoice')}</div>
                  {body.enabled && (
                    <div className="text-[11px] text-[#454745] font-mono mt-0.5">{invoiceNo}</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-[#454745]">{t('invoiceDetail.dueDate')}</div>
                  <div className="text-[13px] font-bold text-[#0e0f0c]">{fmtDate(inv.dueDate)}</div>
                </div>
              </div>

              {/* Tenant / Room info */}
              <div className="bg-[#e8ebe6] rounded-xl px-4 py-3 space-y-1.5 text-[12px]">
                {[
                  { label: t('invoiceDetail.tenant'),      value: inv.tenantName },
                  { label: t('invoiceDetail.phone'),       value: formatPhone(inv.tenantPhone) },
                  { label: t('invoiceDetail.room'),        value: `${inv.room} · ${inv.building}` },
                  { label: t('invoiceDetail.period'),      value: `${fmtDate(inv.periodStart)} – ${fmtDate(inv.periodEnd)}` },
                ].map(row => (
                  <div key={row.label} className="flex justify-between gap-2">
                    <span className="text-[#454745]">{row.label}</span>
                    <span className="font-semibold text-[#0e0f0c] text-right max-w-[55%]">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── LINE ITEMS ── */}
            <div className="px-5 pb-4">
              <div className="text-[10px] font-bold text-[#454745] uppercase tracking-wider mb-2">{t('invoiceDetail.lineItems')}</div>
              <div className="border-t border-[#d1d3cf]">
                {[
                  {
                    label: t('invoiceDetail.baseRent'),
                    detail: inv.billDays === inv.daysInMonth
                      ? `${inv.billDays} ${t('invoiceDetail.fullMonth')}`
                      : `${inv.billDays}/${inv.daysInMonth} ${t('invoiceDetail.prorated')}`,
                    amount: formatUSD(rentAmt),
                  },
                  {
                    label: t('invoiceDetail.water'),
                    detail: `${inv.waterPrev} → ${inv.waterCurrent} (${waterUsage} m³ × $${inv.waterRate})`,
                    amount: formatUSD(waterAmt),
                  },
                  {
                    label: t('invoiceDetail.electricity'),
                    detail: `${inv.elecPrev} → ${inv.elecCurrent} (${elecUsage} kWh × $${inv.elecRate})`,
                    amount: formatUSD(elecAmt),
                  },
                  ...inv.fixedServices.map(s => ({
                    label: s.name,
                    detail: t('invoiceDetail.fixedMonth'),
                    amount: formatUSD(s.amount),
                  })),
                ].map((row, i) => (
                  <div key={i} className="flex items-start justify-between py-2.5 border-b border-[#dde0db]">
                    <div className="flex-1 min-w-0 mr-3">
                      <div className="text-[12px] font-semibold text-[#0e0f0c]">{row.label}</div>
                      <div className="text-[10px] text-[#454745] mt-0.5">{row.detail}</div>
                    </div>
                    <div className="text-[12px] font-bold text-[#0e0f0c] flex-shrink-0">{row.amount}</div>
                  </div>
                ))}
              </div>

              {/* Total block */}
              <div className="mt-2 space-y-1.5">
                <div className="flex justify-between text-[12px]">
                  <span className="text-[#454745]">{t('invoiceDetail.subtotal')}</span>
                  <span className="font-semibold">{formatUSD(inv.total)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#454745]">{t('invoiceDetail.deposit')}</span>
                  <span className="text-[#454745]">{formatUSD(inv.securityDeposit)}</span>
                </div>
              </div>

              <div className="bg-[#e8ebe6] rounded-xl px-4 py-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-[14px] font-bold text-[#0e0f0c]">{t('invoiceDetail.totalDue')}</span>
                  <span className="text-[17px] font-bold text-[#0e0f0c]">{formatUSD(inv.total)}</span>
                </div>
                {body.enabled && (
                  <div className="text-[10px] text-[#454745] text-right mt-0.5">
                    ≈ {formatKHR(inv.total, rate)} @ {rate.toLocaleString()} ៛/$
                  </div>
                )}
              </div>
            </div>

            {/* ── QR ── */}
            {qr.enabled && (
              <div className="px-5 pb-5 flex flex-col items-center border-t border-[#d1d3cf] pt-4">
                <InvoiceQR value={qr.qrString} size={180} />
                <div className="text-[11px] text-[#454745] mt-2">{t('invoiceDetail.scanPay')}</div>
              </div>
            )}

            {/* ── FOOTER ── */}
            {footer.enabled && (
              <div className="border-t border-[#d1d3cf] px-5 py-4">
                <p className="text-[11px] text-[#454745] text-center leading-relaxed">
                  {footer.note || t('invoiceDetail.thanks')}
                </p>
              </div>
            )}
          </div>

          <div className="mt-3 text-center text-[11px] text-[#868685]">
            {t('invSetup.previewSample')}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InvoiceSetup() {
  const t = useT()
  const { invoiceSettings, updateInvoiceSettings, exchangeRate, updateExchangeRate } = useStore()
  const { header, body, footer, qr } = invoiceSettings
  const [previewOpen, setPreviewOpen] = useState(false)

  function h(data: Partial<InvoiceSettings['header']>) { updateInvoiceSettings('header', data) }
  function b(data: Partial<InvoiceSettings['body']>) { updateInvoiceSettings('body', data) }
  function f(data: Partial<InvoiceSettings['footer']>) { updateInvoiceSettings('footer', data) }
  function q(data: Partial<InvoiceSettings['qr']>) { updateInvoiceSettings('qr', data) }

  return (
    <div className="app-shell">
      <PageHeader title={t('invSetup.title')} />

      <div className="page-content scrollbar-hide p-4 space-y-3" style={{ paddingBottom: '32px' }}>

        {/* ── Invoice Header ── */}
        <SectionCard
          icon={FileText}
          iconBg="bg-[#e8ebe6]"
          iconColor="text-[#0e0f0c]"
          title={t('invSetup.header')}
          enabled={header.enabled}
          onToggle={v => h({ enabled: v })}
        >
          <ImageUploader
            label={t('invSetup.profileLogo')}
            value={header.profileImage}
            onChange={v => h({ profileImage: v })}
            circular
            uploadLabel={t('common.upload')}
          />
          <Field label={t('invSetup.bizName')} value={header.bizName} onChange={v => h({ bizName: v })} placeholder={t('invSetup.bizNamePh')} />
          <Field label={t('invSetup.tin')} value={header.tinNo} onChange={v => h({ tinNo: v })} placeholder={t('invSetup.tinPh')} />
          <Field label={t('invSetup.address')} value={header.address} onChange={v => h({ address: v })} placeholder={t('invSetup.addressPh')} textarea />
          <Field label={t('invSetup.bizPhone')} value={header.bizPhone} onChange={v => h({ bizPhone: v })} placeholder={t('invSetup.bizPhonePh')} type="tel" />
        </SectionCard>

        {/* ── Invoice Body ── */}
        <SectionCard
          icon={Hash}
          iconBg="bg-[#FFF3DF]"
          iconColor="text-[#8A6408]"
          title={t('invSetup.body')}
          enabled={body.enabled}
          onToggle={v => b({ enabled: v })}
        >
          <div>
            <label className="text-[11px] font-semibold text-[#454745] uppercase tracking-[0.4px] mb-2 block">
              {t('invSetup.invNoFormat')}
            </label>
            <div className="flex gap-2">
              {[4, 6].map(d => (
                <button
                  key={d}
                  onClick={() => b({ invoiceNoDigits: d })}
                  className={`flex-1 py-2 rounded-lg border-[1.5px] text-[13px] font-semibold transition-colors ${
                    body.invoiceNoDigits === d
                      ? 'border-[#9fe870] bg-[#e8ebe6] text-[#0e0f0c]'
                      : 'border-[#d1d3cf] bg-white text-[#454745]'
                  }`}
                >
                  {d}-{t('invSetup.digit')}
                </button>
              ))}
            </div>
            <div className="mt-1.5 text-[11px] text-[#454745]">
              {t('invSetup.previewPrefix')}: <span className="font-bold text-[#0e0f0c]">
                INV-{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '')}-{body.invoiceNoDigits === 4 ? '0001' : '000001'}
              </span>
            </div>
          </div>

          <Field
            label={t('invSetup.exchange')}
            value={String(exchangeRate)}
            onChange={v => { const n = parseFloat(v); if (n > 0) updateExchangeRate(n) }}
            placeholder={t('invSetup.exchangePh')}
            type="number"
          />
        </SectionCard>

        {/* ── Invoice Footer ── */}
        <SectionCard
          icon={AlignLeft}
          iconBg="bg-[#E8F6EF]"
          iconColor="text-[#1F6F4E]"
          title={t('invSetup.footer')}
          enabled={footer.enabled}
          onToggle={v => f({ enabled: v })}
        >
          <Field
            label={t('invSetup.footerNote')}
            value={footer.note}
            onChange={v => f({ note: v })}
            placeholder={t('invSetup.footerNotePh')}
            textarea
          />
        </SectionCard>

        {/* ── Invoice QR ── */}
        <SectionCard
          icon={QrCode}
          iconBg="bg-[#F3EEFF]"
          iconColor="text-[#6B3FA0]"
          title={t('invSetup.qr')}
          enabled={qr.enabled}
          onToggle={v => q({ enabled: v })}
        >
          <QrPicker
            label={t('invSetup.qrImage')}
            value={qr.qrString}
            onChange={v => q({ qrString: v })}
            t={t}
          />
          <p className="text-[11px] text-[#454745]">
            {t('invSetup.qrHelp')}
          </p>
        </SectionCard>

      </div>

      {/* Floating Preview — bottom-center */}
      <button
        type="button"
        onClick={() => setPreviewOpen(true)}
        aria-label={t('invSetup.preview')}
        className="fab-bottom fab-flush fab-center flex items-center gap-1.5 pl-3.5 pr-4 h-12 rounded-full bg-[#9fe870] hover:bg-[#cdffad] active:scale-[0.97] text-[#0e0f0c] text-[14px] font-semibold shadow-lg transition-transform"
      >
        <Eye size={18} strokeWidth={2.5} />
        {t('invSetup.preview')}
      </button>

      <PreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        settings={invoiceSettings}
        exchangeRate={exchangeRate}
        t={t}
      />
    </div>
  )
}
