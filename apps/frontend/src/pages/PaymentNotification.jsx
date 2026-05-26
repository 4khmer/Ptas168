import { useEffect, useState } from 'react'
import PageHeader from '../components/layout/PageHeader'
import Modal from '../components/ui/Modal'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import { useStore } from '../store'
import { useT } from '../lib/i18n'
import { Banknote, Plus, Trash2, Copy, Check } from 'lucide-react'
import { formatDateTime } from '../lib/date'

function fmtDate(s) {
  return formatDateTime(s)
}

export default function PaymentNotification() {
  const t = useT()
  const {
    bankNotificationGroups,
    loadBankNotificationGroups,
    requestBankNotificationGroupCode,
    removeBankNotificationGroup,
  } = useStore()

  const [linkOpen, setLinkOpen] = useState(false)
  const [code, setCode] = useState(null)
  const [requesting, setRequesting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => { loadBankNotificationGroups() }, []) // eslint-disable-line

  async function openLinkModal() {
    setError('')
    setRequesting(true)
    setLinkOpen(true)
    try {
      const data = await requestBankNotificationGroupCode()
      setCode(data)
    } catch (e) {
      setError(e.message || 'Failed to generate code')
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

  async function confirmDelete() {
    if (!deleteId) return
    try { await removeBankNotificationGroup(deleteId) }
    finally { setDeleteId(null) }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader title={t('paymentNotif.title')} />

      <div className="flex-1 min-h-0 tab-list-scroll scrollbar-hide">
        <div className="tab-list-scroll-content tab-list-scroll-content--with-flush-fab space-y-4">
        <div className="bg-[#e8ebe6] rounded-xl px-4 py-3 text-[12px] text-[#0e0f0c] leading-relaxed">
          {t('paymentNotif.helpNote')}
        </div>

        {bankNotificationGroups.length === 0 ? (
          <EmptyState
            icon={<Banknote size={36} strokeWidth={1.5} />}
            title={t('paymentNotif.empty.title')}
            subtitle={t('paymentNotif.empty.sub')}
          />
        ) : (
          <Card padding={false}>
            {bankNotificationGroups.map((g, i) => (
              <div key={g.id}>
                <div className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-[#E8F6EF] flex items-center justify-center text-[#1F6F4E] flex-shrink-0">
                      <Banknote size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[14px] font-bold text-[#0e0f0c] truncate">
                        {g.chatTitle || t('paymentNotif.untitled')}
                      </div>
                      <div className="text-[11px] text-[#454745] mt-0.5 truncate font-mono">{g.chatId}</div>
                      <div className="text-[11px] text-[#454745] mt-0.5">
                        {t('telegram.linkedAt')} {fmtDate(g.linkedAt)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteId(g.id)}
                    className="w-8 h-8 rounded-lg bg-[#fdecea] flex items-center justify-center text-[#c13515] flex-shrink-0 ml-2"
                    aria-label={t('telegram.unlink')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {i < bankNotificationGroups.length - 1 && <div className="h-px bg-[#d1d3cf] mx-4" />}
              </div>
            ))}
          </Card>
        )}
        </div>
      </div>

      <button
        type="button"
        onClick={openLinkModal}
        className="fab-bottom fab-flush flex items-center gap-1.5 pl-3.5 pr-4 h-12 rounded-full bg-[#9fe870] hover:bg-[#cdffad] active:scale-[0.97] text-[#0e0f0c] text-[14px] font-semibold shadow-lg transition-transform"
      >
        <Plus size={18} strokeWidth={2.5} />
        {t('paymentNotif.linkGroup')}
      </button>

      <Modal open={linkOpen} onClose={closeLinkModal} title={t('paymentNotif.modal.title')}>
        <p className="text-[13px] text-[#454745] mb-4 leading-relaxed">
          {t('paymentNotif.modal.help')}
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
              <li>{t('paymentNotif.modal.step1')}</li>
              <li>
                {t('telegram.modal.step2.before')}
                <span className="font-mono font-bold mx-1">/link {code.code}</span>
                {t('telegram.modal.step2.after')}
              </li>
              <li>{t('paymentNotif.modal.step3')}</li>
            </ol>
            <div className="text-[11px] text-[#454745] mt-3">
              {t('telegram.modal.expires').replace('{minutes}', Math.round((code.ttlSeconds || 600) / 60))}
            </div>
          </>
        ) : null}
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title={t('paymentNotif.delete.title')}>
        <p className="text-[13px] text-[#0e0f0c] mb-4">{t('paymentNotif.delete.confirm')}</p>
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
