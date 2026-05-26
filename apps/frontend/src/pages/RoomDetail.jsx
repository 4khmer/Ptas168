import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../store'
import PageHeader from '../components/layout/PageHeader'
import Badge, { invoiceStatusVariant } from '../components/ui/Badge'
import Card, { Divider, SectionLabel } from '../components/ui/Card'
import Button from '../components/ui/Button'
import DayRing from '../components/ui/DayRing'
import EmptyState from '../components/ui/EmptyState'
import StartBillModal from '../components/modals/StartBillModal'
import AddTenantModal from '../components/modals/AddTenantModal'
import AddMeterModal from '../components/modals/AddMeterModal'
import RemoveTenantModal from '../components/modals/RemoveTenantModal'
import AddServiceModal from '../components/modals/AddServiceModal'
import RoomTelegramLink from '../components/RoomTelegramLink'
import { getDayCounter, getDaysInMonth, getDaysSinceStart, shouldShowStartBill } from '../lib/dayCounter'
import { useT, invoiceStatusLabelKey } from '../lib/i18n'
import { formatPhone } from '../lib/phone'
import { formatFullDate, formatShortDate } from '../lib/date'
import {
  Droplets, Zap, Edit2, Check, X, Plus, ChevronRight,
  Home, Box, Wifi, ParkingSquare, Brush, Shirt, Package, PawPrint,
  Sparkles, Pencil, Camera, Trash2, Image as ImageIcon,
} from 'lucide-react'

const ICON_MAP = { Droplets, Zap, ParkingSquare, Wifi, Brush, Shirt, Package, PawPrint, Box, Home }

function ServiceIcon({ name, size = 15 }) {
  const Icon = ICON_MAP[name] || Box
  return <Icon size={size} />
}

const TAB_KEYS = ['tenant', 'meter', 'billing', 'assets']
const TAB_LABEL_KEYS = ['roomDetail.tabs.tenant', 'roomDetail.tabs.meter', 'roomDetail.tabs.billing', 'roomDetail.tabs.assets']

export default function RoomDetail() {
  const { id: roomId } = useParams()
  const navigate = useNavigate()
  const t = useT()
  const {
    getRoomWithStatus, getRoomServices, getMeterReadings, getLastMeterReading,
    getInvoicesByRoom, updateContract, removeTenantFromRoom, addMeterReading,
    setRoomServices, loadRoomData, loadRoomInvoices, loading, updateRoom,
  } = useStore()

  // Tab state lives in the URL (`?tab=billing`) so going back from /invoice/:id
  // (browser back) restores whichever tab the user was on. Default = first tab.
  const [searchParams, setSearchParams] = useSearchParams()
  const tabKey = searchParams.get('tab')
  const tabIdx = TAB_KEYS.indexOf(tabKey)
  const tab    = tabIdx >= 0 ? tabIdx : 0
  function setTab(i) {
    const next = new URLSearchParams(searchParams)
    if (i === 0) next.delete('tab')
    else         next.set('tab', TAB_KEYS[i])
    setSearchParams(next, { replace: true })
  }
  const [startBillOpen, setStartBillOpen] = useState(false)
  const [addTenantOpen, setAddTenantOpen] = useState(false)
  const [addMeterOpen, setAddMeterOpen] = useState(false)
  const [removeTenantOpen, setRemoveTenantOpen] = useState(false)
  const [addServiceOpen, setAddServiceOpen] = useState(false)
  const [billFilter, setBillFilter] = useState('all')
  const [editField, setEditField] = useState(null)
  const [editVal, setEditVal] = useState('')

  const today = new Date()
  const dayCounter  = getDayCounter(today)
  const daysInMonth = getDaysInMonth(today)

  useEffect(() => {
    loadRoomData(roomId)
    loadRoomInvoices(roomId)
  }, [roomId]) // eslint-disable-line

  const info = getRoomWithStatus(roomId)
  if (!info) return <div className="app-shell"><div className="p-4 text-[#454745]">{t('roomDetail.notFound')}</div></div>

  const { room, contract, tenant, floor, building, occupied } = info
  const roomSvcs     = getRoomServices(roomId)
  const meterReadings = getMeterReadings(roomId)
  const lastReading  = getLastMeterReading(roomId)
  const invoices     = getInvoicesByRoom(roomId)

  const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const hasActiveThisMonth = invoices.some(inv =>
    inv.periodStart?.slice(0, 7) === thisMonth && (inv.status === 'progress' || inv.status === 'overdue')
  )
  // Start Bill unlocks in the last 7 days of the contract's 30-day
  // anniversary cycle. Mirrors the backend's canStartBill so both sides
  // agree (was previously calendar-day-of-month, which never lined up
  // for tenants who moved in mid-month).
  const cycle = contract?.startDate ? getDaysSinceStart(contract.startDate, today) : null
  const dayWindowOpen = cycle ? shouldShowStartBill(cycle.day, cycle.daysInCycle) : false
  const showStartBill = dayWindowOpen && (room.canStartBill || (occupied && !hasActiveThisMonth))

  const filteredInvoices = billFilter === 'all' ? invoices : invoices.filter(i => i.status === billFilter)

  function startEdit(field, val) { setEditField(field); setEditVal(String(val ?? '')) }

  async function saveEdit() {
    if (!contract) return
    const update = {}
    if (editField === 'baseRent')        update.baseRent        = parseFloat(editVal) || 0
    if (editField === 'securityDeposit') update.securityDeposit = parseFloat(editVal) || 0
    if (editField === 'startDate')       update.startDate       = editVal
    if (editField === 'endDate')         update.endDate         = editVal || null
    try { await updateContract(contract.id, update) } catch (_) {}
    setEditField(null)
  }

  function fmtDate(d) {
    if (!d) return t('roomDetail.endDateOpen')
    return formatFullDate(d)
  }

  // Status tabs mirror the Billing tab — same five filters, same
  // inline "<label> <count>" shape so the two surfaces stay coherent.
  const BILL_TABS = [
    { key: 'all',       label: t('roomDetail.bills.all'),       count: invoices.length },
    { key: 'progress',  label: t('roomDetail.bills.progress'),  count: invoices.filter(i => i.status === 'progress').length },
    { key: 'paid',      label: t('roomDetail.bills.paid'),      count: invoices.filter(i => i.status === 'paid').length },
    { key: 'overdue',   label: t('roomDetail.bills.overdue'),   count: invoices.filter(i => i.status === 'overdue').length },
    { key: 'cancelled', label: t('roomDetail.bills.cancelled'), count: invoices.filter(i => i.status === 'cancelled').length },
  ]

  const isLoadingRoom = loading[`room_${roomId}`]

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden bg-[#e8ebe6]">
      <PageHeader
        title={room.name}
        rightSlot={<Badge variant={occupied ? 'green' : 'grey'}>{occupied ? t('status.occupied') : t('status.vacant')}</Badge>}
      />

      <div className="flex-shrink-0 flex bg-white border-b border-[#d1d3cf] overflow-x-auto scrollbar-hide px-4">
        {TAB_LABEL_KEYS.map((labelKey, i) => (
          <button
            key={labelKey}
            onClick={() => setTab(i)}
            className={`px-4 py-3 text-[13px] font-bold border-b-2 -mb-px whitespace-nowrap flex-shrink-0 transition-colors ${
              tab === i ? 'text-[#0e0f0c] border-[#9fe870]' : 'text-[#454745] border-transparent'
            }`}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 tab-list-scroll scrollbar-hide">
        <div className="detail-list-scroll-content space-y-3">

        {isLoadingRoom && (
          <div className="text-center py-4 text-[13px] text-[#454745]">{t('roomDetail.loadingRoom')}</div>
        )}

        {/* ─── TAB 0: TENANT ─────────────────────────────────── */}
        {tab === 0 && (
          <>
            <SectionLabel>{t('roomDetail.tenant.heading')}</SectionLabel>

            {occupied && tenant ? (
              <>
                <Card onClick={() => navigate(`/tenant/${tenant.id}`)} className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-[#e8ebe6] flex items-center justify-center text-[#0e0f0c] font-bold text-[24px] flex-shrink-0 border border-[#d1d3cf]">
                    {tenant.name?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-bold text-[#0e0f0c] truncate">{tenant.name}</div>
                    <div className="text-[13px] text-[#454745] mt-0.5">{formatPhone(tenant.phone)}</div>
                    <div className="text-[11px] text-[#0e0f0c] font-semibold mt-0.5">{t('roomDetail.tenant.tapEdit')}</div>
                  </div>
                  <ChevronRight size={18} className="text-[#868685]" />
                </Card>

                <Button variant="danger" onClick={() => setRemoveTenantOpen(true)}>{t('roomDetail.tenant.remove')}</Button>

                <SectionLabel>{t('roomDetail.services')}</SectionLabel>
                <Card padding={false}>
                  {roomSvcs.length === 0 ? (
                    <div className="py-4 text-center text-[13px] text-[#454745]">{t('roomDetail.svcEmpty')}</div>
                  ) : (
                    roomSvcs.map((svc, i) => (
                      <div key={svc.serviceId}>
                        <div className="flex items-center justify-between px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${svc.type === 'utility' ? 'bg-[#e8ebe6] text-[#0e0f0c]' : 'bg-[#e8ebe6] text-[#454745]'}`}>
                              <ServiceIcon name={svc.icon} />
                            </div>
                            <div>
                              <div className="text-[14px] font-bold text-[#0e0f0c]">{svc.name}</div>
                              <div className="text-[11px] text-[#454745]">{svc.type === 'utility' ? t('roomDetail.svcUtility') : t('roomDetail.svcFixed')}</div>
                            </div>
                          </div>
                          <div className="text-[13px] font-bold text-[#0e0f0c]">
                            ${svc.effectiveRate}{svc.unitLabel?.replace('$', '')}
                            {svc.priceOverride != null && (
                              <span className="text-[10px] font-bold text-[#8A6408] bg-[#FFF3DF] ml-1 px-1 py-0.5 rounded">{t('roomDetail.svcOverride')}</span>
                            )}
                          </div>
                        </div>
                        {i < roomSvcs.length - 1 && <Divider />}
                      </div>
                    ))
                  )}
                </Card>
                <Button variant="outline" onClick={() => setAddServiceOpen(true)}>
                  <Plus size={14} /> {t('roomDetail.svcAddEdit')}
                </Button>

                <SectionLabel>{t('roomDetail.contract')}</SectionLabel>
                {!contract && (
                  <Card><div className="text-center py-3 text-[13px] text-[#454745]">{t('roomDetail.loadingContract')}</div></Card>
                )}
                {contract && (
                <Card padding={false}>
                  {[
                    { label: t('roomDetail.startDate'),       field: 'startDate',       type: 'date',   val: contract.startDate,       display: fmtDate(contract.startDate) },
                    { label: t('roomDetail.endDate'),         field: 'endDate',         type: 'date',   val: contract.endDate,         display: fmtDate(contract.endDate) },
                    { label: t('roomDetail.baseRent'),        field: 'baseRent',        type: 'number', val: contract.baseRent,        display: `$${(contract.baseRent||0).toFixed(2)}/mo` },
                    { label: t('roomDetail.securityDeposit'), field: 'securityDeposit', type: 'number', val: contract.securityDeposit, display: `$${(contract.securityDeposit||0).toFixed(2)}` },
                  ].map((row, i, arr) => (
                    <div key={row.field}>
                      <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-[13px] text-[#454745]">{row.label}</span>
                        {editField === row.field ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type={row.type}
                              className="input-base py-1 text-[13px] w-36 text-right"
                              value={editVal}
                              onChange={e => setEditVal(e.target.value)}
                              autoFocus
                            />
                            <button onClick={saveEdit} className="text-[#0e0f0c]"><Check size={14} /></button>
                            <button onClick={() => setEditField(null)} className="text-[#454745]"><X size={14} /></button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(row.field, row.val)}
                            className="flex items-center gap-1.5 text-[13px] font-bold text-[#0e0f0c]"
                          >
                            {row.display}
                            <Edit2 size={12} className="text-[#868685]" />
                          </button>
                        )}
                      </div>
                      {i < arr.length - 1 && <Divider />}
                    </div>
                  ))}
                </Card>
                )}
              </>
            ) : (
              <>
                <Card>
                  <EmptyState
                    icon={<Home size={38} />}
                    title={t('roomDetail.noTenant.title')}
                    subtitle={t('roomDetail.noTenant.sub')}
                  />
                </Card>
                <Button onClick={() => setAddTenantOpen(true)}>
                  <Plus size={14} /> {t('roomDetail.addTenant')}
                </Button>
              </>
            )}

            <RoomTelegramLink roomId={roomId} />
          </>
        )}

        {/* ─── TAB 1: METER ──────────────────────────────────── */}
        {tab === 1 && (
          <>
            <MeterModeSettings room={room} updateRoom={updateRoom} t={t} />

            <div className="flex items-center justify-between">
              <SectionLabel className="mb-0">{t('roomDetail.meterRecords')}</SectionLabel>
              <Button variant="primary" size="sm" fullWidth={false} onClick={() => setAddMeterOpen(true)}>
                <Plus size={13} /> {t('roomDetail.newRecord')}
              </Button>
            </div>

            {meterReadings.length === 0 ? (
              <Card>
                <EmptyState icon={<Droplets size={32} />} title={t('roomDetail.noMeter.title')} subtitle={t('roomDetail.noMeter.sub')} />
              </Card>
            ) : (
              <Card padding={false}>
                {meterReadings.map((reading, ri) => {
                  const waterUsage = (reading.waterCurrent ?? 0) - (reading.waterPrev ?? 0)
                  const elecUsage  = (reading.elecCurrent  ?? 0) - (reading.elecPrev  ?? 0)
                  const isLatest   = ri === 0
                  return (
                    <div key={reading.id || ri}>
                      <div className="px-4 py-2 bg-[#e8ebe6] text-[11px] font-bold text-[#454745]">
                        {formatFullDate(reading.date)} · {reading.recorder}
                        {isLatest && <span className="ml-2 text-[10px] bg-[#E8F6EF] text-[#1F6F4E] px-1.5 py-0.5 rounded-full font-bold">{t('status.latest')}</span>}
                      </div>
                      {/* Water */}
                      {reading.waterCurrent != null && (
                        <div className="flex items-center justify-between px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[#e8ebe6] flex items-center justify-center">
                              <Droplets size={14} className="text-[#0e0f0c]" />
                            </div>
                            <span className="text-[13px] font-bold">{t('roomDetail.water')}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="text-center bg-[#e8ebe6] rounded-lg px-2 py-1">
                              <div className="text-[9px] text-[#454745]">{t('roomDetail.prev')}</div>
                              <div className="text-[12px] font-bold">{reading.waterPrev}</div>
                            </div>
                            <span className="text-[10px] text-[#454745]">→</span>
                            <div className="text-center bg-[#e8ebe6] rounded-lg px-2 py-1">
                              <div className="text-[9px] text-[#454745]">{t('roomDetail.now')}</div>
                              <div className="text-[12px] font-bold">{reading.waterCurrent}</div>
                            </div>
                            <div className="text-center bg-[#e8ebe6] rounded-lg px-2 py-1">
                              <div className="text-[9px] text-[#454745]">{t('roomDetail.use')}</div>
                              <div className="text-[12px] font-bold text-[#0e0f0c]">+{waterUsage}</div>
                            </div>
                          </div>
                        </div>
                      )}
                      {/* Electricity */}
                      {reading.elecCurrent != null && (
                        <div className="flex items-center justify-between px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[#FFF3DF] flex items-center justify-center">
                              <Zap size={14} className="text-[#8A6408]" />
                            </div>
                            <span className="text-[13px] font-bold">{t('roomDetail.electricity')}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="text-center bg-[#e8ebe6] rounded-lg px-2 py-1">
                              <div className="text-[9px] text-[#454745]">{t('roomDetail.prev')}</div>
                              <div className="text-[12px] font-bold">{reading.elecPrev}</div>
                            </div>
                            <span className="text-[10px] text-[#454745]">→</span>
                            <div className="text-center bg-[#e8ebe6] rounded-lg px-2 py-1">
                              <div className="text-[9px] text-[#454745]">{t('roomDetail.now')}</div>
                              <div className="text-[12px] font-bold">{reading.elecCurrent}</div>
                            </div>
                            <div className="text-center bg-[#e8ebe6] rounded-lg px-2 py-1">
                              <div className="text-[9px] text-[#454745]">{t('roomDetail.use')}</div>
                              <div className="text-[12px] font-bold text-[#0e0f0c]">+{elecUsage}</div>
                            </div>
                          </div>
                        </div>
                      )}
                      {ri < meterReadings.length - 1 && <Divider />}
                    </div>
                  )
                })}
              </Card>
            )}
          </>
        )}

        {/* ─── TAB 2: BILLING ────────────────────────────────── */}
        {tab === 2 && (
          <>
            {occupied && (
              <>
                <SectionLabel>{t('roomDetail.currentPeriod')}</SectionLabel>
                {/* White Wise card on the sage canvas — surface contrast
                    against the page background carries the elevation. */}
                <Card>
                  <div className="flex items-center gap-1.5 text-[12px] text-[#0e0f0c] font-semibold mb-1">
                    <span>{formatShortDate(new Date())} · {t('roomDetail.day')} {room.dayCounter || dayCounter}/{room.daysInMonth || daysInMonth}</span>
                  </div>
                  {hasActiveThisMonth && (
                    <div className="text-[12px] text-[#454745] mb-3">
                      {t('roomDetail.haveInvoice')}
                    </div>
                  )}
                  {showStartBill && (
                    <Button onClick={() => setStartBillOpen(true)}>
                      <Zap size={14} /> {t('rooms.startBill')}
                    </Button>
                  )}
                </Card>
              </>
            )}

            {/* Same horizontal status tabs as the Billing tab: label
                with the count inline on the right, active underline +
                brand-pink text. Keeps the scan rhythm consistent across
                the two surfaces. */}
            <div className="flex border-b border-[#d1d3cf] -mx-4 px-4 overflow-x-auto scrollbar-hide">
              {BILL_TABS.map(bt => (
                <button
                  key={bt.key}
                  onClick={() => setBillFilter(bt.key)}
                  className={`flex-shrink-0 px-3 py-2.5 text-[12px] font-bold border-b-2 -mb-px transition-colors ${
                    billFilter === bt.key ? 'text-[#0e0f0c] border-[#9fe870]' : 'text-[#454745] border-transparent'
                  }`}
                >
                  {bt.label}
                  <span className={`ml-1.5 text-[11px] ${billFilter === bt.key ? 'text-[#0e0f0c]' : 'text-[#868685]'}`}>
                    {bt.count}
                  </span>
                </button>
              ))}
            </div>

            {filteredInvoices.length === 0 ? (
              <div className="text-center py-6 text-[13px] text-[#454745]">{t('roomDetail.noInvoices')}</div>
            ) : (
              <Card padding={false}>
                {filteredInvoices.map((inv, i) => (
                  <div key={inv.id}>
                    {/* Row layout mirrors the Billing tab so users get the
                        same scan rhythm: <Room — Period> / <Tenant · Due>
                        / <Invoice no.> on the left; <amount> + <status
                        badge> on the right. The room prefix is kept even
                        inside the room scope so the visual matches 1:1. */}
                    <div
                      className="flex items-center justify-between px-4 py-3.5 cursor-pointer active:opacity-80"
                      onClick={() => navigate(`/invoice/${inv.id}?from=${encodeURIComponent(`/room/${roomId}?tab=billing`)}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-bold text-[#0e0f0c]">
                          {room.name} — {formatShortDate(inv.periodStart)}
                        </div>
                        {(inv.tenantSnapshot?.name || inv.dueDate) && (
                          <div className="text-[11px] text-[#454745] mt-0.5 truncate">
                            {inv.tenantSnapshot?.name && <span>{inv.tenantSnapshot.name}</span>}
                            {inv.tenantSnapshot?.name && inv.dueDate && <span> · </span>}
                            {inv.dueDate && <span>{t('billing.due')} {formatFullDate(inv.dueDate)}</span>}
                          </div>
                        )}
                        <div className="text-[11px] text-[#454745]">{inv.invoiceNumber || inv.id}</div>
                      </div>
                      <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                        <div className="text-right">
                          <div className="text-[14px] font-bold text-[#0e0f0c]">${inv.total?.toFixed(2)}</div>
                          <Badge variant={invoiceStatusVariant(inv.status)}>{t(invoiceStatusLabelKey(inv.status) || 'status.progress')}</Badge>
                        </div>
                        <ChevronRight size={16} className="text-[#868685]" />
                      </div>
                    </div>
                    {i < filteredInvoices.length - 1 && <Divider className="mx-4" />}
                  </div>
                ))}
              </Card>
            )}
          </>
        )}

        {/* ─── TAB 3: ASSETS ─────────────────────────────────── */}
        {tab === 3 && (
          <RoomAssets room={room} updateRoom={updateRoom} t={t} />
        )}
        </div>
      </div>

      <StartBillModal open={startBillOpen} onClose={() => setStartBillOpen(false)} roomId={roomId}
        onSuccess={() => { setStartBillOpen(false); loadRoomInvoices(roomId) }} />
      <AddTenantModal open={addTenantOpen} onClose={() => { setAddTenantOpen(false); loadRoomData(roomId) }}
        roomId={roomId} roomName={room.name} roomPrice={room.price} />
      <AddMeterModal open={addMeterOpen} onClose={() => setAddMeterOpen(false)} lastReading={lastReading}
        services={roomSvcs}
        onConfirm={async data => { await addMeterReading(roomId, data) }} />
      <RemoveTenantModal open={removeTenantOpen} onClose={() => setRemoveTenantOpen(false)}
        tenantName={tenant?.name || ''} roomName={room.name}
        onConfirm={async () => { if (contract) await removeTenantFromRoom(contract.id) }} />
      <AddServiceModal open={addServiceOpen} onClose={() => setAddServiceOpen(false)} roomId={roomId}
        onSave={async svcs => { await setRoomServices(roomId, svcs) }} />
    </div>
  )
}

// ── Meter reading mode settings ──────────────────────────────────────────────
// Two options that control how Start Bill behaves:
//   • manual — prev auto-fills from the last record, user enters current
//   • auto   — both prev + current auto-fill, user issues bill with no input
function MeterModeSettings({ room, updateRoom, t }) {
  const mode = room.meterReadingMode === 'auto' ? 'auto' : 'manual'
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function setMode(next) {
    if (next === mode) return
    setSaving(true)
    setError('')
    try {
      await updateRoom(room.id, { meterReadingMode: next })
    } catch (e) {
      setError(e.message || t('svcFees.errSave'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <SectionLabel className="mb-2">{t('roomDetail.meterMode')}</SectionLabel>
      <div className="space-y-2">
        <ModeOption
          active={mode === 'manual'}
          onClick={() => setMode('manual')}
          disabled={saving}
          icon={<Pencil size={16} />}
          title={t('roomDetail.meterModeManualTitle')}
          description={t('roomDetail.meterModeManualDesc')}
        />
        <ModeOption
          active={mode === 'auto'}
          onClick={() => setMode('auto')}
          disabled={saving}
          icon={<Sparkles size={16} />}
          title={t('roomDetail.meterModeAutoTitle')}
          description={t('roomDetail.meterModeAutoDesc')}
        />
      </div>
      {error && (
        <div className="mt-2 text-[12px] text-[#c13515]">{error}</div>
      )}
    </div>
  )
}

function ModeOption({ active, onClick, disabled, icon, title, description }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl border-[1.5px] text-left transition-colors ${
        active
          ? 'border-[#9fe870] bg-[#e2f6d5]'
          : 'border-[#d1d3cf] bg-white hover:border-[#0e0f0c]'
      } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
        active ? 'bg-[#9fe870] text-[#0e0f0c]' : 'bg-[#e8ebe6] text-[#454745]'
      }`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-[13px] font-bold ${active ? 'text-[#0e0f0c]' : 'text-[#0e0f0c]'}`}>{title}</span>
          {active && <Check size={14} className="text-[#0e0f0c] flex-shrink-0" />}
        </div>
        <div className="text-[11px] text-[#454745] leading-snug mt-0.5">{description}</div>
      </div>
    </button>
  )
}

// ── Room Assets tab ──────────────────────────────────────────────────────────
// Owner can list assets in the room (furniture, appliances, etc.). Each asset
// has a name, optional notes, and an optional photo. Stored as a JSON column
// on Room. New asset creation is inline; clicking an existing asset opens an
// edit modal.
function RoomAssets({ room, updateRoom, t }) {
  const assets = room.assets || []
  const [editing, setEditing] = useState(null) // null | 'new' | asset object
  const [error, setError] = useState('')

  async function persist(next) {
    setError('')
    try {
      await updateRoom(room.id, { assets: next })
    } catch (e) {
      setError(e.message || t('svcFees.errSave'))
      throw e
    }
  }

  async function handleSave(asset) {
    const exists = assets.some(a => a.id === asset.id)
    const next = exists
      ? assets.map(a => a.id === asset.id ? asset : a)
      : [...assets, asset]
    await persist(next)
    setEditing(null)
  }

  async function handleDelete(id) {
    await persist(assets.filter(a => a.id !== id))
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <SectionLabel className="mb-0">{t('roomDetail.assets')} {assets.length > 0 && <span className="text-[#868685]">({assets.length})</span>}</SectionLabel>
        <Button variant="primary" size="sm" fullWidth={false} onClick={() => setEditing('new')}>
          <Plus size={13} /> {t('roomDetail.newAsset')}
        </Button>
      </div>

      {error && (
        <div className="bg-[#fdecea] rounded-xl p-3 text-[13px] text-[#c13515]">{error}</div>
      )}

      {assets.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Box size={32} />}
            title={t('roomDetail.noAssets.title')}
            subtitle={t('roomDetail.noAssets.sub')}
          />
        </Card>
      ) : (
        <Card padding={false}>
          {assets.map((a, i) => (
            <div key={a.id}>
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#e8ebe6] transition-colors"
                onClick={() => setEditing(a)}
              >
                {a.photoUrl ? (
                  <img src={a.photoUrl} alt={a.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-[#d1d3cf]" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-[#e8ebe6] flex items-center justify-center flex-shrink-0 border border-[#d1d3cf]">
                    <ImageIcon size={18} className="text-[#868685]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold text-[#0e0f0c] truncate">{a.name}</div>
                  {a.notes && <div className="text-[11px] text-[#454745] truncate mt-0.5">{a.notes}</div>}
                  {a.addedAt && (
                    <div className="text-[10px] text-[#454745] mt-0.5">
                      {t('roomDetail.added')} {formatFullDate(a.addedAt)}
                    </div>
                  )}
                </div>
                <ChevronRight size={16} className="text-[#868685] flex-shrink-0" />
              </div>
              {i < assets.length - 1 && <Divider />}
            </div>
          ))}
        </Card>
      )}

      {editing && (
        <AssetEditor
          t={t}
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={handleSave}
          onDelete={editing !== 'new' ? () => handleDelete(editing.id) : null}
        />
      )}
    </>
  )
}

function AssetEditor({ t, initial, onClose, onSave, onDelete }) {
  const [name, setName] = useState(initial?.name || '')
  const [notes, setNotes] = useState(initial?.notes || '')
  const [photoUrl, setPhotoUrl] = useState(initial?.photoUrl || null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)
  const isEdit = !!initial

  async function pickPhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    if (file.size > 5 * 1024 * 1024) {
      setError(t('roomDetail.errImage5MB'))
      return
    }
    setError('')
    const reader = new FileReader()
    reader.onload = ev => setPhotoUrl(ev.target.result)
    reader.readAsDataURL(file)
  }

  async function handleSubmit() {
    if (!name.trim()) { setError(t('roomDetail.errNameReq')); return }
    setSaving(true)
    try {
      await onSave({
        id: initial?.id || ((typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
        name: name.trim(),
        notes: notes.trim() || null,
        photoUrl: photoUrl || null,
        addedAt: initial?.addedAt || new Date().toISOString(),
      })
    } catch { /* error already shown by parent */ } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!onDelete) return
    setSaving(true)
    try { await onDelete(); onClose() } catch { setSaving(false) }
  }

  // Reuse the existing Modal — imported at top of file via Card/Button…
  // (we'll lean on the bottom-sheet Modal already used elsewhere)
  return (
    <ModalShell open onClose={onClose} title={isEdit ? t('roomDetail.editAsset') : t('roomDetail.newAsset')}>
      <div className="space-y-3">
        {/* Photo */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-20 h-20 rounded-xl overflow-hidden border border-[#d1d3cf] bg-[#e8ebe6] flex items-center justify-center">
              {photoUrl ? (
                <img src={photoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon size={28} className="text-[#868685]" />
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#0e0f0c] hover:bg-[#0e0f0c] text-white flex items-center justify-center border-2 border-white"
              aria-label="Upload photo"
            >
              <Camera size={12} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickPhoto} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-[#454745]">{t('roomDetail.photo')}</div>
            <div className="text-[11px] text-[#454745]">{t('roomDetail.photoHelp')}</div>
            {photoUrl && (
              <button
                type="button"
                onClick={() => setPhotoUrl(null)}
                className="text-[11px] font-semibold text-[#c13515] mt-1.5"
              >
                {t('roomDetail.removePhoto')}
              </button>
            )}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="text-[12px] font-semibold text-[#454745] mb-1 block">{t('roomDetail.assetName')}</label>
          <input
            className={`input-base ${error && !name.trim() ? 'border-[#c13515]' : ''}`}
            placeholder={t('roomDetail.assetNamePh')}
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
        </div>

        {/* Notes */}
        <div>
          <label className="text-[12px] font-semibold text-[#454745] mb-1 block">{t('roomDetail.notes')}</label>
          <textarea
            className="input-base resize-none"
            rows={3}
            placeholder={t('roomDetail.notesPh')}
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        {error && (
          <div className="bg-[#fdecea] rounded-xl px-3 py-2 text-[12px] text-[#c13515]">{error}</div>
        )}

        <div className="flex gap-2">
          {onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="px-3 py-2.5 rounded-8 bg-[#fdecea] hover:bg-[#f9d6d2] text-[#c13515] text-[14px] font-semibold flex items-center gap-1.5 disabled:opacity-50"
            >
              <Trash2 size={14} /> {t('common.delete')}
            </button>
          )}
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? t('common.saving') : isEdit ? t('common.saveChanges') : t('roomDetail.addAsset')}
          </Button>
        </div>
      </div>
    </ModalShell>
  )
}

// Lightweight modal shell — reuses the same overlay/sheet styling as Modal.jsx
// without depending on its lifecycle (avoids extra imports + close-on-Escape isolation).
function ModalShell({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="modal-overlay fade-in" onClick={onClose}>
      <div className="modal-sheet slide-up w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-4 pb-1">
          <div className="w-8 h-1 bg-[#d1d3cf] rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-3 md:hidden" />
          <div />
          <button onClick={onClose} aria-label="Close" className="icon-btn w-8 h-8">
            <X size={14} />
          </button>
        </div>
        <div className="px-5 pb-8">
          {title && <h2 className="text-[20px] font-semibold text-[#0e0f0c] tracking-tight2 mb-4">{title}</h2>}
          {children}
        </div>
      </div>
    </div>
  )
}
