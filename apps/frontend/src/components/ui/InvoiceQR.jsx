import { useEffect, useMemo, useState } from 'react'
import { QrCode } from 'lucide-react'
import { encodeQRToDataUrl } from '../../lib/qr'
import { parseKHQR } from '../../lib/khqr'
import { useT } from '../../lib/i18n'

/**
 * Render a saved QR payload string. If the payload is a Bakong KHQR,
 * it's shown as the standard KHQR card (red header + merchant name +
 * dashed divider + QR + bank line). Otherwise a plain framed QR.
 *
 * Pass `compact` for a smaller variant (used in the InvoiceSetup picker
 * preview). Default is the size used on real invoices.
 */
export default function InvoiceQR({ value, size = 220, compact = false }) {
  const t = useT()
  const [qrSrc, setQrSrc] = useState('')

  const khqr = useMemo(() => parseKHQR(value), [value])
  const qrPx = compact ? Math.round(size * 0.7) : size
  // We overlay a center logo on KHQR cards — error-correction H tolerates
  // covering up to ~30% of modules, so the QR stays scannable.
  const ecLevel = khqr ? 'H' : 'M'

  useEffect(() => {
    let alive = true
    if (!value) { setQrSrc(''); return }
    encodeQRToDataUrl(value, { size: qrPx * 2, margin: 1, errorCorrectionLevel: ecLevel })
      .then(url => { if (alive) setQrSrc(url || '') })
      .catch(() => { if (alive) setQrSrc('') })
    return () => { alive = false }
  }, [value, qrPx, ecLevel])

  if (!value) {
    return (
      <div
        style={{ width: size, height: size }}
        className="bg-[#e8ebe6] rounded-xl flex flex-col items-center justify-center gap-1 border border-dashed border-[#d1d3cf]"
      >
        <QrCode size={Math.round(size / 3)} className="text-[#868685]" strokeWidth={1.5} />
        <span className="text-[10px] text-[#868685]">{t('invoiceDetail.noQr')}</span>
      </div>
    )
  }

  if (khqr) {
    // Sizes scale gently with the card so the tag/ribbon shape stays
    // proportional from the 140px compact preview up to the invoice render.
    const headerH = Math.max(26, Math.round(size * 0.18))
    const tailW   = Math.round(headerH * 0.85)
    const logoPx  = Math.max(28, Math.round(qrPx * 0.22))
    return (
      <div
        className="relative rounded-2xl overflow-visible border border-[#d1d3cf] bg-white shadow-sm"
        style={{ width: size }}
      >
        {/* Red banner with a triangular notch on the right edge — the
            clip-path cuts an inward chevron so the bar reads as a
            folded tag/ribbon, matching the KHQR brand mark. */}
        <div
          className="bg-[#E21B23] flex items-center justify-center rounded-t-2xl"
          style={{
            height: headerH,
            clipPath:
              `polygon(0 0, 100% 0, calc(100% - ${tailW}px) 100%, 0 100%)`,
          }}
        >
          <span
            className="text-white font-extrabold tracking-[3px]"
            style={{ fontSize: Math.max(12, Math.round(headerH * 0.5)) }}
          >
            KHQR
          </span>
        </div>

        <div className="px-3 pt-3 pb-3 flex items-center justify-center relative">
          {qrSrc
            ? <img src={qrSrc} alt="KHQR" style={{ width: qrPx, height: qrPx }} className="object-contain" />
            : <div style={{ width: qrPx, height: qrPx }} className="bg-[#e8ebe6] animate-pulse rounded" />
          }
          {/* Center Bakong-style logo overlay. The QR is rendered at
              errorCorrectionLevel 'H', so covering ~22% of the centre is
              safe — readers still decode it. */}
          {qrSrc && (
            <div
              className="absolute flex items-center justify-center rounded-full bg-white"
              style={{
                width: logoPx + 6,
                height: logoPx + 6,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
              aria-hidden
            >
              <div
                className="flex items-center justify-center rounded-full bg-[#E21B23] text-white"
                style={{
                  width: logoPx,
                  height: logoPx,
                  fontSize: Math.round(logoPx * 0.4),
                  fontWeight: 800,
                  letterSpacing: 0.5,
                }}
              >
                ₭
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Non-KHQR payload — plain framed QR (no merchant chrome)
  if (!qrSrc) {
    return (
      <div
        style={{ width: size, height: size }}
        className="bg-[#e8ebe6] rounded-xl border border-dashed border-[#d1d3cf] animate-pulse"
      />
    )
  }
  return (
    <img
      src={qrSrc}
      alt="QR"
      style={{ width: size, height: size }}
      className="object-contain rounded-xl border border-[#d1d3cf] bg-white p-1"
    />
  )
}
