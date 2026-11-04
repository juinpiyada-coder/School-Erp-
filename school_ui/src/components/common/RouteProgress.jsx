import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Minimal module-level pub/sub so any component (e.g. a Suspense wrapper
 * that finishes when the new route has actually rendered) can drive the bar.
 */
const listeners = new Set()

export function startRouteProgress() {
  listeners.forEach((fn) => fn('start'))
}

export function finishRouteProgress() {
  listeners.forEach((fn) => fn('done'))
}

/**
 * RouteProgress
 * A slim top-of-viewport progress bar shown on every route change.
 * It starts on navigation (immediate feedback) and completes when the
 * newly loaded route has finished rendering (see `finishRouteProgress()`
 * called by the `ProgressDone` helper in App.jsx).
 */
export default function RouteProgress() {
  const { pathname } = useLocation()
  const [visible, setVisible] = useState(false)
  const [pct, setPct] = useState(0)
  const doneRef = useRef(false)
  const startedAtRef = useRef(0)

  useEffect(() => {
    const onEvent = (type) => {
      if (type === 'start') {
        doneRef.current = false
        startedAtRef.current = Date.now()
        setPct(12)
        setVisible(true)
      } else if (type === 'done' && !doneRef.current) {
        doneRef.current = true
        // Keep the bar visible for a readable minimum, even on fast cached navigations.
        const elapsed = Date.now() - startedAtRef.current
        const delay = Math.max(0, 400 - elapsed)
        setTimeout(() => {
          setPct(100)
          setTimeout(() => setVisible(false), 250)
        }, delay)
      }
    }
    listeners.add(onEvent)
    return () => listeners.delete(onEvent)
  }, [])

  // Kick off on every navigation.
  useEffect(() => {
    startRouteProgress()
  }, [pathname])

  // Creep toward ~90% while the route is loading (decaying increments).
  useEffect(() => {
    if (!visible) return
    const id = setInterval(() => {
      if (doneRef.current) return
      setPct((p) => (p < 90 ? p + (90 - p) * 0.15 : p))
    }, 110)
    return () => clearInterval(id)
  }, [visible])

  // Safety net: never leave the bar stuck.
  useEffect(() => {
    if (!visible) return
    const t = setTimeout(() => {
      if (!doneRef.current) finishRouteProgress()
    }, 5000)
    return () => clearTimeout(t)
  }, [visible])

  return (
    <div
      className={`route-progress${visible ? ' route-progress-visible' : ''}`}
      aria-hidden="true"
    >
      <div className="route-progress-bar" style={{ width: `${pct}%` }} />
    </div>
  )
}
