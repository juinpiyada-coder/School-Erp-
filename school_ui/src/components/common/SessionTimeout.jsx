import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { toast } from 'react-toastify'
import { FaClock, FaRedo, FaSignOutAlt, FaExclamationTriangle } from 'react-icons/fa'
import axios from '../../lib/axios'

const WARNING_SECONDS = 60

function decodeTokenExp(token) {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    const data = JSON.parse(atob(padded))
    return typeof data.exp === 'number' ? data.exp : null
  } catch {
    return null
  }
}

function formatCountdown(seconds) {
  const s = Math.max(0, Math.ceil(seconds))
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

/**
 * SessionTimeout
 * Monitors the JWT `exp` claim. Shows a countdown warning 60s before the token
 * expires with a "Continue Session" button (refreshes the token via /auth/refresh).
 * If the token expires (or a 401 triggers the `session-expired` event), shows an
 * alert dialog so the user can choose to log in again to continue.
 */
export default function SessionTimeout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [remaining, setRemaining] = useState(null)
  const [state, setState] = useState('idle') // idle | warning | expired
  const [refreshing, setRefreshing] = useState(false)
  const expAtRef = useRef(null)

  const doLogout = () => {
    setState('idle')
    sessionStorage.removeItem('e_school_access_token')
    sessionStorage.removeItem('e_school_user')
    navigate('/login', { replace: true })
    // In case HashRouter is used or outside component tree:
    if (window.location.hash !== '#/login') {
      window.location.hash = '#/login'
    }
  }

  const updateRemaining = () => {
    if (!expAtRef.current) return
    setRemaining(Math.max(0, Math.round((expAtRef.current - Date.now()) / 1000)))
  }

  const syncFromToken = () => {
    const token = sessionStorage.getItem('e_school_access_token')
    const exp = token ? decodeTokenExp(token) : null
    if (!token || !exp) {
      expAtRef.current = null
      setRemaining(null)
      setState('idle')
      return
    }
    expAtRef.current = exp * 1000
    updateRemaining()
  }

  const handleContinue = async () => {
    setRefreshing(true)
    try {
      const token = sessionStorage.getItem('e_school_access_token')
      if (!token) {
        setState('expired')
        return
      }
      const { data: body } = await axios.post('/auth/refresh', null, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const newToken = body?.data?.access_token
      if (!newToken) {
        setState('expired')
        return
      }
      sessionStorage.setItem('e_school_access_token', newToken)
      toast.success('Your session has been extended.')
      syncFromToken()
      setState('idle')
    } catch {
      setState('expired')
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    window.__sessionTimeoutMounted = true
    syncFromToken()

    const onSessionExpired = () => setState('expired')
    const onSessionReset = () => {
      setState('idle')
      syncFromToken()
    }
    const onStorage = () => {
      syncFromToken()
    }

    window.addEventListener('session-expired', onSessionExpired)
    window.addEventListener('session-reset', onSessionReset)
    window.addEventListener('storage', onStorage)

    return () => {
      window.__sessionTimeoutMounted = false
      window.removeEventListener('session-expired', onSessionExpired)
      window.removeEventListener('session-reset', onSessionReset)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  // 1s countdown ticker
  useEffect(() => {
    if (state === 'expired') return
    const t = setInterval(() => updateRemaining(), 1000)
    return () => clearInterval(t)
  }, [state])

  // Drive modal state from remaining time
  useEffect(() => {
    if (remaining === null || state === 'expired') return
    if (remaining <= 0) setState('expired')
    else if (remaining <= WARNING_SECONDS) setState('warning')
    else setState('idle')
  }, [remaining, state])

  if (state === 'idle' || location.pathname === '/login' || window.location.hash.includes('/login')) return null

  const isWarning = state === 'warning'

  return createPortal(
    <div className="modal-overlay" role="alertdialog" aria-modal="true">
      <motion.div
        className="glass-panel modal-container"
        style={{ maxWidth: '420px', textAlign: 'center' }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="modal-header" style={{ justifyContent: 'center', borderBottom: 'none' }}>
          <h2 className="modal-title">
            {isWarning ? (
              <>
                <FaClock style={{ marginRight: '8px', color: '#f39c12' }} />
                Session About to Expire
              </>
            ) : (
              <>
                <FaExclamationTriangle style={{ marginRight: '8px', color: '#e74c3c' }} />
                Session Expired
              </>
            )}
          </h2>
        </div>
        <div className="modal-body" style={{ paddingTop: 0 }}>
          {isWarning ? (
            <>
              <p className="text-muted" style={{ marginBottom: '1rem' }}>
                Your session will expire in <strong>{formatCountdown(remaining)}</strong>.
              </p>
              <p className="text-muted" style={{ fontSize: '0.82rem' }}>
                Click &ldquo;Continue Session&rdquo; to stay signed in, or log out now.
              </p>
            </>
          ) : (
            <p className="text-muted">
              Your session has timed out. Please log in again to continue.
            </p>
          )}
        </div>
        <div className="modal-footer" style={{ justifyContent: 'center', borderTop: 'none' }}>
          {isWarning ? (
            <>
              <button className="btn-secondary" onClick={doLogout}>
                <FaSignOutAlt style={{ marginRight: '6px' }} /> Log Out
              </button>
              <button className="btn-primary" onClick={handleContinue} disabled={refreshing}>
                {refreshing ? (
                  <>
                    <span className="spinner" style={{ marginRight: '6px' }} /> Refreshing&hellip;
                  </>
                ) : (
                  <>
                    <FaRedo style={{ marginRight: '6px' }} /> Continue Session
                  </>
                )}
              </button>
            </>
          ) : (
            <button className="btn-primary" onClick={doLogout}>
              Continue to Login
            </button>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  )
}
