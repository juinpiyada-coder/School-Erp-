import { useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { FaTimes } from 'react-icons/fa'

/**
 * Standardized modal: overlay + panel with a header (title/subtitle + close),
 * a scrollable body, and a right-aligned footer. Handles:
 *   - ESC key to close
 *   - backdrop click to close
 *   - background scroll lock
 *   - basic focus trap + focus restore to the previously-focused element
 *
 * @param {boolean} isOpen
 * @param {string} title
 * @param {string|React.ReactNode} [subtitle]
 * @param {string} [size]              'sm' | 'md' | 'lg' (default 'md')
 * @param {React.ReactNode} [footer]   usually action buttons; default a Close button
 * @param {Function} onClose
 * @param {boolean} [closeOnBackdrop=true]
 * @param {boolean} [showCloseIcon=true]
 * @param {string} [ariaLabel]         used for role="dialog" labelling
 */
export default function Modal({
  isOpen,
  title,
  subtitle,
  size = 'md',
  footer,
  onClose,
  closeOnBackdrop = true,
  showCloseIcon = true,
  ariaLabel,
  children,
}) {
  const panelRef = useRef(null)
  const closeRef = useRef(null)
  const previousFocus = useRef(null)

  const SIZE_MAX_WIDTH = { sm: 420, md: 600, lg: 840 }

  const handleBackdrop = useCallback(
    (e) => {
      if (closeOnBackdrop && e.target === e.currentTarget) onClose?.()
    },
    [closeOnBackdrop, onClose]
  )

  // ESC key + background scroll lock + initial focus on open
  useEffect(() => {
    if (!isOpen) return

    previousFocus.current = document.activeElement

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose?.()
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
  }, [isOpen]) // Note: Don't depend on inline onClose functions which re-create on every keystroke


  if (!isOpen) return null

  return createPortal(
    <div className="modal-overlay" onClick={handleBackdrop}>
      <motion.div
        ref={panelRef}
        className="glass-panel modal-panel"
        style={{ maxWidth: SIZE_MAX_WIDTH[size] }}
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || title}
        aria-labelledby="modal-title"
      >
        {(title || showCloseIcon) && (
          <div className="modal-header">
            <div>
              {title && <h2 id="modal-title" className="modal-title">{title}</h2>}
              {subtitle && <p className="modal-subtitle">{subtitle}</p>}
            </div>
            {showCloseIcon && (
              <button
                ref={closeRef}
                type="button"
                className="btn-icon"
                onClick={onClose}
                aria-label="Close dialog"
              >
                <FaTimes />
              </button>
            )}
          </div>
        )}

        <div className="modal-body">{children}</div>

        {footer !== undefined && (
          <div className="modal-footer">{footer}</div>
        )}
      </motion.div>
    </div>,
    document.body
  )
}
