import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, SlidersHorizontal, X, ArrowDownAZ } from 'lucide-react'
import { useStore } from '../store'
import SearchBar from '../components/ui/SearchBar'
import Badge from '../components/ui/Badge'
import DayRing from '../components/ui/DayRing'
import StartBillModal from '../components/modals/StartBillModal'
import { getDaysSinceStart, shouldShowStartBill } from '../lib/dayCounter'
import { useT } from '../lib/i18n'

const ROOM_NAME_COLLATOR = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

export default function Rooms() {
  const navigate = useNavigate()
  const t = useT()
  const { rooms, buildings, floors, getAllRoomsWithStatus, loadInitialData, loading } = useStore()

  const [search, setSearch] = useState('')
  const [filterBuilding, setFilterBuilding] = useState('all')
  const [filterFloor, setFilterFloor] = useState('all')
  const [sortOrder, setSortOrder] = useState('az')
  const [filterOpen, setFilterOpen] = useState(false)
  const [startBillRoomId, setStartBillRoomId] = useState(null)

  const hasLocationFilter = filterBuilding !== 'all' || filterFloor !== 'all'
  const hasSortFilter = sortOrder !== 'az'
  const hasFilter = hasLocationFilter || hasSortFilter
  function clearFilters() {
    setFilterBuilding('all')
    setFilterFloor('all')
    setSortOrder('az')
  }

  // Reload rooms to get fresh canStartBill / occupancy status
  useEffect(() => {
    if (rooms.length === 0) loadInitialData()
  }, []) // eslint-disable-line

  const today = new Date()

  const allRooms = getAllRoomsWithStatus()

  const allFloors = useMemo(() => {
    if (filterBuilding === 'all') return floors
    return floors.filter(f => f.buildingId === filterBuilding)
  }, [filterBuilding, floors])

  const filtered = useMemo(() => {
    const direction = sortOrder === 'za' ? -1 : 1
    return allRooms.filter(({ room, tenant }) => {
      if (filterBuilding !== 'all' && room.buildingId !== filterBuilding) return false
      if (filterFloor   !== 'all' && room.floorId    !== filterFloor)    return false
      if (search) {
        const q = search.toLowerCase()
        if (!room.name.toLowerCase().includes(q) && !tenant?.name?.toLowerCase().includes(q)) return false
      }
      return true
    }).sort((a, b) => {
      const byRoom = ROOM_NAME_COLLATOR.compare(a.room?.name || '', b.room?.name || '')
      if (byRoom) return byRoom * direction
      const byFloor = ROOM_NAME_COLLATOR.compare(a.floor?.name || '', b.floor?.name || '')
      if (byFloor) return byFloor * direction
      return ROOM_NAME_COLLATOR.compare(a.building?.name || '', b.building?.name || '') * direction
    })
  }, [allRooms, filterBuilding, filterFloor, search, sortOrder])

  const isLoading = loading.init || loading.rooms

  return (
    <>
      {/* Header stays fixed; only the room list below can scroll. */}
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-shrink-0 bg-white">
          <div className="px-4 pt-2 pb-1 text-center md:text-left">
            <h1 className="text-[22px] font-bold text-[#0e0f0c]">{t('rooms.title')}</h1>
          </div>

          <div className="px-4 pb-3">
            <SearchBar
              placeholder={t('rooms.searchPlaceholder')}
              value={search}
              onChange={setSearch}
              rightSlot={
                <button
                  type="button"
                  onClick={() => setFilterOpen(v => !v)}
                  aria-label={t('common.filter')}
                  className={`relative w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                    hasFilter
                      ? 'bg-[#9fe870] text-[#0e0f0c]'
                      : 'bg-[#e8ebe6] hover:bg-[#dde0db] text-[#0e0f0c]'
                  }`}
                >
                  <SlidersHorizontal size={15} />
                  {hasFilter && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-white text-[#0e0f0c] rounded-full text-[8px] font-bold flex items-center justify-center border border-[#9fe870]">
                      {(filterBuilding !== 'all' ? 1 : 0) + (filterFloor !== 'all' ? 1 : 0) + (hasSortFilter ? 1 : 0)}
                    </span>
                  )}
                </button>
              }
            />
          </div>

          {filterOpen && (
            <div className="px-4 pb-3 border-b border-[#d1d3cf]">
              <div className="bg-[#e8ebe6] rounded-xl p-3 space-y-2.5">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] font-bold text-[#454745] uppercase tracking-wide">{t('rooms.filterByLocation')}</span>
                  {hasFilter && (
                    <button onClick={clearFilters} className="flex items-center gap-1 text-[11px] font-semibold text-[#0e0f0c]">
                      <X size={11} /> {t('common.clear')}
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <select
                      value={filterBuilding}
                      onChange={e => { setFilterBuilding(e.target.value); setFilterFloor('all') }}
                      className="w-full pl-3 pr-8 py-2 rounded-[10px] border border-[#d1d3cf] text-[13px] font-semibold text-[#0e0f0c] bg-white appearance-none cursor-pointer outline-none"
                    >
                      <option value="all">{t('rooms.allBuildings')}</option>
                      {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#454745] pointer-events-none">▾</span>
                  </div>
                  <div className="flex-1 relative">
                    <select
                      value={filterFloor}
                      onChange={e => setFilterFloor(e.target.value)}
                      className="w-full pl-3 pr-8 py-2 rounded-[10px] border border-[#d1d3cf] text-[13px] font-semibold text-[#0e0f0c] bg-white appearance-none cursor-pointer outline-none"
                    >
                      <option value="all">{t('rooms.allFloors')}</option>
                      {allFloors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#454745] pointer-events-none">▾</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#454745] uppercase tracking-wide mb-1.5">
                    <ArrowDownAZ size={12} />
                    {t('rooms.sortList')}
                  </div>
                  <div className="relative">
                    <select
                      value={sortOrder}
                      onChange={e => setSortOrder(e.target.value)}
                      className="w-full pl-3 pr-8 py-2 rounded-[10px] border border-[#d1d3cf] text-[13px] font-semibold text-[#0e0f0c] bg-white appearance-none cursor-pointer outline-none"
                    >
                      <option value="az">{t('rooms.sortAZ')}</option>
                      <option value="za">{t('rooms.sortZA')}</option>
                    </select>
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#454745] pointer-events-none">▾</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 room-list-scroll scrollbar-hide">
          <div className="room-list-scroll-content space-y-2.5">
            {isLoading && rooms.length === 0 && (
              <div className="text-center py-12 text-[#454745] text-[14px]">{t('common.loading')}</div>
            )}

            {filtered.map(({ room, tenant, contract, occupied }) => {
              const cycle = occupied ? getDaysSinceStart(contract?.startDate, today) : null
              return (
              <div
                key={room.id}
                className="bg-white rounded-xl border border-[#d1d3cf] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 cursor-pointer" onClick={() => navigate(`/room/${room.id}`)}>
                    <div className="text-[15px] font-bold text-[#0e0f0c]">{room.name}</div>
                    {occupied
                      ? <div className="text-[13px] text-[#454745] mt-0.5">{tenant?.name}</div>
                      : <Badge variant="grey" className="mt-1">{t('status.vacant')}</Badge>
                    }
                  </div>
                  {occupied && cycle && (
                    <DayRing day={cycle.day} daysInMonth={cycle.daysInCycle} />
                  )}
                </div>

                {/* Show only in the last 7 days of the cycle (anchored on
                    contract start-date anniversary). Backend's canStartBill
                    still gates against duplicate-bill-this-period. */}
                {room.canStartBill && cycle && shouldShowStartBill(cycle.day, cycle.daysInCycle) && (
                  <button
                    className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 bg-[#9fe870] text-[#0e0f0c] text-[13px] font-semibold rounded-[10px] active:opacity-80"
                    onClick={() => setStartBillRoomId(room.id)}
                  >
                    <Zap size={14} /> {t('rooms.startBill')}
                  </button>
                )}
              </div>
            )})}

            {!isLoading && filtered.length === 0 && (
              <div className="text-center py-12 text-[#454745] text-[14px]">{t('rooms.notFound')}</div>
            )}
          </div>
        </div>
      </div>

      {startBillRoomId && (
        <StartBillModal
          open={!!startBillRoomId}
          onClose={() => setStartBillRoomId(null)}
          roomId={startBillRoomId}
          onSuccess={() => setStartBillRoomId(null)}
        />
      )}
    </>
  )
}
