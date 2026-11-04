import axios from '../../lib/axios'
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'react-toastify'
import { motion } from 'framer-motion'
import { FaGraduationCap, FaExclamationTriangle, FaEye, FaEyeSlash, FaShieldAlt, FaArrowRight, FaCheckCircle } from 'react-icons/fa'
import loginIllustration from '../../assets/loginpage.png'
import brandLogo from '../../assets/logo.png'

export default function Login() {
  const navigate  = useNavigate()
  const location  = useLocation()

  const [form, setForm]       = useState({ email: '', password: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showDemoCredentials, setShowDemoCredentials] = useState(false)

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data: body } = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/login`, form)
      const { access_token, user } = body.data
      sessionStorage.setItem('e_school_access_token', access_token)
      sessionStorage.setItem('e_school_user', JSON.stringify(user))
      window.dispatchEvent(new Event('storage'))
      window.dispatchEvent(new CustomEvent('session-reset'))
      toast.success(`Welcome back, ${user.email || 'User'}!`)
      navigate('/', { replace: true })
    } catch (err) {
      const errMsg = err.response?.data?.message ?? 'Invalid credentials. Please check your email and password.'
      setError(errMsg)
      toast.error(errMsg)
      if (err.response?.status === 401) {
        setShowDemoCredentials(true)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-container">
        
        {/* Left Side: Visual Showcase with loginpage.png */}
        <motion.div 
          className="login-showcase-panel"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="login-showcase-content">
            <div className="login-brand-header">
              <div className="login-brand-icon" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', padding: '2px', borderRadius: '10px' }}>
                <img src={brandLogo} alt="School ERP Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div className="login-brand-text">
                <h3>MySkool ERP</h3>
                <span>Next-Gen School Management Platform</span>
              </div>
            </div>

            <div className="login-image-preview-wrapper">
              <img 
                src={loginIllustration} 
                alt="School ERP Management Illustration" 
                className="login-showcase-img"
              />
            </div>

            <div className="login-features-list">
              <div className="feature-badge"><FaCheckCircle className="text-success" /> Multi-Branch Architecture</div>
              <div className="feature-badge"><FaCheckCircle className="text-success" /> Realtime Student & Teacher Attendance</div>
              <div className="feature-badge"><FaCheckCircle className="text-success" /> Enterprise Role-Based Access</div>
            </div>
          </div>
        </motion.div>

        {/* Right Side: Clean White Interactive Login Form */}
        <motion.div 
          className="login-form-panel"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="login-form-card">
            
            <div className="login-card-header">
              <span className="login-badge-pill"><FaShieldAlt /> Secure Enterprise Portal</span>
              <h1 className="login-title">Sign In</h1>
              <p className="login-subtitle">Enter your institutional credentials to access your portal</p>
            </div>

            {error && (
              <motion.div 
                className="login-alert-error" 
                initial={{ opacity: 0, y: -5 }} 
                animate={{ opacity: 1, y: 0 }}
              >
                <FaExclamationTriangle />
                <span>{error}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label className="login-label" htmlFor="login-email">
                  Email Address or User ID <span className="form-required">*</span>
                </label>
                <input
                  id="login-email"
                  name="email"
                  type="text"
                  className="login-input"
                  placeholder="admin@myskool.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                  autoComplete="username"
                />
              </div>

              <div className="form-group">
                <div className="flex justify-between items-center mb-1">
                  <label className="login-label" htmlFor="login-password" style={{ marginBottom: 0 }}>
                    Password <span className="form-required">*</span>
                  </label>
                  <span className="login-forgot-link" onClick={() => toast.info('Please contact your center administrator to reset your password.')}>
                    Forgot password?
                  </span>
                </div>
                <div className="login-input-wrap">
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    className="login-input"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={handleChange}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="login-eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="login-submit-btn"
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="spinner-small" /> Authenticating…
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Sign In to Portal <FaArrowRight />
                  </span>
                )}
              </button>
            </form>

            <div className="login-footer-security">
              <span>🔒 256-bit SSL encrypted • Authorized school personnel only</span>
            </div>

            {showDemoCredentials && (
              <motion.div
                className="login-demo-credentials"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="login-demo-credentials-title">Demo Credentials (click to fill)</div>
                <div className="login-demo-credentials-grid">
                  <button type="button" className="login-demo-credential-item" onClick={() => { setForm({ email: 'super_admin@gmail.com', password: '123' }); setError('') }}>
                    <span className="login-demo-credential-label">Super Admin</span>
                    <span className="login-demo-credential-value">super_admin@gmail.com / 123</span>
                  </button>
                  <button type="button" className="login-demo-credential-item" onClick={() => { setForm({ email: 'school@eschool.com', password: '123' }); setError('') }}>
                    <span className="login-demo-credential-label">School Admin</span>
                    <span className="login-demo-credential-value">school@eschool.com / 123</span>
                  </button>
                  <button type="button" className="login-demo-credential-item" onClick={() => { setForm({ email: 'branch@eschool.com', password: '123' }); setError('') }}>
                    <span className="login-demo-credential-label">Branch Admin</span>
                    <span className="login-demo-credential-value">branch@eschool.com / 123</span>
                  </button>
                </div>
              </motion.div>
            )}

          </div>
        </motion.div>

      </div>
    </div>
  )
}

