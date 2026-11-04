import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FaSignInAlt, FaHome, FaLock } from 'react-icons/fa'
import { toast } from 'react-toastify'
import unauthorizedSvg from '../../assets/You Dont Have The Acess.svg'

export default function Unauthorized() {
  const navigate = useNavigate()

  const handleLoginRedirect = () => {
    // Optionally clear session tokens if returning to login from a 403 state
    sessionStorage.removeItem('e_school_access_token')
    sessionStorage.removeItem('e_school_user')
    toast.info('Redirecting to login portal...')
    navigate('/login')
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      background: 'radial-gradient(circle at top right, rgba(239, 68, 68, 0.08), transparent 40%), radial-gradient(circle at bottom left, rgba(59, 130, 246, 0.08), transparent 40%), var(--bg-default, #0f172a)',
      color: 'var(--text-main, #f8fafc)'
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="glass-panel"
        style={{
          maxWidth: '560px',
          width: '100%',
          padding: '3rem 2.5rem',
          textAlign: 'center',
          borderRadius: '24px',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45), 0 0 30px rgba(239, 68, 68, 0.1)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Top Accent Line */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #ef4444, #f97316, #ef4444)'
        }} />

        {/* 403 Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          background: 'rgba(239, 68, 68, 0.15)',
          color: '#ef4444',
          borderRadius: '30px',
          fontWeight: '700',
          fontSize: '0.85rem',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          marginBottom: '1.5rem',
          border: '1px solid rgba(239, 68, 68, 0.3)'
        }}>
          <FaLock style={{ fontSize: '0.8rem' }} /> Error 403 - Access Denied
        </div>

        {/* Custom SVG Artwork */}
        <div style={{ margin: '0 auto 2rem', display: 'flex', justifyContent: 'center' }}>
          <img
            src={unauthorizedSvg}
            alt="403 You Don't Have Access"
            style={{
              maxHeight: '220px',
              width: 'auto',
              filter: 'drop-shadow(0 15px 25px rgba(0,0,0,0.35))',
              transition: 'transform 0.3s ease'
            }}
          />
        </div>

        {/* Heading & Explanation */}
        <h1 style={{
          fontSize: '1.85rem',
          fontWeight: '800',
          marginBottom: '0.75rem',
          letterSpacing: '-0.02em',
          background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          You Are Not Authorized
        </h1>
        
        <p style={{
          fontSize: '0.95rem',
          lineHeight: 1.6,
          color: 'var(--text-muted, #94a3b8)',
          marginBottom: '2.5rem',
          padding: '0 1rem'
        }}>
          Your current user profile does not possess the administrative privileges required to view or modify this resource. Please return to the login screen with an authorized account or head back to your assigned dashboard.
        </p>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '16px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLoginRedirect}
            className="btn-primary"
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.95rem',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              border: 'none',
              cursor: 'pointer',
              color: '#ffffff',
              boxShadow: '0 4px 15px rgba(239, 68, 68, 0.35)'
            }}
          >
            <FaSignInAlt /> Return to Login
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/')}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.95rem',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              cursor: 'pointer',
              color: '#f8fafc',
              transition: 'background 0.2s ease'
            }}
          >
            <FaHome /> Go to Dashboard
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}
