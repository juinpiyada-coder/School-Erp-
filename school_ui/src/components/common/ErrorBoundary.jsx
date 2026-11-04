import { Component } from 'react'
import { FaExclamationTriangle, FaRedoAlt, FaHome } from 'react-icons/fa'

/**
 * Friendly full-screen error boundary. Catches render-time errors anywhere
 * below it and offers "Try again" (reset) or "Go home". Also exposes a
 * fallback for API-level failures via the `ApiErrorState` helper below.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    const isChunkLoadError = 
      error?.name === 'ChunkLoadError' ||
      /Failed to fetch dynamically imported module/i.test(error?.message || '') ||
      /Expected a JavaScript-or-Wasm module script/i.test(error?.message || '')

    if (isChunkLoadError && !window.sessionStorage.getItem('chunk_failed_refreshed')) {
      window.sessionStorage.setItem('chunk_failed_refreshed', 'true')
      window.location.reload()
      return { hasError: false, message: '' }
    }

    return { hasError: true, message: error?.message || 'Something went wrong.' }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught an error:', error, info)
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="error-page" role="alert">
        <div className="glass-panel error-page-card">
          <div className="error-page-icon"><FaExclamationTriangle /></div>
          <h1 className="error-page-title">Something went wrong</h1>
          <p className="error-page-message">{this.state.message}</p>
          <div className="error-page-actions">
            <button type="button" className="btn-primary" onClick={this.handleReset}>
              <FaRedoAlt /> Try Again
            </button>
            <button type="button" className="btn-secondary" onClick={() => window.location.assign(window.location.pathname + window.location.hash)}>
              <FaHome /> Go Home
            </button>
          </div>
        </div>
      </div>
    )
  }
}

/**
 * Lightweight inline error state for pages whose API calls fail, with a
 * retry button wired to the caller's refetch function.
 *
 * @param {string} message
 * @param {Function} onRetry
 */
export function ApiErrorState({ message = 'We couldn\u2019t load this data. Please try again.', onRetry }) {
  return (
    <div className="api-error-state" role="alert">
      <div className="api-error-icon"><FaExclamationTriangle /></div>
      <p className="api-error-message">{message}</p>
      {onRetry && (
        <button type="button" className="btn-secondary" onClick={onRetry}>
          <FaRedoAlt /> Retry
        </button>
      )}
    </div>
  )
}
