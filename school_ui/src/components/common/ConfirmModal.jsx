import { useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { FaExclamationTriangle } from 'react-icons/fa'

/**
 * Confirmation modal shown before a destructive action (delete, remove,
 * deactivate, ...). Controlled by the caller: pass `isOpen` and handle
 * `onConfirm` / `onCancel` yourself — this component holds no state of
 * its own beyond an optional `busy` flag while the action is in flight.
 *
 * @param {boolean} isOpen
 * @param {string} title           e.g. "Delete student?"
 * @param {string|React.ReactNode} message   e.g. `Remove ${name}? This cannot be undone.`
 * @param {string} [confirmLabel]  default "Delete"
 * @param {string} [cancelLabel]   default "Cancel"
 * @param {boolean} [busy]         disables buttons + shows a busy label while the action runs
 * @param {Function} onConfirm
 * @param {Function} onCancel
 */
export default function ConfirmModal({
  isOpen,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  busy = false,
  onConfirm,
  onCancel,
}) {
  const panelRef = useRef(null)
  const previousFocus = useRef(null)

  const handleBackdrop = useCallback(
    (e) => {
      if (e.target === e.currentTarget && !busy) onCancel?.()
    },
    [busy, onCancel]
  )

  useEffect(() => {
    if (!isOpen) return
    previousFocus.current = document.activeElement

    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !busy) {
        e.stopPropagation()
        onCancel?.()
        return
      }
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
      previousFocus.current?.focus?.()
    }
  }, [isOpen, busy, onCancel])

  if (!isOpen) return null

  return createPortal(
    <div
      className="modal-overlay"
      onClick={handleBackdrop}
    >
      <motion.div
        ref={panelRef}
        className="glass-panel modal-panel animate-fade-in-up"
        style={{ maxWidth: 420, width: '100%' }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        <div className="modal-body" style={{ display: 'flex', gap: 'var(--sp-md)', alignItems: 'flex-start' }}>
          <div
            style={{
              flexShrink: 0,
              width: 40, height: 40, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(168, 0, 0, 0.1)', color: 'var(--clr-alert-red)', fontSize: '1.1rem',
            }}
            aria-hidden="true"
          >
            <FaExclamationTriangle />
          </div>
          <div>
            <h2 id="confirm-modal-title" className="modal-title" style={{ marginBottom: 6 }}>{title}</h2>
            <p className="modal-subtitle" style={{ fontSize: '0.85rem' }}>{message}</p>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy} autoFocus>
            {cancelLabel}
          </button>
          <button type="button" className="btn-danger" onClick={onConfirm} disabled={busy}>
            {busy ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  )
}
