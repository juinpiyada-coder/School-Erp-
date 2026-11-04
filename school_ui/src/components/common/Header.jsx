import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FaBell, FaCommentAlt, FaChevronDown, FaSignOutAlt, FaUserCog, FaEnvelope, FaBars } from 'react-icons/fa'
import { toast } from 'react-toastify'

const ROUTE_META = {
  '/':                              { title: 'Dashboard',               breadcrumb: ['Home'] },
  '/user/roles':                    { title: 'Roles',                   breadcrumb: ['User Management', 'Roles'] },
  '/user/logins':                   { title: 'User Login',              breadcrumb: ['User Management', 'User Login'] },
  '/school/details':                { title: 'School Details',          breadcrumb: ['School Management', 'School Details'] },
  '/school/branches':               { title: 'Branches',                breadcrumb: ['School Management', 'Branches'] },
  '/school/rooms':                  { title: 'Rooms',                   breadcrumb: ['School Management', 'Rooms'] },
  '/school/classes':                { title: 'Classes',                 breadcrumb: ['School Management', 'Classes'] },
  '/school/sessions':               { title: 'Class Session & Section', breadcrumb: ['School Management', 'Session & Section'] },
  '/school/subjects':               { title: 'Subjects',                breadcrumb: ['School Management', 'Subjects'] },
  '/teacher/teachers':              { title: 'Teachers',                breadcrumb: ['Teacher Management', 'Teachers'] },
  '/teacher/mapping':               { title: 'Teacher Subject Mapping', breadcrumb: ['Teacher Management', 'Subject Mapping'] },
  '/parent/parents':                { title: 'Parents',                 breadcrumb: ['Parent Management', 'Parents'] },
  '/student/students':              { title: 'Students',                breadcrumb: ['Student Management', 'Students'] },
  '/academic/schedule':             { title: 'Class Schedule',          breadcrumb: ['Academic Management', 'Class Schedule'] },
  '/academic/teacher-attendance':   { title: 'Teacher Attendance',      breadcrumb: ['Academic Management', 'Teacher Attendance'] },
  '/academic/student-attendance':   { title: 'Student Attendance',      breadcrumb: ['Academic Management', 'Student Attendance'] },
  '/reports':                       { title: 'Reports',                 breadcrumb: ['System', 'Reports'] },
  '/settings':                      { title: 'Settings',                breadcrumb: ['System', 'Settings'] },
  '/notifications':                 { title: 'Notifications',           breadcrumb: ['System', 'Notifications'] },
  '/login':                         { title: 'Sign In',                 breadcrumb: [] },
}

const BREADCRUMB_LINKS = {
  'User Management': '/user/roles',
  'School Management': '/school/details',
  'Teacher Management': '/teacher/teachers',
  'Parent Management': '/parent/parents',
  'Student Management': '/student/students',
  'Academic Management': '/academic/schedule',
  'System': '/settings',
}

export default function Header() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const profileRef = useRef(null)
  const notifRef = useRef(null)

  const [userData, setUserData] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('e_school_user')) || {}
    } catch (e) {
      return {}
    }
  })

  const meta = ROUTE_META[pathname] ?? { title: null, breadcrumb: [] }

  const getHeaderTitle = () => {
    if (meta.title && meta.title !== 'E-School Admin') {
      return meta.title
    }
    const branchName = userData?.branch_name || userData?.SCHL_BR_NM || userData?.branchName
    const schoolName = userData?.school_name || userData?.schl_mn_nm || userData?.center_name || userData?.schoolName
    if (branchName) {
      return `${branchName}${schoolName ? ` · ${schoolName}` : ''}`
    }
    return schoolName || 'Student Portal'
  }

  const headerDisplayTitle = getHeaderTitle()

  const [liveNotifs, setLiveNotifs] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const badgeCount = unreadCount > 99 ? '99+' : unreadCount

  useEffect(() => {
    const fetchHeaderNotifs = async () => {
      try {
        const token = sessionStorage.getItem('e_school_access_token')
        if (!token) return
        const res = await fetch((import.meta.env.VITE_API_BASE_URL || '/api') + '/notifications?limit=5', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        if (data?.data) {
          setLiveNotifs(data.data)
          setUnreadCount(data?.pagination?.total || data.data.length || 0)
        }
      } catch (err) {}
    }
    fetchHeaderNotifs()
  }, [pathname])

  // Close dropdowns on outside click / Esc
  useEffect(() => {
    const onClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setProfileOpen(false)
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  useEffect(() => {
    const handleStorage = () => {
      try {
        setUserData(JSON.parse(sessionStorage.getItem('e_school_user')) || {})
      } catch (e) {}
    }
    window.addEventListener('storage', handleStorage)
    window.addEventListener('session-reset', handleStorage)
    window.addEventListener('user-profile-updated', handleStorage)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('session-reset', handleStorage)
      window.removeEventListener('user-profile-updated', handleStorage)
    }
  }, [])

  const userName = userData?.name || userData?.full_name || userData?.email?.split('@')[0] || 'User'
  const userEmail = userData?.email || userData?.user_email_id || ''
  const userRole = userData?.user_role || userData?.role || 'User'
  const userImg = userData?.user_img || userData?.USER_IMG || null

  const formatRole = (roleStr) => {
    let formatted = String(roleStr || '').replace(/^R_/, '').replace(/_/g, ' ')
    formatted = formatted.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
    formatted = formatted.replace('Schooladmin', 'School Admin').replace('Branchadmin', 'Branch Admin')
    return formatted || 'User'
  }

  const activeRoleId = userData?.role_id || (userData?.user_role ? userData.user_role.split(',')[0].trim() : '') || 'R_SUPERADMIN'
  const activeRoleDesc = userData?.role || formatRole(activeRoleId)
  const displayRole = activeRoleDesc

  // Extract all available roles assigned to this user
  let availableRoles = []
  if (Array.isArray(userData?.assigned_roles) && userData.assigned_roles.length > 0) {
    availableRoles = userData.assigned_roles.map(r => ({
      role_id: r.role_id,
      role_name: r.role_name || formatRole(r.role_id)
    }))
  } else if (userData?.user_role && userData.user_role.includes(',')) {
    const splitRoles = userData.user_role.split(',').map(r => r.trim()).filter(Boolean)
    availableRoles = splitRoles.map(r => ({
      role_id: r,
      role_name: formatRole(r)
    }))
  } else if (userData?.user_role || userData?.role_id) {
    const singleRole = userData?.role_id || userData?.user_role
    availableRoles = [{
      role_id: singleRole,
      role_name: userData?.role || formatRole(singleRole)
    }]
  }

  const handleSwitchRole = (newRole) => {
    try {
      const updatedUser = {
        ...userData,
        role_id: newRole.role_id,
        role: newRole.role_name,
        user_role: newRole.role_id
      }
      sessionStorage.setItem('e_school_user', JSON.stringify(updatedUser))
      setUserData(updatedUser)
      setProfileOpen(false)

      toast.success(`Switched profile to ${newRole.role_name}`)

      // Dispatch events for all subscribers (Sidebar, Dashboard, etc.)
      window.dispatchEvent(new Event('user-profile-updated'))
      window.dispatchEvent(new Event('session-reset'))
      window.dispatchEvent(new Event('role-links-updated'))
      window.dispatchEvent(new Event('storage'))

      // Navigate to dashboard root to reload correct layout and charts
      navigate('/')
    } catch (e) {
      console.error('Error switching profile:', e)
    }
  }

  const initials = userName.substring(0, 2).toUpperCase()

  const handleLogout = () => {
    sessionStorage.removeItem('e_school_access_token')
    sessionStorage.removeItem('e_school_user')
    toast.info('Logged out successfully.')
    setProfileOpen(false)
    navigate('/login')
  }

  return (
    <header className="header" role="banner">
      {/* ── Left: Page Identity ──────────────────────────────── */}
      <div className="header-left">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="mobile-sidebar-toggle"
            aria-label="Toggle Navigation Menu"
            onClick={() => window.dispatchEvent(new Event('toggle-mobile-sidebar'))}
          >
            <FaBars size={18} />
          </button>
          <h1 className="header-page-title">{headerDisplayTitle}</h1>
        </div>
        {meta.breadcrumb.length > 0 && (
          <nav className="header-breadcrumb" aria-label="Breadcrumb">
            {meta.breadcrumb.map((crumb, i) => {
              const isLast = i === meta.breadcrumb.length - 1
              const target = BREADCRUMB_LINKS[crumb]
              return (
                <span key={crumb}>
                  {target && !isLast ? (
                    <button type="button" className="header-breadcrumb-link" onClick={() => navigate(target)}>
                      {crumb}
                    </button>
                  ) : (
                    <span className={isLast ? 'header-breadcrumb-current' : ''}>{crumb}</span>
                  )}
                  {!isLast && <span aria-hidden="true"> / </span>}
                </span>
              )
            })}
          </nav>
        )}
      </div>

      {/* ── Right: Controls ──────────────────────────────────── */}
      <div className="header-right">
        {/* Time Display */}
        <div className="text-muted text-small font-bold">{timeStr}</div>

        {/* Notifications */}
        <div className="header-action-wrap" ref={notifRef}>
          <button
            id="notifications-btn"
            className="header-action-btn"
            aria-label={`Notifications (${unreadCount} unread)`}
            title="Notifications"
            onClick={() => { setNotifOpen(v => !v); setProfileOpen(false) }}
          >
            <FaBell size={18} />
            {unreadCount > 0 && (
              <span className="header-notif-badge" aria-hidden="true">{badgeCount}</span>
            )}
          </button>
          {notifOpen && (
            <div className="header-dropdown" role="menu" aria-label="Notifications">
              <div className="header-dropdown-header">
                <strong>Notifications</strong>
                <span className="header-dropdown-count">{unreadCount} unread</span>
              </div>
              <ul className="header-dropdown-list">
                {liveNotifs.length === 0 ? (
                  <li style={{ padding: '12px 16px', fontSize: '0.82rem', color: '#888', textAlign: 'center' }}>
                    No alerts at this time
                  </li>
                ) : (
                  liveNotifs.slice(0, 4).map(item => (
                    <li key={item.SMS_NO_ID}>
                      <button 
                        type="button" 
                        className="header-dropdown-item" 
                        style={{ alignItems: 'flex-start', gap: '10px', textAlign: 'left' }}
                        onClick={() => { setNotifOpen(false); navigate('/notifications') }}
                      >
                        <FaEnvelope style={{ marginTop: '3px', flexShrink: 0, color: '#0078D4' }} /> 
                        <div style={{ overflow: 'hidden' }}>
                          <strong style={{ display: 'block', fontSize: '0.8rem', color: '#0f172a' }}>{item.SMS_NO_CAT}</strong>
                          <span style={{ fontSize: '0.76rem', color: '#64748b', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {item.SMS_NO_DESC}
                          </span>
                        </div>
                      </button>
                    </li>
                  ))
                )}
              </ul>
              <div className="header-dropdown-footer">
                <button type="button" className="header-dropdown-link" onClick={() => { setNotifOpen(false); navigate('/notifications') }}>
                  View all notifications →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        <button
          id="messages-btn"
          className="header-action-btn"
          aria-label="Messages"
          title="Messages"
        >
          <FaCommentAlt size={18} />
        </button>

        {/* Profile */}
        <div className="header-action-wrap" ref={profileRef}>
          <div
            className="header-profile"
            role="button"
            aria-label="User profile menu"
            aria-haspopup="menu"
            aria-expanded={profileOpen}
            tabIndex={0}
            onClick={() => { setProfileOpen(v => !v); setNotifOpen(false) }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setProfileOpen(v => !v); setNotifOpen(false) } }}
          >
            <div className="header-avatar" aria-hidden="true" style={{ overflow: 'hidden', padding: 0 }}>
              {userImg ? (
                <img src={userImg} alt={userName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                initials
              )}
            </div>
            <div className="header-profile-info">
              <span className="header-profile-name">{userName}</span>
              <span className="header-profile-role">{displayRole}</span>
            </div>
            <span aria-hidden="true" style={{ display: 'flex', alignItems: 'center', opacity: 0.5 }}><FaChevronDown size={10} /></span>
          </div>
          {profileOpen && (
            <div className="header-dropdown header-dropdown-profile" role="menu" aria-label="Profile menu">
              <div className="header-dropdown-profile-head">
                <div className="header-avatar" aria-hidden="true" style={{ overflow: 'hidden', padding: 0 }}>
                  {userImg ? (
                    <img src={userImg} alt={userName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    initials
                  )}
                </div>
                <div>
                  <div className="header-dropdown-name">{userName}</div>
                  <div className="header-dropdown-email">{userEmail}</div>
                  <div className="header-dropdown-role">{displayRole}</div>
                </div>
              </div>

              {/* Multi-role Profile Switcher */}
              {availableRoles.length > 1 && (
                <div style={{
                  padding: '8px 12px',
                  background: 'rgba(0, 90, 158, 0.04)',
                  borderBottom: '1px solid rgba(0, 90, 158, 0.10)'
                }}>
                  <div style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: 'var(--clr-text-muted)',
                    marginBottom: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span>Switch Profile / Role</span>
                    <span style={{
                      fontSize: '0.68rem',
                      background: 'var(--clr-primary)',
                      color: '#fff',
                      padding: '1px 6px',
                      borderRadius: '10px'
                    }}>
                      {availableRoles.length} roles
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {availableRoles.map(r => {
                      const isActive = (r.role_id === activeRoleId)
                      return (
                        <button
                          key={r.role_id}
                          type="button"
                          onClick={() => handleSwitchRole(r)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: isActive ? '1px solid var(--clr-primary)' : '1px solid transparent',
                            background: isActive ? 'rgba(0, 90, 158, 0.12)' : 'transparent',
                            color: isActive ? 'var(--clr-primary)' : 'var(--clr-text-primary)',
                            fontSize: '0.8rem',
                            fontWeight: isActive ? 600 : 500,
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: isActive ? 'var(--clr-primary)' : '#cbd5e1',
                              display: 'inline-block'
                            }} />
                            {r.role_name}
                          </span>
                          {isActive ? (
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              color: 'var(--clr-primary)',
                              textTransform: 'uppercase'
                            }}>
                              Active
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: 'var(--clr-text-muted)' }}>
                              Switch →
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="header-dropdown-list">
                <button type="button" className="header-dropdown-item" onClick={() => { setProfileOpen(false); navigate('/settings') }}>
                  <FaUserCog /> Settings
                </button>
                <button type="button" className="header-dropdown-item header-dropdown-danger" onClick={handleLogout}>
                  <FaSignOutAlt /> Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
