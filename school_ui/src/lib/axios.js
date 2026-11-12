import axios from 'axios'

// ─── Base Axios Instance ────────────────────────────────────────────────────
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ─── Request Interceptor — Attach Auth Token ────────────────────────────────
axiosInstance.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('e_school_access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ─── Response Interceptor — Handle Global Errors ────────────────────────────
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      // Token expired or invalid — notify the UI so it can show the
      // "session expired" alert and let the user continue (log in again).
      window.dispatchEvent(new CustomEvent('session-expired'))
      // If no UI handler is mounted (e.g. during boot), fall back to a direct redirect.
      if (!window.__sessionTimeoutMounted) {
        sessionStorage.removeItem('e_school_access_token')
        sessionStorage.removeItem('e_school_user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default axiosInstance
