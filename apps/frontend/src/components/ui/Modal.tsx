import { useEffect, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'

/**
 * Bottom-sheet modal — slides up from the bottom on every breakpoint.
 *
 * Mobile: full-width up to the app-shell width.
 * Tablet/desktop: anchored bottom-center at 560px max-width with elevation.
 *
 * `open` controls intent; the component plays a slide-down + fade-out
 * exit animation before unmounting so close feels smooth even though the
 * caller just toggles a boolean.
 *
 * `hideClose` removes the corner X button — used by sheets that have
 * their own footer Close action so the user has one obvious dismiss.
 */
const EXIT_MS = 200

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children?: ReactNode
  hideClose?: boolean
}

export default function Modal({ open, onClose, title, children, hideClose = false }: ModalProps) {
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)

  // Sync internal visibility with the `open` prop. When `open` flips false
  // we keep the node mounted long enough to play the slide-down animation.
  useEffect(() => {
    if (open) {
      setVisible(true)
      setExiting(false)
      return
    }
    if (visible) {
      setExiting(true)
      const t = setTimeout(() => {
        setVisible(false)
        setExiting(false)
      }, EXIT_MS)
      return () => clearTimeout(t)
    }
    return
  }, [open]) // eslint-disable-line

  // Body scroll-lock + Escape-to-close while the sheet is mounted.
  useEffect(() => {
    if (!visible) {
      document.body.style.overflow = ''
      return
    }
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [visible, onClose])

  if (!visible) return null

  return (
    <div
      className={`modal-overlay ${exiting ? 'fade-out' : 'fade-in'}`}
      onClick={onClose}
    >
      <div
        className={`modal-sheet w-full ${exiting ? 'slide-down' : 'slide-up'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-1">
          {/* Drag handle — visible on every breakpoint as a pull-to-dismiss hint. */}
          <div className="w-10 h-1 bg-[#d1d3cf] rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2.5" />
          <div />
          {!hideClose && (
            <button
              onClick={onClose}
              aria-label="Close"
              className="icon-btn w-8 h-8"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="px-5 pb-8">
          {title && (
            <h2 className="text-[20px] font-semibold text-[#0e0f0c] tracking-tight2 mb-4">{title}</h2>
          )}
          {children}
        </div>
      </div>
    </div>
  )
}

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title?: ReactNode
  message?: ReactNode
  confirmLabel?: ReactNode
  cancelLabel?: ReactNode
  confirmVariant?: 'danger' | 'primary'
}

/** Confirmation modal — Wise primary on the destructive variant uses
 *  the negative-red soft fill; the non-destructive variant uses the
 *  lime CTA. Cancel is the white tertiary outline. */
export function ConfirmModal({
  open, onClose, onConfirm, title, message,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel', confirmVariant = 'danger',
}: ConfirmModalProps) {
  if (!open) return null
  const btnStyle = confirmVariant === 'danger'
    ? 'bg-[#fdecea] text-[#d03238] hover:bg-[#f9d6d2]'
    : 'bg-[#9fe870] text-[#0e0f0c] hover:bg-[#cdffad]'

  return (
    <Modal open={open} onClose={onClose} title={title}>
      {message && <p className="text-[14px] text-[#454745] mb-5 leading-relaxed">{message}</p>}
      <button
        onClick={onConfirm}
        className={`w-full py-3 rounded-[24px] font-semibold text-[16px] ${btnStyle} mb-2 transition-transform active:scale-[0.97]`}
      >
        {confirmLabel}
      </button>
      <button
        onClick={onClose}
        className="w-full py-3 rounded-[24px] font-semibold text-[16px] bg-white border border-[#0e0f0c] text-[#0e0f0c] hover:bg-[#f3f5f1] transition-colors"
      >
        {cancelLabel}
      </button>
    </Modal>
  )
}
