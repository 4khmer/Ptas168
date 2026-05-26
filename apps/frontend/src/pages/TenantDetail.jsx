import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import PageHeader from '../components/layout/PageHeader'
import Badge, { invoiceStatusVariant } from '../components/ui/Badge'
import Card, { Divider } from '../components/ui/Card'
import { Phone, Edit2, Check, X, ChevronRight, Camera, Paperclip, FileText, Trash2, Upload, Download } from 'lucide-react'
import { useT, invoiceStatusLabelKey } from '../lib/i18n'
import { formatPhone } from '../lib/phone'
import { formatFullDate, formatShortDate } from '../lib/date'

export default function TenantDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const t = useT()
  const { tenants, updateTenant, getTenantRooms, getInvoicesByRoom, loadTenants, loadAllInvoices, loading } = useStore()

  const tenant = tenants.find(t => t.id === id)
  const tenantRooms = getTenantRooms(id)

  const [editingName,  setEditingName]  = useState(false)
  const [editingPhone, setEditingPhone] = useState(false)
  const [nameVal,      setNameVal]      = useState('')
  const [phoneVal,     setPhoneVal]     = useState('')
  const [saveError,    setSaveError]    = useState('')
  const [docUploading, setDocUploading] = useState(false)
  const [previewDoc,   setPreviewDoc]   = useState(null)
  const fileRef = useRef(null)
  const docFileRef = useRef(null)

  const documents = tenant?.documents || []

  useEffect(() => {
    if (tenants.length === 0) loadTenants()
    loadAllInvoices()
  }, []) // eslint-disable-line

  if (loading.tenants && !tenant) {
    return (
      <div className="app-shell">
        <PageHeader title={t('tenantDetail.title')} />
        <div className="p-4 text-center text-[#454745] text-[13px]">{t('common.loading')}</div>
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="app-shell">
        <PageHeader title={t('tenantDetail.notFound')} />
        <div className="p-4 text-center text-[#454745]">{t('tenantDetail.notFoundSub')}</div>
      </div>
    )
  }

  function startEditName()  { setNameVal(tenant.name);   setEditingName(true);  setSaveError('') }
  function startEditPhone() { setPhoneVal(tenant.phone); setEditingPhone(true); setSaveError('') }

  async function saveName() {
    if (!nameVal.trim()) { setEditingName(false); return }
    try { await updateTenant(id, { name: nameVal.trim() }) } catch (e) { setSaveError(e.message) }
    setEditingName(false)
  }

  async function savePhone() {
    if (!phoneVal.trim()) { setEditingPhone(false); return }
    try { await updateTenant(id, { phone: phoneVal.trim() }) } catch (e) { setSaveError(e.message) }
    setEditingPhone(false)
  }

  async function handlePhotoFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = ev => updateTenant(id, { photo: ev.target.result })
    reader.readAsDataURL(file)
  }

  function readAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(reader.error || new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }

  async function handleDocsUpload(e) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    e.target.value = ''
    setSaveError('')
    const MAX_BYTES = 5 * 1024 * 1024 // 5 MB per file

    setDocUploading(true)
    try {
      const tooBig = files.find(f => f.size > MAX_BYTES)
      if (tooBig) {
        setSaveError(`"${tooBig.name}" ${t('tenantDetail.errSize')}`)
        return
      }
      const newDocs = await Promise.all(files.map(async f => ({
        id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        name: f.name,
        type: f.type || '',
        size: f.size,
        dataUrl: await readAsDataUrl(f),
        uploadedAt: new Date().toISOString(),
      })))
      await updateTenant(id, { documents: [...documents, ...newDocs] })
    } catch (err) {
      setSaveError(err.message || t('tenantDetail.errUpload'))
    } finally {
      setDocUploading(false)
    }
  }

  async function handleDocDelete(docId) {
    setSaveError('')
    try {
      await updateTenant(id, { documents: documents.filter(d => d.id !== docId) })
    } catch (err) {
      setSaveError(err.message || t('tenantDetail.errRemove'))
    }
  }

  function fmtSize(bytes) {
    if (!bytes && bytes !== 0) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  function isImage(d) {
    return (d.type || '').startsWith('image/')
  }

  // Pull every invoice across all rooms this tenant has occupied, then keep
  // only those whose `tenantId` matches — so a previous tenant's invoices
  // for the same room don't leak in.
  const recentInvoices = tenantRooms
    .flatMap(({ room }) => getInvoicesByRoom(room.id))
    .filter(inv => inv.tenantId === id)
    .sort((a, b) => new Date(b.periodStart) - new Date(a.periodStart))
    .slice(0, 4)

  return (
    <div className="app-shell">
      <PageHeader title={t('tenantDetail.title')} />

      <div className="page-content scrollbar-hide p-4 space-y-4" style={{ paddingBottom: '24px' }}>

        {saveError && (
          <div className="bg-[#fdecea] rounded-xl p-3 text-[13px] text-[#c13515]">{saveError}</div>
        )}

        {/* ── Profile card ── */}
        <Card>
          {/* Avatar */}
          <div className="flex flex-col items-center pb-4 border-b border-[#dde0db] mb-4">
            <div className="relative mb-3">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#d1d3cf] bg-[#e8ebe6] flex items-center justify-center">
                {tenant.photo ? (
                  <img src={tenant.photo} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[32px] font-bold text-[#0e0f0c]">
                    {tenant.name[0]?.toUpperCase()}
                  </span>
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#9fe870] text-[#0e0f0c] flex items-center justify-center shadow border-2 border-white"
              >
                <Camera size={13} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoFile} />
            </div>
          </div>

          {/* Name */}
          <div className="mb-3">
            <div className="text-[11px] font-semibold text-[#454745] uppercase tracking-[0.4px] mb-1.5">{t('tenantDetail.fullName')}</div>
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  className="input-base flex-1 text-[14px] py-2"
                  value={nameVal}
                  onChange={e => setNameVal(e.target.value)}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && saveName()}
                />
                <button onClick={saveName} className="text-[#0e0f0c] p-1"><Check size={16} /></button>
                <button onClick={() => setEditingName(false)} className="text-[#454745] p-1"><X size={16} /></button>
              </div>
            ) : (
              <button
                onClick={startEditName}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border-[1.5px] border-[#d1d3cf] bg-white text-left"
              >
                <span className="text-[14px] font-semibold text-[#0e0f0c]">{tenant.name}</span>
                <Edit2 size={14} className="text-[#868685] flex-shrink-0" />
              </button>
            )}
          </div>

          {/* Phone */}
          <div>
            <div className="text-[11px] font-semibold text-[#454745] uppercase tracking-[0.4px] mb-1.5">{t('tenantDetail.phoneNumber')}</div>
            {editingPhone ? (
              <div className="flex items-center gap-2">
                <input
                  className="input-base flex-1 text-[14px] py-2"
                  value={phoneVal}
                  onChange={e => setPhoneVal(e.target.value)}
                  type="tel"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && savePhone()}
                />
                <button onClick={savePhone} className="text-[#0e0f0c] p-1"><Check size={16} /></button>
                <button onClick={() => setEditingPhone(false)} className="text-[#454745] p-1"><X size={16} /></button>
              </div>
            ) : (
              <button
                onClick={startEditPhone}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border-[1.5px] border-[#d1d3cf] bg-white text-left"
              >
                <div className="flex items-center gap-2">
                  <Phone size={13} className="text-[#454745]" />
                  <span className="text-[14px] font-semibold text-[#0e0f0c]">{formatPhone(tenant.phone)}</span>
                </div>
                <Edit2 size={14} className="text-[#868685] flex-shrink-0" />
              </button>
            )}
          </div>

          {/* ── Documents ── */}
          <div className="mt-5 pt-4 border-t border-[#d1d3cf]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Paperclip size={13} className="text-[#454745]" />
                <span className="text-[11px] font-semibold text-[#454745] uppercase tracking-[0.4px]">
                  {t('tenantDetail.documents')}{documents.length > 0 ? ` (${documents.length})` : ''}
                </span>
              </div>
              <button
                onClick={() => docFileRef.current?.click()}
                disabled={docUploading}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0e0f0c] hover:bg-[#0e0f0c] text-white text-[11px] font-semibold transition-transform active:scale-[0.97] disabled:opacity-50"
              >
                <Upload size={11} />
                {docUploading ? t('common.uploading') : t('common.upload')}
              </button>
              <input
                ref={docFileRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleDocsUpload}
              />
            </div>

            {documents.length === 0 ? (
              <button
                onClick={() => docFileRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-1 py-5 rounded-xl border-2 border-dashed border-[#d1d3cf] hover:border-[#0e0f0c] hover:bg-[#e8ebe6] transition-colors"
              >
                <Upload size={20} className="text-[#868685]" />
                <span className="text-[12px] text-[#454745]">{t('tenantDetail.tapUpload')}</span>
                <span className="text-[10px] text-[#454745]">{t('tenantDetail.maxSize')}</span>
              </button>
            ) : (
              <div className="space-y-1.5">
                {documents.map(d => (
                  <div
                    key={d.id}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-[#d1d3cf] bg-white"
                  >
                    <button
                      onClick={() => setPreviewDoc(d)}
                      className="flex items-center gap-2.5 flex-1 min-w-0 text-left active:opacity-80"
                    >
                      {isImage(d) ? (
                        <img src={d.dataUrl} alt={d.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-[#e8ebe6] flex items-center justify-center flex-shrink-0">
                          <FileText size={16} className="text-[#454745]" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-[#0e0f0c] truncate">{d.name}</div>
                        <div className="text-[10px] text-[#454745]">
                          {fmtSize(d.size)}
                          {d.uploadedAt && (
                            <> · {formatFullDate(d.uploadedAt)}</>
                          )}
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => handleDocDelete(d.id)}
                      aria-label={`Remove ${d.name}`}
                      className="w-7 h-7 rounded-lg bg-[#fdecea] hover:bg-[#f9d6d2] text-[#c13515] flex items-center justify-center flex-shrink-0 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Rooms */}
        {tenantRooms.length > 0 && (
          <div>
            <div className="text-[11px] font-bold text-[#454745] uppercase tracking-wider mb-2">{t('tenantDetail.rooms')}</div>
            <Card padding={false}>
              {tenantRooms.map(({ room, building, floor, contract }, i) => (
                <div key={room.id}>
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer active:opacity-80"
                    onClick={() => navigate(`/room/${room.id}`)}
                  >
                    <div>
                      <div className="text-[14px] font-bold text-[#0e0f0c]">{room.name}</div>
                      <div className="text-[12px] text-[#454745]">
                        {building?.name} · {floor?.name}
                      </div>
                      {contract && (
                        <div className="text-[12px] text-[#454745]">
                          {t('tenantDetail.rent')}: ${contract.baseRent}/mo · {t('tenantDetail.from')} {formatFullDate(contract.startDate)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={contract?.status === 'active' ? 'green' : 'grey'}>
                        {contract?.status === 'active' ? t('status.active') : contract?.status || '—'}
                      </Badge>
                      <ChevronRight size={16} className="text-[#868685]" />
                    </div>
                  </div>
                  {i < tenantRooms.length - 1 && <Divider />}
                </div>
              ))}
            </Card>
          </div>
        )}

        {/* Recent invoices */}
        {recentInvoices.length > 0 && (
          <div>
            <div className="text-[11px] font-bold text-[#454745] uppercase tracking-wider mb-2">{t('tenantDetail.recentInv')}</div>
            <Card padding={false}>
              {recentInvoices.map((inv, i) => (
                <div key={inv.id}>
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer active:opacity-80"
                    onClick={() => navigate(`/invoice/${inv.id}?from=${encodeURIComponent(`/tenant/${id}`)}`)}
                  >
                    <div>
                      <div className="text-[14px] font-bold text-[#0e0f0c]">
                        {formatShortDate(inv.periodStart)}
                      </div>
                      <div className="text-[11px] text-[#454745]">{inv.id}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-[13px] font-bold">${inv.total?.toFixed(2)}</div>
                        <Badge variant={invoiceStatusVariant(inv.status)}>{t(invoiceStatusLabelKey(inv.status) || 'status.progress')}</Badge>
                      </div>
                      <ChevronRight size={14} className="text-[#868685]" />
                    </div>
                  </div>
                  {i < recentInvoices.length - 1 && <Divider />}
                </div>
              ))}
            </Card>
          </div>
        )}
      </div>

      {previewDoc && (
        <DocPreview doc={previewDoc} onClose={() => setPreviewDoc(null)} t={t} fmtSize={fmtSize} />
      )}
    </div>
  )
}

// ── DocPreview — full-screen overlay that renders images inline, PDFs
// in an iframe, and shows a download fallback for everything else.
// dataUrl-based, so it works without any backend file-serving route.
function DocPreview({ doc, onClose, t, fmtSize }) {
  const isImage = (doc.type || '').startsWith('image/')
  const isPdf   = (doc.type || '').includes('pdf') || /\.pdf$/i.test(doc.name || '')

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/85 fade-in"
      onClick={onClose}
    >
      {/* Top bar — filename + meta only; controls live at the bottom now. */}
      <div
        className="flex items-center px-4 py-3 bg-black/40 text-white"
        onClick={e => e.stopPropagation()}
      >
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold truncate">{doc.name}</div>
          <div className="text-[10px] text-white/70">
            {fmtSize(doc.size)}
            {doc.type && <> · {doc.type}</>}
          </div>
        </div>
      </div>

      {/* Body */}
      <div
        className="flex-1 overflow-auto flex items-center justify-center p-4"
        onClick={e => e.stopPropagation()}
      >
        {isImage && (
          <img
            src={doc.dataUrl}
            alt={doc.name}
            className="max-w-full max-h-full object-contain rounded-xl"
          />
        )}
        {isPdf && (
          <iframe
            src={doc.dataUrl}
            title={doc.name}
            className="w-full h-full bg-white rounded-xl"
            style={{ minHeight: '70vh' }}
          />
        )}
        {!isImage && !isPdf && (
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center">
            <FileText size={36} className="text-[#454745] mx-auto mb-3" />
            <div className="text-[14px] font-bold text-[#0e0f0c] mb-1 break-all">{doc.name}</div>
            <p className="text-[12px] text-[#454745] mb-4">
              {t('tenantDetail.previewUnsupported')}
            </p>
            <a
              href={doc.dataUrl}
              download={doc.name}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0e0f0c] hover:bg-[#0e0f0c] text-white text-[13px] font-semibold"
            >
              <Download size={14} />
              {t('tenantDetail.download')}
            </a>
          </div>
        )}
      </div>

      {/* Bottom controls — centered Download + Close buttons. */}
      <div
        className="flex items-center justify-center gap-3 py-4"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
        onClick={e => e.stopPropagation()}
      >
        <a
          href={doc.dataUrl}
          download={doc.name}
          aria-label={t('tenantDetail.download')}
          className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center"
          onClick={e => e.stopPropagation()}
        >
          <Download size={18} />
        </a>
        <button
          onClick={onClose}
          aria-label={t('common.close')}
          className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
