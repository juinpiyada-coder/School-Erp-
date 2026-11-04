import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'

const RealtimeContext = createContext(null)

/**
 * RealtimeProvider manages live data synchronization.
 * It provides:
 * 1. Native WebSocket connectivity if a WS server is configured (VITE_WS_URL)
 * 2. Automatic Smart Heartbeat Polling fallback (every 20s or on window focus)
 * 3. An event bus: emit('data-updated', { resource: 'notifications' | 'routine' | 'attendance' | 'all' })
 * 4. useRealtimeResource(resourceName, callback) hook for components to subscribe.
 */
export function RealtimeProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState(null)
  const socketRef = useRef(null)
  const listenersRef = useRef(new Map())
  const reconnectTimeoutRef = useRef(null)

  const wsUrl = import.meta.env.VITE_WS_URL || null

  // Broadcast an update to local subscribers and cross-tab via BroadcastChannel
  const broadcastChange = useCallback((resource, payload = {}) => {
    const eventData = { resource, payload, timestamp: Date.now() }
    setLastEvent(eventData)

    // Notify registered component callbacks
    const resourceListeners = listenersRef.current.get(resource) || []
    const allListeners = listenersRef.current.get('*') || []
    ;[...resourceListeners, ...allListeners].forEach((cb) => {
      try { cb(eventData) } catch (e) { console.error('Listener error:', e) }
    })

    // Broadcast across other browser tabs
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('school_erp_realtime_sync')
        bc.postMessage(eventData)
        bc.close()
      }
    } catch (e) {}

    // Send over WebSocket if connected
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(JSON.stringify({ type: 'publish', ...eventData }))
      } catch (e) {}
    }
  }, [])

  // Subscribe callback to a specific resource (e.g., 'routine', 'notifications', 'attendance')
  const subscribe = useCallback((resource, callback) => {
    if (!listenersRef.current.has(resource)) {
      listenersRef.current.set(resource, [])
    }
    listenersRef.current.get(resource).push(callback)

    return () => {
      const list = listenersRef.current.get(resource) || []
      listenersRef.current.set(
        resource,
        list.filter((cb) => cb !== callback)
      )
    }
  }, [])

  // 1. Cross-tab real-time listener (Instant sync across tabs)
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    const bc = new BroadcastChannel('school_erp_realtime_sync')
    bc.onmessage = (e) => {
      const eventData = e.data
      if (eventData?.resource) {
        setLastEvent(eventData)
        const resourceListeners = listenersRef.current.get(eventData.resource) || []
        const allListeners = listenersRef.current.get('*') || []
        ;[...resourceListeners, ...allListeners].forEach((cb) => {
          try { cb(eventData) } catch (err) {}
        })
      }
    }
    return () => bc.close()
  }, [])

  // 2. WebSocket Connection (if VITE_WS_URL is provided)
  useEffect(() => {
    if (!wsUrl) return

    let isUnmounted = false
    const connect = () => {
      try {
        const ws = new WebSocket(wsUrl)
        socketRef.current = ws

        ws.onopen = () => {
          if (!isUnmounted) setIsConnected(true)
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data?.resource) {
              setLastEvent(data)
              const resourceListeners = listenersRef.current.get(data.resource) || []
              const allListeners = listenersRef.current.get('*') || []
              ;[...resourceListeners, ...allListeners].forEach((cb) => cb(data))
            }
          } catch (e) {}
        }

        ws.onclose = () => {
          if (!isUnmounted) {
            setIsConnected(false)
            reconnectTimeoutRef.current = setTimeout(connect, 5000)
          }
        }

        ws.onerror = () => {
          try { ws.close() } catch (e) {}
        }
      } catch (err) {
        if (!isUnmounted) {
          reconnectTimeoutRef.current = setTimeout(connect, 5000)
        }
      }
    }

    connect()

    return () => {
      isUnmounted = true
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (socketRef.current) {
        socketRef.current.close()
      }
    }
  }, [wsUrl])

  // 3. Fallback: Auto-refresh on Window Focus & Heartbeat sync
  useEffect(() => {
    const handleFocus = () => {
      // User returned to this tab -> ping subscribers to refresh stale data
      broadcastChange('*', { reason: 'window-focus' })
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [broadcastChange])

  return (
    <RealtimeContext.Provider
      value={{
        isConnected,
        lastEvent,
        broadcastChange,
        subscribe
      }}
    >
      {children}
    </RealtimeContext.Provider>
  )
}

/**
 * Hook for UI components to listen to real-time data changes
 * Usage:
 * useRealtimeSubscription('routine', () => fetchRoutines())
 * useRealtimeSubscription('notifications', () => fetchNotifications())
 */
export function useRealtimeSubscription(resource, onUpdate) {
  const context = useContext(RealtimeContext)
  useEffect(() => {
    if (!context || !onUpdate) return
    const unsubscribe = context.subscribe(resource, onUpdate)
    return () => unsubscribe()
  }, [context, resource, onUpdate])
}

export function useRealtime() {
  return useContext(RealtimeContext)
}

