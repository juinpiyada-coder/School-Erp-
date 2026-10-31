import { useState, useEffect, useRef } from 'react'
import axios from '../../lib/axios'
import { motion } from 'framer-motion'
import { toast } from 'react-toastify'
import { FaSave, FaImage, FaPalette, FaBuilding, FaMoon, FaSun, FaUserCircle, FaCamera, FaTimes, FaUser } from 'react-icons/fa'
import { useTheme } from '../../contexts/ThemeContext'

export default function Settings() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [profileSaving, setProfileSaving] = useState(false)
  const profileFileInputRef = useRef(null)
  
  const [userRole, setUserRole] = useState('')
  const [currentUser, setCurrentUser] = useState({})
  
  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    user_first_name: '',
    user_last_name: '',
    user_email_id: '',
    user_img: ''
  })

  // White Label Form State
  const [form, setForm] = useState({
    appName: '',
    primaryColor: '#2B88D8',
    secondaryColor: '#f8f9fa',
    logo_base64: null,
    banner_base64: null
  })
  
  const [bmnId, setBmnId] = useState('')
  const [brnId, setBrnId] = useState('')

  useEffect(() => {
    // Get user from session
    const userStr = sessionStorage.getItem('e_school_user')
    let currentBmnId = ''
    let currentBrnId = ''
    let role = ''
    let userObj = {}
    
    if (userStr) {
      try {
        userObj = JSON.parse(userStr)
        setCurrentUser(userObj)
        role = (userObj.user_role || userObj.role || userObj.role_id || '').toLowerCase()
        currentBmnId = userObj.school_id || userObj.MAS_bmn_id || userObj.SCHL_MN_ID || userObj.bmn_id || userObj.center_id || (role.includes('school') ? (userObj.id || userObj.user_id || userObj.userId) : '') || ''
        currentBrnId = userObj.branch_id || userObj.MAS_brn_id || userObj.SCHL_BR_ID || userObj.brn_id || (role.includes('branch') ? (userObj.id || userObj.user_id || userObj.userId) : '') || ''
        
        setProfileForm({
          user_first_name: userObj.first_name || userObj.user_first_name || userObj.USER_FIRST_NAME || '',
          user_last_name: userObj.last_name || userObj.user_last_name || userObj.USER_LAST_NAME || '',
          user_email_id: userObj.email || userObj.user_email_id || '',
          user_img: userObj.user_img || userObj.USER_IMG || ''
        })
      } catch (err) {}
    }
    
    setUserRole(role)
    setBmnId(currentBmnId)
    setBrnId(currentBrnId)
    
    fetchSettings(currentBmnId, currentBrnId)
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/auth/me`)
      const data = res.data?.data || res.data
      if (data) {
        setProfileForm({
          user_first_name: data.user_first_name || data.USER_FIRST_NAME || '',
          user_last_name: data.user_last_name || data.USER_LAST_NAME || '',
          user_email_id: data.user_email_id || '',
          user_img: data.user_img || data.USER_IMG || ''
        })
      }
    } catch (e) {
      // Fall back to session user
    }
  }

  const fetchSettings = async (currentBmnId, currentBrnId) => {
    try {
      setFetching(true)
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/settings/whitelabel`, {
        params: { bmn_id: currentBmnId, brn_id: currentBrnId }
      })
      const data = res.data?.data
      if (data) {
        setForm(prev => ({
          ...prev,
          appName: data.WL_DESC?.appName || '',
          primaryColor: data.WL_DESC?.primaryColor || '#005A9E',
          secondaryColor: data.WL_DESC?.secondaryColor || '#0078D4',
          logo_base64: data.WL_IMG_BASE64 || null,
          banner_base64: data.WL_BANNER_BASE64 || null
        }))
      }
    } catch (err) {
      // Non-critical
    } finally {
      setFetching(false)
    }
  }

  const handleProfileImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, WebP, etc.)')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB')
      return
    }
    const reader = new FileReader()
    reader.onload = (event) => {
      setProfileForm(prev => ({ ...prev, user_img: event.target.result }))
    }
    reader.readAsDataURL(file)
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setProfileSaving(true)
    try {
      const res = await axios.put(`${import.meta.env.VITE_API_BASE_URL}/auth/profile`, profileForm)
      const updatedUser = res.data?.data || res.data
      
      // Update sessionStorage
      const existing = JSON.parse(sessionStorage.getItem('e_school_user') || '{}')
      const merged = {
        ...existing,
        first_name: profileForm.user_first_name,
        last_name: profileForm.user_last_name,
        user_first_name: profileForm.user_first_name,
        user_last_name: profileForm.user_last_name,
        name: `${profileForm.user_first_name} ${profileForm.user_last_name}`.trim() || existing.id || 'User',
        email: profileForm.user_email_id,
        user_email_id: profileForm.user_email_id,
        user_img: profileForm.user_img
      }
      sessionStorage.setItem('e_school_user', JSON.stringify(merged))
      setCurrentUser(merged)
      
      // Dispatch events so Header/Sidebar reload avatar immediately
      window.dispatchEvent(new Event('storage'))
      window.dispatchEvent(new CustomEvent('user-profile-updated'))
      
      toast.success('Profile and photo updated successfully!')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update profile')
    } finally {
      setProfileSaving(false)
    }
  }

  const handleImageChange = (e, field) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, [field]: reader.result }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const isSuperAdmin = userRole.includes('super')
  const isSchoolAdmin = userRole.includes('school') || (userRole.includes('admin') && !userRole.includes('branch') && !isSuperAdmin)
  const isBranchAdmin = userRole.includes('branch')
  const canEditBranding = isSuperAdmin || isSchoolAdmin || isBranchAdmin

  const handleSubmitBranding = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const targetBmn = isSuperAdmin ? null : bmnId
      const targetBrn = isBranchAdmin ? brnId : null

      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/settings/whitelabel`, {
        bmn_id: targetBmn,
        brn_id: targetBrn,
        settings: {
          appName: form.appName,
          primaryColor: form.primaryColor,
          secondaryColor: form.secondaryColor
        },
        logo_base64: form.logo_base64,
        banner_base64: form.banner_base64
      })
      toast.success('White label settings updated successfully!')
      
      window.dispatchEvent(new Event('refreshWhitelabel'))
      
      document.documentElement.style.setProperty('--primary-color', form.primaryColor)
      document.documentElement.style.setProperty('--clr-primary', form.primaryColor)
      document.documentElement.style.setProperty('--clr-primary-hover', form.primaryColor)
      document.documentElement.style.setProperty('--clr-sidebar-active', `${form.primaryColor}88`)
      document.documentElement.style.setProperty('--secondary-color', form.secondaryColor)
      document.documentElement.style.setProperty('--clr-secondary', form.secondaryColor)
      document.documentElement.style.setProperty('--clr-tertiary', form.secondaryColor)
      
    } catch (err) {
      toast.error('Failed to update settings')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '300px' }}>
        <h3>Loading Settings...</h3>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="page-card glass-panel" style={{ padding: '30px' }}>
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <div>
          <h1 className="page-title">Settings &amp; Preferences</h1>
          <p className="page-subtitle">
            Manage your personal profile photo, account credentials, and system branding.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '12px',
        borderBottom: '1px solid var(--clr-border)',
        marginBottom: '24px',
        paddingBottom: '8px'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            background: activeTab === 'profile' ? 'var(--clr-primary)' : 'transparent',
            color: activeTab === 'profile' ? '#fff' : 'var(--clr-text-primary)',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.9rem'
          }}
        >
          <FaUser /> My Profile &amp; Avatar
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('branding')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            background: activeTab === 'branding' ? 'var(--clr-primary)' : 'transparent',
            color: activeTab === 'branding' ? '#fff' : 'var(--clr-text-primary)',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.9rem'
          }}
        >
          <FaPalette /> Appearance &amp; Branding
        </button>
      </div>

      {/* ── TAB 1: My Profile & Avatar ──────────────────────────── */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '600px' }}>
          
          {/* User Image Upload Section */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            padding: '16px 20px',
            background: 'var(--clr-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--clr-border)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
          }}>
            <div style={{ position: 'relative' }}>
              {profileForm.user_img ? (
                <img
                  src={profileForm.user_img}
                  alt="My Profile Avatar"
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2.5px solid var(--clr-primary)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                />
              ) : (
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'rgba(0, 90, 158, 0.08)',
                  color: 'var(--clr-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.2rem',
                  border: '2px solid rgba(0, 90, 158, 0.2)'
                }}>
                  <FaUserCircle />
                </div>
              )}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '4px' }}>
                Profile Photo
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--clr-text-muted)', marginBottom: '10px' }}>
                Upload your picture to display in the header bar, user directory, and messages (PNG, JPG, WebP max 2MB).
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input
                  type="file"
                  ref={profileFileInputRef}
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleProfileImageUpload}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '6px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => profileFileInputRef.current?.click()}
                >
                  <FaCamera /> {profileForm.user_img ? 'Change Photo' : 'Upload Photo'}
                </button>
                {profileForm.user_img && (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '6px 14px', fontSize: '0.82rem', color: 'var(--clr-danger)', display: 'flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => setProfileForm(prev => ({ ...prev, user_img: '' }))}
                  >
                    <FaTimes /> Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="form-row-2col">
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>First Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. John"
                value={profileForm.user_first_name}
                onChange={(e) => setProfileForm({ ...profileForm, user_first_name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Last Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Doe"
                value={profileForm.user_last_name}
                onChange={(e) => setProfileForm({ ...profileForm, user_last_name: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Email Address</label>
            <input
              type="email"
              className="form-control"
              placeholder="e.g. john@school.edu"
              value={profileForm.user_email_id}
              onChange={(e) => setProfileForm({ ...profileForm, user_email_id: e.target.value })}
              required
            />
          </div>

          <div style={{ marginTop: '10px' }}>
            <button
              type="submit"
              disabled={profileSaving}
              className="btn-primary"
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                fontWeight: 'bold',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <FaSave /> {profileSaving ? 'Saving Profile...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      )}

      {/* ── TAB 2: Appearance & White Label ──────────────────────────── */}
      {activeTab === 'branding' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '600px' }}>
          
          {/* Appearance / Theme Toggle */}
          <div style={{ padding: '20px', border: '1px solid var(--clr-glass-border)', borderRadius: '10px', background: 'var(--clr-surface)' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem', marginBottom: '12px' }}>
              <FaMoon /> Appearance Mode
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '0.92rem', color: 'var(--clr-text-muted)' }}>
                <span style={{ fontWeight: 700, color: 'var(--clr-text-primary)' }}>{isDark ? 'Dark Mode is currently active.' : 'Light Mode is currently active.'}</span>
                <br />
                <span>Switch between dark and light themes for your session.</span>
              </div>
              <button
                type="button"
                id="settings-theme-toggle"
                onClick={toggleTheme}
                className="btn-primary"
                style={{ padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
              >
                {isDark ? <FaSun style={{ marginRight: '6px' }} /> : <FaMoon style={{ marginRight: '6px' }} />}
                Switch to {isDark ? 'Light' : 'Dark'} Mode
              </button>
            </div>
          </div>

          {canEditBranding && (
            <form onSubmit={handleSubmitBranding} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {!isBranchAdmin && (
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaBuilding /> {isSchoolAdmin ? 'School / Institution Name' : 'Application Name'} <span className="form-required">*</span>
                  </label>
                  <input 
                    type="text" 
                    name="appName" 
                    value={form.appName} 
                    onChange={handleChange} 
                    placeholder={isSchoolAdmin ? 'e.g. Springfield International School' : 'e.g. MySkool ERP'}
                    className="form-control"
                    required
                  />
                </div>
              )}

              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaPalette /> Primary Brand Color <span className="form-required">*</span>
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input 
                    type="color" 
                    name="primaryColor" 
                    value={form.primaryColor} 
                    onChange={handleChange} 
                    style={{ padding: '0', border: 'none', width: '50px', height: '40px', borderRadius: '6px', cursor: 'pointer' }}
                    required
                  />
                  <input 
                    type="text" 
                    name="primaryColor" 
                    value={form.primaryColor} 
                    onChange={handleChange} 
                    className="form-control"
                    style={{ flex: 1, fontFamily: 'monospace' }}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaPalette /> Secondary / Accent Color <span className="form-required">*</span>
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input 
                    type="color" 
                    name="secondaryColor" 
                    value={form.secondaryColor} 
                    onChange={handleChange} 
                    style={{ padding: '0', border: 'none', width: '50px', height: '40px', borderRadius: '6px', cursor: 'pointer' }}
                    required
                  />
                  <input 
                    type="text" 
                    name="secondaryColor" 
                    value={form.secondaryColor} 
                    onChange={handleChange} 
                    className="form-control"
                    style={{ flex: 1, fontFamily: 'monospace' }}
                    required
                  />
                </div>
              </div>

              {!isBranchAdmin && (
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <FaImage /> {isSchoolAdmin ? 'School Logo' : 'Organization Logo'}
                  </label>
                  {form.logo_base64 && (
                    <div style={{ marginBottom: '15px' }}>
                      <img src={form.logo_base64} alt="Current Logo" style={{ maxHeight: '90px', borderRadius: '8px', border: '1px solid var(--clr-border)', padding: '10px', background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }} />
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/png, image/jpeg" 
                    onChange={(e) => handleImageChange(e, 'logo_base64')}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '2px dashed #ccc', background: 'var(--clr-surface)', cursor: 'pointer' }}
                  />
                  <small style={{ color: '#888', display: 'block' }}>Recommended size: 200x50px (PNG or JPG)</small>
                </div>
              )}

              {!isBranchAdmin && (
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <FaImage /> {isSchoolAdmin ? 'School Dashboard Banner' : 'Dashboard Hero Banner'}
                  </label>
                  {form.banner_base64 && (
                    <div style={{ marginBottom: '15px', width: '100%', overflow: 'hidden', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                      <img src={form.banner_base64} alt="Current Banner" style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', display: 'block' }} />
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/png, image/jpeg" 
                    onChange={(e) => handleImageChange(e, 'banner_base64')}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '2px dashed #ccc', background: 'var(--clr-surface)', cursor: 'pointer' }}
                  />
                  <small style={{ color: '#888', display: 'block' }}>
                    {isSchoolAdmin 
                      ? 'Sets the default dashboard banner visible to your school, branches, and affiliated users.' 
                      : 'Sets the Super Admin portal dashboard hero banner.'}
                  </small>
                </div>
              )}

              <div style={{ marginTop: '10px', paddingBottom: '20px' }}>
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="btn-primary"
                  style={{
                    padding: '12px 28px',
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '1rem',
                    opacity: loading ? 0.7 : 1
                  }}
                >
                  <FaSave /> {loading ? 'Saving...' : isBranchAdmin ? 'Save Branch Color Scheme' : isSchoolAdmin ? 'Save School White Label' : 'Save White Label Settings'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </motion.div>
  )
}
