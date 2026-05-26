import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader'
import Modal from '../components/ui/Modal'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import { useStore } from '../store'
import { useT } from '../lib/i18n'
import { MessageSquare, Trash2, ChevronRight } from 'lucide-react'
import { formatDateTime } from '../lib/date'

function fmtDate(s) {
  return formatDateTime(s)
}

export default function TelegramBot() {
  const navigate = useNavigate()
  const t = useT()
  const { telegramLinks, loadTelegramLinks, removeTelegramLink } = useStore()

  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => { loadTelegramLinks() }, []) // eslint-disable-line

  async function confirmDelete() {
    if (!deleteId) return
    try { await removeTelegramLink(deleteId) }
    finally { setDeleteId(null) }
  }

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden">
      <PageHeader title={t('telegram.title')} />

      <div className="flex-shrink-0 p-4 pb-3">
        <div className="bg-[#e8ebe6] rounded-xl px-4 py-3 text-[12px] text-[#0e0f0c] leading-relaxed">
          {t('telegram.helpNote')}
        </div>
      </div>

      <div className="flex-1 min-h-0 tab-list-scroll scrollbar-hide">
        <div className="detail-list-scroll-content">
          {telegramLinks.length === 0 ? (
            <EmptyState
              icon={<MessageSquare size={36} strokeWidth={1.5} />}
              title={t('telegram.empty.title')}
              subtitle={t('telegram.empty.sub')}
            />
          ) : (
            <Card padding={false}>
              {telegramLinks.map((link, i) => (
                <div key={link.id}>
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <button
                      onClick={() => navigate(`/room/${link.roomId}`)}
                      className="flex items-center gap-3 min-w-0 flex-1 text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#E8F6FF] flex items-center justify-center text-[#2AABEE] flex-shrink-0">
                        <MessageSquare size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[14px] font-bold text-[#0e0f0c] truncate">
                          {link.roomName}
                          {link.buildingName && <span className="text-[11px] text-[#454745] font-normal ml-1">· {link.buildingName}</span>}
                        </div>
                        <div className="text-[11px] text-[#454745] mt-0.5 truncate">
                          {link.chatTitle || link.chatId}
                        </div>
                        <div className="text-[11px] text-[#454745] mt-0.5">
                          {t('telegram.linkedAt')} {fmtDate(link.linkedAt)}
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-[#868685] flex-shrink-0" />
                    </button>
                    <button
                      onClick={() => setDeleteId(link.id)}
                      className="w-8 h-8 rounded-lg bg-[#fdecea] flex items-center justify-center text-[#c13515] flex-shrink-0 ml-2"
                      aria-label={t('telegram.unlink')}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {i < telegramLinks.length - 1 && <div className="h-px bg-[#d1d3cf] mx-4" />}
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title={t('telegram.delete.title')}>
        <p className="text-[13px] text-[#0e0f0c] mb-4">{t('telegram.delete.confirm')}</p>
        <div className="flex gap-2">
          <button
            onClick={() => setDeleteId(null)}
            className="flex-1 py-2.5 rounded-xl border border-[#d1d3cf] text-[13px] font-semibold text-[#0e0f0c]"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={confirmDelete}
            className="flex-1 py-2.5 rounded-xl bg-[#c13515] text-white text-[13px] font-semibold"
          >
            {t('telegram.unlink')}
          </button>
        </div>
      </Modal>
    </div>
  )
}
