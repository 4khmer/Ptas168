import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import PageHeader from '../components/layout/PageHeader'
import Card, { Divider } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { BuildingModal, FloorModal, RoomModal } from '../components/modals/PropertyModals'
import { Plus, Edit2, Trash2, ChevronRight } from 'lucide-react'
import { useT } from '../lib/i18n'
import type { BuildingDto, FloorDto, RoomDto } from '@ptas/contracts'

export default function Property() {
  const navigate = useNavigate()
  const t = useT()
  const {
    buildings, floors, rooms,
    deleteBuilding, deleteFloor, deleteRoom,
    loadFloors,
  } = useStore()

  const [activeBuilding, setActiveBuilding] = useState('')
  const [buildingModal,  setBuildingModal]  = useState<{ open: boolean; existing: BuildingDto | null }>({ open: false, existing: null })
  const [floorModal,     setFloorModal]     = useState<{ open: boolean; existing: FloorDto | null; buildingId: string }>({ open: false, existing: null, buildingId: '' })
  const [roomModal,      setRoomModal]      = useState<{ open: boolean; existing: RoomDto | null; floorId: string; buildingId: string }>({ open: false, existing: null, floorId: '', buildingId: '' })
  const [deleteError, setDeleteError] = useState('')

  // Set initial active building once buildings load
  useEffect(() => {
    if (buildings.length > 0 && !activeBuilding) {
      setActiveBuilding(buildings[0].id)
    }
  }, [buildings]) // eslint-disable-line

  // Load floors for the active building (they may not be derived from rooms yet)
  useEffect(() => {
    if (activeBuilding) loadFloors(activeBuilding)
  }, [activeBuilding]) // eslint-disable-line

  async function handleDeleteBuilding(id: string) {
    try { await deleteBuilding(id); setDeleteError('') }
    catch (e) { setDeleteError((e as Error).message) }
  }

  async function handleDeleteFloor(id: string) {
    try { await deleteFloor(id); setDeleteError('') }
    catch (e) { setDeleteError((e as Error).message) }
  }

  async function handleDeleteRoom(id: string) {
    try { await deleteRoom(id); setDeleteError('') }
    catch (e) { setDeleteError((e as Error).message) }
  }

  const currentBuilding = buildings.find(b => b.id === activeBuilding)
  const buildingFloors  = floors.filter(f => f.buildingId === activeBuilding)

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden">
      <PageHeader title={t('property.title')} />

      {/* Building tabs — pinned outside the scroll region, like RoomDetail's tab strip. */}
      {buildings.length > 0 && (
        <div className="flex-shrink-0 flex items-center bg-white border-b border-[#d1d3cf] px-4">
          <div className="flex flex-1 min-w-0 overflow-x-auto scrollbar-hide">
            {buildings.map(b => (
              <button
                key={b.id}
                onClick={() => setActiveBuilding(b.id)}
                className={`px-4 py-3 text-[13px] font-bold border-b-2 -mb-px whitespace-nowrap flex-shrink-0 transition-colors ${
                  activeBuilding === b.id ? 'text-[#0e0f0c] border-[#9fe870]' : 'text-[#454745] border-transparent'
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setBuildingModal({ open: true, existing: null })}
            aria-label={t('property.building')}
            className="ml-2 flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#9fe870] hover:bg-[#cdffad] active:scale-[0.97] text-[#0e0f0c] text-[12px] font-semibold transition-transform"
          >
            <Plus size={14} strokeWidth={2.5} />
            {t('property.building')}
          </button>
        </div>
      )}

      {buildings.length > 0 ? (
        <>
          <div className="flex-shrink-0 p-4 pb-3 space-y-3">
            {currentBuilding && (
              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[16px] font-bold text-[#0e0f0c]">{currentBuilding.name}</div>
                    {currentBuilding.remark && (
                      <div className="text-[13px] text-[#454745] mt-0.5">{currentBuilding.remark}</div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setBuildingModal({ open: true, existing: currentBuilding })}
                      className="w-8 h-8 rounded-lg bg-[#e8ebe6] flex items-center justify-center text-[#454745]">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDeleteBuilding(currentBuilding.id)}
                      className="w-8 h-8 rounded-lg bg-[#fdecea] flex items-center justify-center text-[#c13515]">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </Card>
            )}

            {deleteError && (
              <div className="bg-[#fdecea] rounded-xl p-3 text-[13px] text-[#c13515]">{deleteError}</div>
            )}
          </div>

          <div className="flex-1 min-h-0 tab-list-scroll scrollbar-hide">
            <div className="detail-list-scroll-content space-y-4">
              {buildingFloors.length === 0 ? (
                <div className="text-center py-6 text-[13px] text-[#454745]">{t('property.noFloors')}</div>
              ) : (
                buildingFloors.map(floor => {
                  const floorRooms = rooms.filter(r => r.floorId === floor.id)
                  return (
                    <div key={floor.id}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-[13px] font-bold text-[#0e0f0c]">{floor.name}</span>
                          {floor.remark && <span className="text-[12px] text-[#454745] ml-1.5">· {floor.remark}</span>}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setRoomModal({ open: true, existing: null, floorId: floor.id, buildingId: activeBuilding })}
                            className="flex items-center gap-1 text-[12px] font-semibold text-[#0e0f0c]"
                          >
                            <Plus size={13} /> {t('property.room')}
                          </button>
                          <button onClick={() => setFloorModal({ open: true, existing: floor, buildingId: activeBuilding })}
                            className="w-7 h-7 rounded-lg bg-[#e8ebe6] flex items-center justify-center text-[#454745]">
                            <Edit2 size={12} />
                          </button>
                          <button onClick={() => handleDeleteFloor(floor.id)}
                            className="w-7 h-7 rounded-lg bg-[#fdecea] flex items-center justify-center text-[#c13515]">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      <Card padding={false}>
                        {floorRooms.length === 0 ? (
                          <div className="px-4 py-3 text-[13px] text-[#454745]">{t('property.noRooms')}</div>
                        ) : (
                          floorRooms.map((room, i) => (
                            <div key={room.id}>
                              <div className="flex items-center justify-between px-4 py-3">
                                <div className="flex-1 cursor-pointer" onClick={() => navigate(`/room/${room.id}`)}>
                                  <div className="text-[14px] font-bold text-[#0e0f0c]">{room.name}</div>
                                  <div className="text-[12px] text-[#454745]">{room.size} · ${room.price}/mo</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={room.occupied ? 'green' : 'grey'}>
                                    {room.occupied ? t('status.occupied') : t('status.vacant')}
                                  </Badge>
                                  <button onClick={() => setRoomModal({ open: true, existing: room, floorId: room.floorId, buildingId: room.buildingId })}
                                    className="w-7 h-7 rounded-lg bg-[#e8ebe6] flex items-center justify-center text-[#454745]">
                                    <Edit2 size={12} />
                                  </button>
                                  {!room.occupied && (
                                    <button onClick={() => handleDeleteRoom(room.id)}
                                      className="w-7 h-7 rounded-lg bg-[#fdecea] flex items-center justify-center text-[#c13515]">
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                  <ChevronRight size={14} className="text-[#868685]" onClick={() => navigate(`/room/${room.id}`)} />
                                </div>
                              </div>
                              {i < floorRooms.length - 1 && <Divider />}
                            </div>
                          ))
                        )}
                      </Card>
                    </div>
                  )
                })
              )}

              <Button variant="outline" onClick={() => setFloorModal({ open: true, existing: null, buildingId: activeBuilding })}>
                <Plus size={14} /> {t('property.addFloor')}
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 min-h-0 tab-list-scroll scrollbar-hide">
          <div className="detail-list-scroll-content">
            <div className="text-center text-[#454745] py-12">
              <div className="text-[14px] font-bold mb-1">{t('property.noBuildings')}</div>
              <div className="text-[13px] mb-4">{t('property.noBuildingsSub')}</div>
              <button
                type="button"
                onClick={() => setBuildingModal({ open: true, existing: null })}
                className="inline-flex items-center gap-1.5 px-4 h-10 rounded-full bg-[#9fe870] hover:bg-[#cdffad] active:scale-[0.97] text-[#0e0f0c] text-[13px] font-semibold transition-transform"
              >
                <Plus size={16} strokeWidth={2.5} />
                {t('property.building')}
              </button>
            </div>
          </div>
        </div>
      )}

      <BuildingModal
        open={buildingModal.open}
        onClose={() => setBuildingModal({ open: false, existing: null })}
        existing={buildingModal.existing}
      />
      <FloorModal
        open={floorModal.open}
        onClose={() => setFloorModal({ open: false, existing: null, buildingId: '' })}
        existing={floorModal.existing}
        buildingId={floorModal.buildingId}
      />
      <RoomModal
        open={roomModal.open}
        onClose={() => setRoomModal({ open: false, existing: null, floorId: '', buildingId: '' })}
        existing={roomModal.existing}
        floorId={roomModal.floorId}
        buildingId={roomModal.buildingId}
      />
    </div>
  )
}
