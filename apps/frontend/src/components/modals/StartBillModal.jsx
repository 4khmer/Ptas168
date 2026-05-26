import { useState, useEffect, useMemo } from 'react'
import Modal from '../ui/Modal'
import { useStore } from '../../store'
import { getDaysInMonthByYM } from '../../lib/billing'
import { useT } from '../../lib/i18n'
import { formatFullDate } from '../../lib/date'
import { Droplets, Zap } from 'lucide-react'

function daysBetween(a, b) {
  return Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000) + 1)
}

function toIsoDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Default bill period anchored on the contract's monthly anniversary.
// Returns { start, end } as YYYY-MM-DD strings. start = most recent
// anniversary ≤ today (clamped to contract start). end = day before next
// anniversary. Falls back to the calendar month when contractStart missing.
function defaultBillPeriod(contractStart, today = new Date()) {
  if (!contractStart) {
    const start = new Date(today.getFullYear(), today.getMonth(), 1)
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    return { start: toIsoDate(start), end: toIsoDate(end) }
  }
  const cs = new Date(contractStart)
  const csDay = new Date(cs.getFullYear(), cs.getMonth(), cs.getDate())
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  let cycleStart = new Date(t.getFullYear(), t.getMonth(), csDay.getDate())
  if (cycleStart > t) cycleStart = new Date(t.getFullYear(), t.getMonth() - 1, csDay.getDate())
  if (cycleStart < csDay) cycleStart = csDay
  const nextAnniv = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 1, csDay.getDate())
  const cycleEnd = new Date(nextAnniv.getFullYear(), nextAnniv.getMonth(), nextAnniv.getDate() - 1)
  return { start: toIsoDate(cycleStart), end: toIsoDate(cycleEnd) }
}

function AdjBadge({ show }) {
  if (!show) return null
  return (
    <span className="text-[10px] font-bold text-[#8A6408] bg-[#FFF3DF] px-1.5 py-0.5 rounded-md">adjusted</span>
  )
}

function BliInput({ value, onChange }) {
  return (
    <input
      type="number"
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-[88px] px-2.5 py-1.5 rounded-lg border-[1.5px] border-[#d1d3cf] text-[13px] font-bold text-right outline-none text-[#0e0f0c] bg-white focus:border-[#9fe870]"
    />
  )
}

export default function StartBillModal({ open, onClose, roomId, onSuccess }) {
  const t = useT()
  const {
    rooms, buildings, floors, contracts,
    getActiveContract, getRoomServices, loadRoomData, loadLatestMeterReadings, createInvoice,
  } = useStore()

  const room     = rooms.find(r => r.id === roomId)
  const contract = getActiveContract(roomId)
  const floor    = floors.find(f => f.id === room?.floorId)
  const building = buildings.find(b => b.id === room?.buildingId)
  const roomSvcs = getRoomServices(roomId)

  const today = new Date()
  const { start: defaultStart, end: defaultEnd } = defaultBillPeriod(contract?.startDate, today)

  // ── form state ──
  const [periodStart, setPeriodStart] = useState(defaultStart)
  const [periodEnd,   setPeriodEnd]   = useState(defaultEnd)
  const [dueOption,   setDueOption]   = useState(14)

  // Water / Electricity from API /latest
  const [latestReadings, setLatestReadings] = useState([])
  const [waterCurrent, setWaterCurrent] = useState('')
  const [elecCurrent,  setElecCurrent]  = useState('')
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [loadingReadings, setLoadingReadings] = useState(false)

  const waterLatest = latestReadings.find(r => r.serviceType === 'WATER')
  const elecLatest  = latestReadings.find(r => r.serviceType === 'ELECTRICITY')

  // Load room data + latest meter readings when modal opens. loadRoomData
  // ensures contracts / room services / meter readings are in the store —
  // necessary when the modal is launched from the Rooms list (Room Detail
  // already loads them via its own mount effect).
  useEffect(() => {
    if (!open || !roomId) return
    const period = defaultBillPeriod(contract?.startDate, today)
    setPeriodStart(period.start)
    setPeriodEnd(period.end)
    setDueOption(14)
    setErrors({})
    setWaterCurrent('')
    setElecCurrent('')

    setLoadingReadings(true)
    Promise.all([
      loadRoomData(roomId),
      loadLatestMeterReadings(roomId),
    ])
      .then(([, readings]) => {
        const data = readings || []
        setLatestReadings(data)
        const w = data.find(r => r.serviceType === 'WATER')
        const e = data.find(r => r.serviceType === 'ELECTRICITY')
        if (w?.autoFilled && w.currentReading != null) setWaterCurrent(String(w.currentReading))
        if (e?.autoFilled && e.currentReading != null) setElecCurrent(String(e.currentReading))
      })
      .catch(() => setLatestReadings([]))
      .finally(() => setLoadingReadings(false))
  }, [open, roomId, contract?.startDate]) // eslint-disable-line

  // Actual days the user selected — shown in the "X days selected" pill.
  const billDays = useMemo(() => daysBetween(periodStart, periodEnd), [periodStart, periodEnd])
  // Actual length of the start month — used only to detect a "full month".
  const actualDaysInMonth = useMemo(() => {
    const d = new Date(periodStart)
    return getDaysInMonthByYM(d.getFullYear(), d.getMonth() + 1)
  }, [periodStart])
  // Rent uses a fixed 30-day month: full-month bills always charge full rent
  // regardless of whether the actual month is 28 / 30 / 31 days.
  const daysInMonth = 30
  const isFullMonth = billDays >= actualDaysInMonth
  const billDaysForRent = isFullMonth ? 30 : Math.min(billDays, 30)

  // Service info for preview
  const waterSvc  = roomSvcs.find(s => s.serviceType === 'WATER')
  const elecSvc   = roomSvcs.find(s => s.serviceType === 'ELECTRICITY')
  const fixedSvcs = roomSvcs.filter(s => s.serviceType === 'FIXED')

  const waterRate    = waterSvc?.effectiveRate ?? 0
  const elecRate     = elecSvc?.effectiveRate  ?? 0
  const baseRent     = contract?.baseRent ?? 0

  // Preview totals (local estimate — actual amounts computed server-side)
  const waterPrev    = waterLatest?.previousReading ?? 0
  const elecPrev     = elecLatest?.previousReading  ?? 0
  const waterUsage   = Math.max(0, (parseFloat(waterCurrent) || 0) - waterPrev)
  const elecUsage    = Math.max(0, (parseFloat(elecCurrent)  || 0) - elecPrev)
  const waterAmt     = waterUsage * waterRate
  const elecAmt      = elecUsage * elecRate
  const rentAmt      = baseRent * (billDaysForRent / daysInMonth)
  const fixedTotal   = fixedSvcs.reduce((sum, s) => sum + (s.effectiveRate || 0), 0)
  const grandTotal   = rentAmt + waterAmt + elecAmt + fixedTotal

  const dueDateDisplay = useMemo(() => {
    const due = new Date(today)
    due.setDate(due.getDate() + dueOption)
    return formatFullDate(due)
  }, [dueOption]) // eslint-disable-line

  const periodLabel = useMemo(() => {
    // "22 / 04 / 2026 – 21 / 05 / 2026" — both endpoints in DD / MM / YYYY.
    return `${formatFullDate(periodStart)} – ${formatFullDate(periodEnd)}`
  }, [periodStart, periodEnd])

  const lastRecLabel = waterLatest?.lastRecordDate
    ? `${t('modal.startBill.last')}: ${formatFullDate(waterLatest.lastRecordDate)}`
    : t('modal.startBill.noRecord')

  async function handleSubmit() {
    // Only validate metered services that are actually enabled and not auto-filled.
    const formSchema = z.object({
      wc: z.union([z.literal(''), z.coerce.number().nonnegative()]),
      ec: z.union([z.literal(''), z.coerce.number().nonnegative()]),
    }).superRefine((v, ctx) => {
      if (waterSvc && !waterLatest?.autoFilled) {
        if (v.wc === '') ctx.addIssue({ code: 'custom', path: ['wc'], message: t('modal.startBill.errWater') })
        else if (Number(v.wc) < waterPrev) ctx.addIssue({ code: 'custom', path: ['wc'], message: `${t('modal.startBill.errLessThan')} ${waterPrev}` })
      }
      if (elecSvc && !elecLatest?.autoFilled) {
        if (v.ec === '') ctx.addIssue({ code: 'custom', path: ['ec'], message: t('modal.startBill.errElec') })
        else if (Number(v.ec) < elecPrev) ctx.addIssue({ code: 'custom', path: ['ec'], message: `${t('modal.startBill.errLessThan')} ${elecPrev}` })
      }
    })

    const result = validate(formSchema, { wc: waterCurrent, ec: elecCurrent })
    if (!result.ok) { setErrors(result.errors); return }

    setSubmitting(true)
    try {
      await createInvoice({
        roomId,
        billPeriodStart: periodStart,
        billPeriodEnd: periodEnd,
        dueDateOffsetDays: dueOption,
        waterPrev,
        waterCurrent: waterCurrent !== '' ? parseFloat(waterCurrent) : null,
        elecPrev,
        elecCurrent: elecCurrent !== '' ? parseFloat(elecCurrent) : null,
      })
      onSuccess?.()
      onClose()
    } catch (e) {
      setErrors({ submit: e.message || t('modal.startBill.errCreate') })
    } finally {
      setSubmitting(false)
    }
  }

  if (!room || !contract) return null

  return (
    <Modal open={open} onClose={onClose} hideClose title={`${t('modal.startBill')} — ${room.name}`}>

      {/* Bill Period */}
      <div className="text-[11px] font-semibold text-[#454745] uppercase tracking-[0.5px] mb-1.5">{t('modal.startBill.period')}</div>
      <div className="flex gap-2 mb-2">
        <div className="flex-1">
          <label className="text-[10px] text-[#454745] mb-1 block">{t('modal.startBill.startDate')}</label>
          <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} className="input-base text-[13px] py-2" />
        </div>
        <div className="flex-1">
          <label className="text-[10px] text-[#454745] mb-1 block">{t('modal.startBill.endDate')}</label>
          <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} className="input-base text-[13px] py-2" />
        </div>
      </div>
      <div className="bg-[#e8ebe6] rounded-lg px-3 py-2 mb-3 flex items-center justify-between gap-3">
        <div className="text-[12px] font-bold text-[#0e0f0c]">
          {billDays} {t('modal.startBill.daysSel')}
        </div>
        <div className="text-right">
          <div className="text-[10px] text-[#454745] uppercase tracking-wide">{t('modal.startBill.rentFee')}</div>
          <div className="text-[20px] font-bold text-[#0e0f0c] leading-tight">${rentAmt.toFixed(2)}</div>
        </div>
      </div>

      {/* Due Date */}
      <div className="text-[11px] font-semibold text-[#454745] uppercase tracking-[0.5px] mb-1.5">{t('modal.startBill.dueDate')}</div>
      <div className="flex gap-2 mb-1">
        {[7, 14, 30].map(d => (
          <button
            key={d}
            onClick={() => setDueOption(d)}
            className={`flex-1 py-2 rounded-lg border-[1.5px] text-[13px] font-semibold transition-colors ${
              dueOption === d ? 'border-[#9fe870] bg-[#e8ebe6] text-[#0e0f0c]' : 'border-[#d1d3cf] bg-white text-[#454745]'
            }`}
          >
            +{d} {t('modal.startBill.dueDays')}
          </button>
        ))}
      </div>
      <div className="text-[11px] text-[#454745] mb-3 pl-0.5">
        {t('modal.startBill.dueOn')} <span className="font-semibold">{dueDateDisplay}</span>
      </div>

      {/* Meter Readings — shown only when not auto-filled or to confirm */}
      {loadingReadings ? (
        <div className="text-center py-3 text-[12px] text-[#454745]">{t('modal.startBill.loadMeter')}</div>
      ) : (
        <>
          {/* Water — only when the tenant has Water enabled in Room Services */}
          {waterSvc && (
            <div className="bg-[#e8ebe6] rounded-lg p-3 mb-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-[13px] font-bold text-[#0e0f0c]">
                  <Droplets size={14} className="text-[#0e0f0c]" /> {t('modal.startBill.waterMeter')}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#454745]">{lastRecLabel}</span>
                  {waterLatest?.autoFilled && (
                    <span className="text-[9px] font-bold text-[#0e0f0c] bg-[#e2f6d5] px-1.5 py-0.5 rounded">{t('modal.startBill.autoFilled')}</span>
                  )}
                </div>
              </div>

              {/* Manual mode → editable inputs */}
              {!waterLatest?.autoFilled && (
                <>
                  <div className="flex gap-2 mb-2">
                    <div className="flex-1">
                      <div className="text-[10px] text-[#454745] mb-1">{t('modal.startBill.prevReading')}</div>
                      <input type="number" value={waterPrev} readOnly
                        className="w-full px-2.5 py-1.5 rounded-lg border-[1.5px] border-[#d1d3cf] text-[13px] font-bold text-right bg-[#F9F9F9]" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[10px] text-[#454745] mb-1">{t('modal.startBill.curReading')}</div>
                      <input
                        type="number"
                        value={waterCurrent}
                        placeholder={t('modal.startBill.enterRead')}
                        onChange={e => { setWaterCurrent(e.target.value); setErrors(p => ({ ...p, wc: '' })) }}
                        className={`w-full px-2.5 py-1.5 rounded-lg border-[1.5px] text-[13px] font-bold text-right outline-none bg-white focus:border-[#9fe870] ${errors.wc ? 'border-[#c13515]' : 'border-[#d1d3cf]'}`}
                      />
                    </div>
                  </div>
                  {errors.wc && <p className="text-[11px] text-[#c13515] -mt-1 mb-1">{errors.wc}</p>}
                  <div className="text-[11px] text-[#454745]">
                    {t('modal.startBill.usage')}: <b className="text-[#0e0f0c]">{waterUsage}</b> m³ × ${waterRate.toFixed(2)} =
                    <span className="font-bold text-[#0e0f0c] ml-1">${waterAmt.toFixed(2)}</span>
                  </div>
                </>
              )}

              {/* Auto-filled mode → readings + big amount on the right */}
              {waterLatest?.autoFilled && (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold text-[#0e0f0c]">
                      {t('roomDetail.prev')}: <b>{waterPrev}</b> – {t('roomDetail.now')}: <b>{(parseFloat(waterCurrent) || 0)}</b>
                    </div>
                    <div className="text-[11px] text-[#454745] mt-0.5">
                      {t('modal.startBill.usage')}: <b className="text-[#0e0f0c]">{waterUsage}</b> m³ × ${waterRate.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-[20px] font-bold text-[#0e0f0c] flex-shrink-0">${waterAmt.toFixed(2)}</div>
                </div>
              )}
            </div>
          )}

          {/* Electricity — only when the tenant has Electricity enabled in Room Services */}
          {elecSvc && (
            <div className="bg-[#e8ebe6] rounded-lg p-3 mb-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-[13px] font-bold text-[#0e0f0c]">
                  <Zap size={14} className="text-[#B8860B]" /> {t('modal.startBill.elecMeter')}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#454745]">
                    {elecLatest?.lastRecordDate
                      ? `${t('modal.startBill.last')}: ${formatFullDate(elecLatest.lastRecordDate)}`
                      : t('modal.startBill.noRecord')}
                  </span>
                  {elecLatest?.autoFilled && (
                    <span className="text-[9px] font-bold text-[#0e0f0c] bg-[#e2f6d5] px-1.5 py-0.5 rounded">{t('modal.startBill.autoFilled')}</span>
                  )}
                </div>
              </div>

              {/* Manual mode → editable inputs */}
              {!elecLatest?.autoFilled && (
                <>
                  <div className="flex gap-2 mb-2">
                    <div className="flex-1">
                      <div className="text-[10px] text-[#454745] mb-1">{t('modal.startBill.prevReading')}</div>
                      <input type="number" value={elecPrev} readOnly
                        className="w-full px-2.5 py-1.5 rounded-lg border-[1.5px] border-[#d1d3cf] text-[13px] font-bold text-right bg-[#F9F9F9]" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[10px] text-[#454745] mb-1">{t('modal.startBill.curReading')}</div>
                      <input
                        type="number"
                        value={elecCurrent}
                        placeholder={t('modal.startBill.enterRead')}
                        onChange={e => { setElecCurrent(e.target.value); setErrors(p => ({ ...p, ec: '' })) }}
                        className={`w-full px-2.5 py-1.5 rounded-lg border-[1.5px] text-[13px] font-bold text-right outline-none bg-white focus:border-[#9fe870] ${errors.ec ? 'border-[#c13515]' : 'border-[#d1d3cf]'}`}
                      />
                    </div>
                  </div>
                  {errors.ec && <p className="text-[11px] text-[#c13515] -mt-1 mb-1">{errors.ec}</p>}
                  <div className="text-[11px] text-[#454745]">
                    {t('modal.startBill.usage')}: <b className="text-[#0e0f0c]">{elecUsage}</b> kWh × ${elecRate.toFixed(2)} =
                    <span className="font-bold text-[#0e0f0c] ml-1">${elecAmt.toFixed(2)}</span>
                  </div>
                </>
              )}

              {/* Auto-filled mode → readings + big amount on the right */}
              {elecLatest?.autoFilled && (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold text-[#0e0f0c]">
                      {t('roomDetail.prev')}: <b>{elecPrev}</b> – {t('roomDetail.now')}: <b>{(parseFloat(elecCurrent) || 0)}</b>
                    </div>
                    <div className="text-[11px] text-[#454745] mt-0.5">
                      {t('modal.startBill.usage')}: <b className="text-[#0e0f0c]">{elecUsage}</b> kWh × ${elecRate.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-[20px] font-bold text-[#0e0f0c] flex-shrink-0">${elecAmt.toFixed(2)}</div>
                </div>
              )}
            </div>
          )}

          {/* Fixed Services Preview */}
          {fixedSvcs.length > 0 && (
            <>
              <div className="text-[11px] font-semibold text-[#454745] uppercase tracking-[0.5px] mt-3 mb-1.5">{t('modal.startBill.activeSvcs')}</div>
              {fixedSvcs.map(svc => (
                <div key={svc.serviceId} className="bg-[#e8ebe6] rounded-lg p-3 mb-2 flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-bold text-[#0e0f0c]">{svc.name}</div>
                    <div className="text-[11px] text-[#454745]">{t('modal.startBill.fixedPerMo')}</div>
                  </div>
                  <span className="text-[13px] font-bold text-[#0e0f0c]">${svc.effectiveRate.toFixed(2)}</span>
                </div>
              ))}
            </>
          )}
        </>
      )}

      {/* Estimated Total */}
      <div className="bg-[#e8ebe6] border border-[#e8ebe6] rounded-lg px-3.5 py-3 my-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[14px] font-bold text-[#0e0f0c]">{t('modal.startBill.estTotal')}</span>
            <div className="text-[10px] text-[#454745] mt-0.5">{periodLabel}</div>
          </div>
          <span className="text-[20px] font-bold text-[#0e0f0c]">${grandTotal.toFixed(2)}</span>
        </div>
      </div>

      {errors.submit && (
        <div className="bg-[#fdecea] rounded-xl px-4 py-2.5 text-[12px] text-[#c13515] mb-3">{errors.submit}</div>
      )}

      {/* Footer — Close on the left, Save on the right, equal width. */}
      <div className="flex gap-2">
        <button
          onClick={onClose}
          disabled={submitting}
          className="flex-1 py-3.5 bg-white border border-[#d1d3cf] text-[#0e0f0c] text-[15px] font-semibold rounded-[10px] active:bg-[#e8ebe6] hover:bg-[#e8ebe6] disabled:opacity-60 transition-colors"
        >
          {t('common.close')}
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting || loadingReadings}
          className="flex-1 py-3.5 bg-[#9fe870] text-[#0e0f0c] text-[15px] font-semibold rounded-[10px] active:opacity-85 hover:bg-[#cdffad] disabled:opacity-60 transition-colors"
        >
          {submitting ? t('modal.startBill.creating') : t('common.submit')}
        </button>
      </div>
    </Modal>
  )
}
