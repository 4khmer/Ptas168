import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { useT } from '../lib/i18n'
import Modal from './ui/Modal'
import Card, { SectionLabel } from './ui/Card'
import { MessageSquare, Plus, Trash2, Copy, Check } from 'lucide-react'
import { formatDateTime } from '../lib/date'
import type { MintCodeResponse } from '@ptas/contracts'

function fmtDate(s: string): string {
  return formatDateTime(s)
}

interface RoomTelegramLinkProps {
  roomId: string
}

export default function RoomTelegramLink({ roomId }: RoomTelegramLinkProps) {
  const t = useT()
  const {
    telegramLinks, loadTelegramLinks, requestTelegramLinkCode, removeTelegramLink,
  } = useStore()

  const [linkOpen, setLinkOpen] = useState(false)
  const [code, setCode] = useState<MintCodeResponse | null>(null)
  const [requesting, setRequesting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [confirmUnlink, setConfirmUnlink] = useState(false)

  useEffect(() => { loadTelegramLinks() }, []) // eslint-disable-line

  const link = telegramLinks.find(l => l.roomId === roomId) ?? null

  async function openLinkModal() {
    setError('')
    setRequesting(true)
    setLinkOpen(true)
    try {
      const data = await requestTelegramLinkCode(roomId)
      setCode(data)
    } catch (e) {
      setError((e as Error).message || 'Failed to generate code')
    } finally {
      setRequesting(false)
    }
  }

  function closeLinkModal() {
    setLinkOpen(false)
    setCode(null)
    setCopied(false)
    setError('')
  }

  async function copyCommand() {
    if (!code) return
    try {
      await navigator.clipboard.writeText(`/link ${code.code}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard blocked — user can still type the code */ }
  }

  async function doUnlink() {
    if (!link) return
    try { await removeTelegramLink(link.id) }
    finally { setConfirmUnlink(false) }
  }

  return (
    <>
      <SectionLabel>{t('telegram.roomSection.heading')}</SectionLabel>

      {link ? (
        <Card padding={false}>
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#E8F6FF] flex items-center justify-center text-[#2AABEE] flex-shrink-0">
                <MessageSquare size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-[14px] font-bold text-[#0e0f0c] truncate">
                  {link.chatTitle || t('telegram.roomSection.untitled')}
                </div>
                <div className="text-[11px] text-[#454745] mt-0.5 truncate font-mono">{link.chatId}</div>
                <div className="text-[11px] text-[#454745] mt-0.5">
                  {t('telegram.linkedAt')} {fmtDate(link.linkedAt)}
                </div>
              </div>
            </div>
            <button
              onClick={() => setConfirmUnlink(true)}
              className="w-8 h-8 rounded-lg bg-[#fdecea] flex items-center justify-center text-[#c13515] flex-shrink-0 ml-2"
              aria-label={t('telegram.unlink')}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e8ebe6] flex items-center justify-center text-[#454745] flex-shrink-0">
              <MessageSquare size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-bold text-[#0e0f0c]">{t('telegram.roomSection.notLinked')}</div>
              <div className="text-[12px] text-[#454745] mt-0.5 leading-relaxed">
                {t('telegram.roomSection.notLinkedSub')}
              </div>
              <button
                onClick={openLinkModal}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#9fe870] text-[#0e0f0c] text-[12px] font-semibold"
              >
                <Plus size={14} /> {t('telegram.linkGroup')}
              </button>
            </div>
          </div>
        </Card>
      )}

      <Modal open={linkOpen} onClose={closeLinkModal} title={t('telegram.modal.title')}>
        <p className="text-[13px] text-[#454745] mb-4 leading-relaxed">
          {t('telegram.modal.help')}
        </p>

        {requesting ? (
          <div className="text-center py-8 text-[13px] text-[#454745]">{t('common.loading')}…</div>
        ) : error ? (
          <div className="bg-[#fdecea] text-[#c13515] text-[13px] rounded-xl px-4 py-3">{error}</div>
        ) : code ? (
          <>
            <div className="bg-[#e8ebe6] rounded-xl px-4 py-5 text-center mb-3">
              <div className="text-[11px] font-bold text-[#454745] uppercase tracking-wide mb-1.5">
                {t('telegram.modal.codeLabel')}
              </div>
              <div className="text-[28px] font-bold text-[#0e0f0c] font-mono tracking-[6px]">
                {code.code}
              </div>
              <button
                onClick={copyCommand}
                className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#0e0f0c]"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? t('common.copied') : t('telegram.modal.copyCmd')}
              </button>
            </div>
            <ol className="space-y-2 text-[13px] text-[#0e0f0c] list-decimal pl-5">
              <li>{t('telegram.modal.step1')}</li>
              <li>
                {t('telegram.modal.step2.before')}
                <span className="font-mono font-bold mx-1">/link {code.code}</span>
                {t('telegram.modal.step2.after')}
              </li>
              <li>{t('telegram.modal.step3')}</li>
            </ol>
            <div className="text-[11px] text-[#454745] mt-3">
              {t('telegram.modal.expires').replace('{minutes}', String(Math.max(1, Math.round((new Date(code.expiresAt).getTime() - Date.now()) / 60000))))}
            </div>
          </>
        ) : null}
      </Modal>

      <Modal open={confirmUnlink} onClose={() => setConfirmUnlink(false)} title={t('telegram.delete.title')}>
        <p className="text-[13px] text-[#0e0f0c] mb-4">{t('telegram.delete.confirm')}</p>
        <div className="flex gap-2">
          <button
            onClick={() => setConfirmUnlink(false)}
            className="flex-1 py-2.5 rounded-xl border border-[#d1d3cf] text-[13px] font-semibold text-[#0e0f0c]"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={doUnlink}
            className="flex-1 py-2.5 rounded-xl bg-[#c13515] text-white text-[13px] font-semibold"
          >
            {t('telegram.unlink')}
          </button>
        </div>
      </Modal>
    </>
  )
}
