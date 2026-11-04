import { useState, useEffect, useMemo, useCallback } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import axios from '../../lib/axios'
import { 
  FaHome, FaBookOpen, FaSchool, FaChalkboardTeacher, FaClipboardList, 
  FaClipboardCheck, FaGraduationCap, FaUserFriends, FaLock, FaCog, 
  FaQuestionCircle, FaSignOutAlt, FaUserCircle, FaBuilding, FaCodeBranch, 
  FaDoorOpen, FaChalkboard, FaCalendarAlt, FaBook, FaExchangeAlt, 
  FaUserGraduate, FaChartBar, FaBell, FaUser, FaChevronLeft, FaChevronRight,
  FaSearch, FaLink, FaMoneyBillWave
} from 'react-icons/fa'
import { toast } from 'react-toastify'
import { useWhitelabel } from '../../contexts/WhitelabelContext'
import defaultLogo from '../../assets/logo.png'

const COLLAPSE_KEY = 'e_school_sidebar_collapsed'

const ROLES_CONFIG = {
  // 1. Super Admin (Entire Website Tier)
  SUPER_ADMIN: [
    { label: 'Overview', items: [{ to: '/', icon: FaHome, label: 'Dashboard' }] },
    { label: 'User & Access', items: [
      { to: '/user/roles', icon: FaLock, label: 'Roles' },
      { to: '/user/role-links', icon: FaLink, label: 'Role Links' },
      { to: '/user/logins', icon: FaUserCircle, label: 'User Login' }
    ]},
    { label: 'Institution', items: [
      { to: '/school/details', icon: FaBuilding, label: 'School Details' },
      { to: '/school/matrix', icon: FaCalendarAlt, label: 'Schedule Matrix' }
    ]},
    { label: 'System & Reports', items: [
      { to: '/reports', icon: FaChartBar, label: 'Reports' },
      { to: '/settings', icon: FaCog, label: 'Settings' },
      { to: '/notifications', icon: FaBell, label: 'Notifications' }
    ]}
  ],

  // 2. School Executive (School Level Tier)
  SCHOOL_EXECUTIVE: [
    { label: 'Overview', items: [{ to: '/', icon: FaHome, label: 'Dashboard' }] },
    { label: 'Performance & Finance', items: [
      { to: '/reports', icon: FaChartBar, label: 'All Branch Performances' }
    ]},
    { label: 'Attendance Oversight', items: [
      { to: '/academic/student-attendance', icon: FaClipboardList, label: 'Student Attendance' },
      { to: '/academic/teacher-attendance', icon: FaClipboardCheck, label: 'Teacher Attendance' }
    ]}
  ],

  // 3. School Admin (School Level Tier)
  SCHOOL_ADMIN: [
    { label: 'Overview', items: [{ to: '/', icon: FaHome, label: 'Dashboard' }] },
    { label: 'User & Roles', items: [
      { to: '/user/roles', icon: FaLock, label: 'Role Assignation' },
      { to: '/user/logins', icon: FaUserCircle, label: 'User Logins' }
    ]},
    { label: 'Branches & Boards', items: [
      { to: '/school/details', icon: FaBuilding, label: 'School Details' },
      { to: '/school/branches', icon: FaCodeBranch, label: 'Associate Branches' },
      { to: '/school/rooms', icon: FaDoorOpen, label: 'Rooms' }
    ]},
    { label: 'Academic', items: [
      { to: '/school/classes', icon: FaChalkboard, label: 'Classes' },
      { to: '/school/matrix', icon: FaCalendarAlt, label: 'Schedule Matrix' },
      { to: '/school/sessions', icon: FaCalendarAlt, label: 'Session & Section' },
      { to: '/school/subjects', icon: FaBook, label: 'Subjects' }
    ]},
    { label: 'Teachers', items: [
      { to: '/teacher/teachers', icon: FaChalkboardTeacher, label: 'Teachers' },
      { to: '/teacher/mapping', icon: FaExchangeAlt, label: 'Teacher Subject Mapping' }
    ]},
    { label: 'Parents', items: [{ to: '/parent/parents', icon: FaUserFriends, label: 'Parents' }] },
    { label: 'Students', items: [
      { to: '/student/students', icon: FaUserGraduate, label: 'Students' },
      { to: '/academic/student-attendance', icon: FaClipboardList, label: 'Student Attendance' }
    ]},
    { label: 'Schedule & Attendance', items: [
      { to: '/academic/schedule', icon: FaCalendarAlt, label: 'Class Schedule' }
    ]},
    { label: 'System & Reports', items: [
      { to: '/reports', icon: FaChartBar, label: 'Financials & Reports' },
      { to: '/settings', icon: FaCog, label: 'School White Label' }
    ]}
  ],

  // 4. School Staff (School Level Tier)
  SCHOOL_STAFF: [
    { label: 'Overview', items: [{ to: '/', icon: FaHome, label: 'Dashboard' }] },
    { label: 'Attendance', items: [
      { to: '/academic/student-attendance', icon: FaClipboardList, label: 'Student Attendance' },
      { to: '/academic/teacher-attendance', icon: FaClipboardCheck, label: 'Teacher Attendance' }
    ]},
    { label: 'Data Entry', items: [
      { to: '/student/students', icon: FaUserGraduate, label: 'Students Directory' },
      { to: '/teacher/teachers', icon: FaChalkboardTeacher, label: 'Teachers Directory' },
      { to: '/parent/parents', icon: FaUserFriends, label: 'Parents Directory' },
      { to: '/school/classes', icon: FaChalkboard, label: 'Classes & Sections' },
      { to: '/school/subjects', icon: FaBook, label: 'Subjects Catalog' }
    ]},
    { label: 'Notices & Updates', items: [
      { to: '/notifications', icon: FaBell, label: 'Notice Board & Alerts' }
    ]}
  ],

  // 5. Branch Admin (Branch Level Tier)
  BRANCH_ADMIN: [
    { label: 'Overview', items: [{ to: '/', icon: FaHome, label: 'Dashboard' }] },
    { label: 'Branch Users & Roles', items: [
      { to: '/user/logins', icon: FaUserCircle, label: 'Branch User Logins & Reset' }
    ]},
    { label: 'Facilities', items: [{ to: '/school/rooms', icon: FaDoorOpen, label: 'Rooms' }] },
    { label: 'Academics & Curriculum', items: [
      { to: '/school/classes', icon: FaChalkboard, label: 'Classes' },
      { to: '/school/matrix', icon: FaCalendarAlt, label: 'Schedule Matrix' },
      { to: '/school/sessions', icon: FaCalendarAlt, label: 'Session & Section' },
      { to: '/school/subjects', icon: FaBook, label: 'Subjects' }
    ]},
    { label: 'Faculty & Mapping', items: [
      { to: '/teacher/teachers', icon: FaChalkboardTeacher, label: 'Teachers' },
      { to: '/teacher/mapping', icon: FaExchangeAlt, label: 'Teacher Subject Mapping' }
    ]},
    { label: 'Parents', items: [{ to: '/parent/parents', icon: FaUserFriends, label: 'Parents' }] },
    { label: 'Students', items: [
      { to: '/student/students', icon: FaUserGraduate, label: 'Students' },
      { to: '/academic/student-attendance', icon: FaClipboardList, label: 'Student Attendance' }
    ]},
    { label: 'Schedule & Attendance', items: [
      { to: '/academic/schedule', icon: FaCalendarAlt, label: 'Class Schedule' },
      { to: '/academic/teacher-attendance', icon: FaClipboardCheck, label: 'Teacher Attendance' }
    ]},
    { label: 'Performance & Settings', items: [
      { to: '/reports', icon: FaChartBar, label: 'Branch Financial Reports' },
      { to: '/settings', icon: FaCog, label: 'Branch Color Scheme' }
    ]}
  ],

  // 6. Branch Executive (Branch Level Tier)
  BRANCH_EXECUTIVE: [
    { label: 'Overview', items: [{ to: '/', icon: FaHome, label: 'Dashboard' }] },
    { label: 'Performance & Finance', items: [
      { to: '/reports', icon: FaChartBar, label: 'Branch Performance Reports' }
    ]},
    { label: 'Branch Attendance', items: [
      { to: '/academic/student-attendance', icon: FaClipboardList, label: 'Student Attendance' },
      { to: '/academic/teacher-attendance', icon: FaClipboardCheck, label: 'Teacher Attendance' }
    ]}
  ],

  // 7. Teacher Dashboard (Branch Level Tier)
  TEACHER: [
    { label: 'Overview', items: [{ to: '/', icon: FaHome, label: 'Dashboard' }] },
    { label: 'Academics & Routine', items: [
      { to: '/academic/schedule', icon: FaCalendarAlt, label: 'View Routine & Schedule' },
      { to: '/school/classes', icon: FaChalkboard, label: 'My Classes' }
    ]},
    { label: 'Attendance & Leaves', items: [
      { to: '/academic/teacher-attendance', icon: FaClipboardCheck, label: 'My Attendance & Leave' }
    ]},
    { label: 'Student Management', items: [
      { to: '/student/students', icon: FaUserGraduate, label: 'My Students' },
      { to: '/academic/student-attendance', icon: FaClipboardList, label: 'Mark Student Attendance' }
    ]},
    { label: 'Account', items: [{ to: '/settings', icon: FaUser, label: 'Profile' }] }
  ],

  // 8. Student Dashboard (Branch Level Tier)
  STUDENT: [
    { label: 'Overview', items: [{ to: '/', icon: FaHome, label: 'Dashboard' }] },
    { label: 'Student Modules', items: [
      { to: '/student/routine', icon: FaCalendarAlt, label: 'View Daily Routine' },
      { to: '/student/class-completion', icon: FaBookOpen, label: 'View Subject Wise Class Completion' },
      { to: '/student/attendance-report', icon: FaClipboardCheck, label: 'View His Own Attendance Per Subject' },
      { to: '/student/fees-report', icon: FaMoneyBillWave, label: 'View Fees Due/Paid Report' }
    ]}
  ],

  // 9. Office Staff (Branch Level Tier)
  OFFICE_STAFF: [
    { label: 'Overview', items: [{ to: '/', icon: FaHome, label: 'Dashboard' }] },
    { label: 'Routine & Classes', items: [
      { to: '/academic/schedule', icon: FaCalendarAlt, label: 'Routine Creation' },
      { to: '/school/classes', icon: FaChalkboard, label: 'Class Creation' },
      { to: '/school/sessions', icon: FaCalendarAlt, label: 'Sessions & Sections' },
      { to: '/school/rooms', icon: FaDoorOpen, label: 'Rooms Administration' }
    ]},
    { label: 'Subjects & Teachers', items: [
      { to: '/school/subjects', icon: FaBook, label: 'Subject Creation' },
      { to: '/teacher/teachers', icon: FaChalkboardTeacher, label: 'Teacher Creation' },
      { to: '/teacher/mapping', icon: FaExchangeAlt, label: 'Teacher Assignment' }
    ]}
  ],

  // 10. Guardian / Parent Dashboard (Branch Level Tier)
  GUARDIAN: [
    { label: 'Overview', items: [{ to: '/', icon: FaHome, label: 'Dashboard' }] },
    { label: 'Parent Modules', items: [
      { to: '/parent/routine', icon: FaCalendarAlt, label: 'View His Children Daily Routine' },
      { to: '/parent/class-completion', icon: FaBookOpen, label: 'View Subject Wise Class Completion' },
      { to: '/parent/attendance-report', icon: FaClipboardCheck, label: 'View Attendance Per Subject' },
      { to: '/parent/fees-report', icon: FaMoneyBillWave, label: 'View Fees Due/Paid Report' }
    ]}
  ]
}

const ICON_MAP = {
  '/': FaHome,
  '/dashboard': FaHome,
  '/user/roles': FaLock,
  '/user/role-links': FaLink,
  '/user/logins': FaUserCircle,
  '/school/details': FaBuilding,
  '/school/branches': FaCodeBranch,
  '/school/rooms': FaDoorOpen,
  '/school/classes': FaChalkboard,
  '/school/sessions': FaCalendarAlt,
  '/school/subjects': FaBook,
  '/teacher/teachers': FaChalkboardTeacher,
  '/teacher/mapping': FaExchangeAlt,
  '/parent/parents': FaUserFriends,
  '/student/students': FaUserGraduate,
  '/academic/schedule': FaCalendarAlt,
  '/academic/teacher-attendance': FaClipboardCheck,
  '/academic/student-attendance': FaClipboardList,
  '/reports': FaChartBar,
  '/settings': FaCog,
  '/notifications': FaBell,
  '/student/routine': FaCalendarAlt,
  '/student/class-completion': FaBookOpen,
  '/student/attendance-report': FaClipboardCheck,
  '/student/fees-report': FaMoneyBillWave,
  '/parent/routine': FaCalendarAlt,
  '/parent/class-completion': FaBookOpen,
  '/parent/attendance-report': FaClipboardCheck,
  '/parent/fees-report': FaMoneyBillWave
}

function resolveMenuIcon(url, label) {
  const normUrl = (url || '').trim().toLowerCase()
  if (normUrl && ICON_MAP[normUrl]) {
    return ICON_MAP[normUrl]
  }
  const text = `${url} ${label}`.toLowerCase()
  if (text.includes('dash') || text.includes('home')) return FaHome
  if (text.includes('role link') || text.includes('role-link')) return FaLink
  if (text.includes('role')) return FaLock
  if (text.includes('login') || text.includes('user')) return FaUserCircle
  if (text.includes('school') || text.includes('branch') || text.includes('institution')) return FaBuilding
  if (text.includes('room')) return FaDoorOpen
  if (text.includes('class')) return FaChalkboard
  if (text.includes('session') || text.includes('section')) return FaCalendarAlt
  if (text.includes('subject') || text.includes('syllabus')) return FaBook
  if (text.includes('teacher') || text.includes('faculty')) return FaChalkboardTeacher
  if (text.includes('mapping') || text.includes('assign')) return FaExchangeAlt
  if (text.includes('parent') || text.includes('guard')) return FaUserFriends
  if (text.includes('student') || text.includes('ward')) return FaUserGraduate
  if (text.includes('sched') || text.includes('routine')) return FaCalendarAlt
  if (text.includes('attend') || text.includes('leave')) return FaClipboardCheck
  if (text.includes('report') || text.includes('financ')) return FaChartBar
  if (text.includes('setting') || text.includes('profile')) return FaCog
  if (text.includes('notif') || text.includes('alert') || text.includes('notice') || text.includes('exam')) return FaBell
  return FaBookOpen
}

function buildNavSectionsFromDb(dbLinks) {
  if (!Array.isArray(dbLinks) || dbLinks.length === 0) return null

  // Filter only ACTIVE links
  const activeLinks = dbLinks.filter(item => {
    const status = (item.SM_RL_STATUS || item.sm_rl_status || 'ACTIVE').toUpperCase()
    return status === 'ACTIVE'
  })

  // Group by SM_RL_SUBMENU
  const groups = {}
  const groupOrder = []

  // Sort by link sequence
  const sorted = [...activeLinks].sort((a, b) => {
    const srlA = a.SM_RL_LINK_SRL ?? a.sm_rl_link_srl ?? 0
    const srlB = b.SM_RL_LINK_SRL ?? b.sm_rl_link_srl ?? 0
    return srlA - srlB
  })

  sorted.forEach(link => {
    const sectionTitle = link.SM_RL_SUBMENU || link.sm_rl_submenu || 'Overview'
    if (!groups[sectionTitle]) {
      groups[sectionTitle] = []
      groupOrder.push(sectionTitle)
    }
    const url = link.SM_RL_LINK_URL || link.sm_rl_link_url || '/'
    const label = link.SM_RL_LINK_DESC || link.sm_rl_link_desc || 'Link'
    groups[sectionTitle].push({
      to: url,
      label: label,
      icon: resolveMenuIcon(url, label)
    })
  })

  return groupOrder.map(title => ({
    label: title,
    items: groups[title]
  }))
}

function getNormalizedRoleCode() {
  try {
    const user = JSON.parse(sessionStorage.getItem('e_school_user'))
    const raw = (user?.role_id || (user?.user_role || '').split(',')[0] || user?.role || '').toUpperCase().trim()
    if (raw.startsWith('R_')) return raw
    if (raw.includes('SUPER')) return 'R_SUPERADMIN'
    if (raw.includes('SCHOLEXEC')) return 'R_SCHOLEXEC'
    if (raw.includes('SCHOOL') && raw.includes('STAFF')) return 'R_SCHOOLSTAFF'
    if (raw.includes('SCHOOL')) return 'R_SCHOOLADMIN'
    if (raw.includes('BRANCH') && raw.includes('EXEC')) return 'R_BRANCHEXEC'
    if (raw.includes('BRANCH')) return 'R_BRANCHADMIN'
    if (raw.includes('TEACHER')) return 'R_TEACHER'
    if (raw.includes('STUDENT')) return 'R_STUDENT'
    if (raw.includes('OFFICE')) return 'R_OFFICESTAFF'
    if (raw.includes('PARENT') || raw.includes('GUARDIAN')) return 'R_GUARDIAN'
    return null
  } catch (e) {
    return null
  }
}

export default function Sidebar() {
  const navigate = useNavigate()
  const { settings } = useWhitelabel()
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === '1' } catch (e) { return false }
  })
  const [menuSearch, setMenuSearch] = useState('')
  const [dbNavSections, setDbNavSections] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Toggle the collapsed state on <html> so CSS can animate the whole shell.
  useEffect(() => {
    document.documentElement.classList.toggle('sidebar-collapsed', collapsed)
    try { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0') } catch (e) {}
  }, [collapsed])

  useEffect(() => {
    const handleToggleMobile = () => setMobileOpen(v => !v)
    const handleCloseMobile = () => setMobileOpen(false)
    window.addEventListener('toggle-mobile-sidebar', handleToggleMobile)
    window.addEventListener('close-mobile-sidebar', handleCloseMobile)
    return () => {
      window.removeEventListener('toggle-mobile-sidebar', handleToggleMobile)
      window.removeEventListener('close-mobile-sidebar', handleCloseMobile)
    }
  }, [])

  const handleLogout = () => {
    sessionStorage.removeItem('e_school_access_token')
    sessionStorage.removeItem('e_school_user')
    toast.info('Logged out successfully.')
    navigate('/login')
  }

  const loadDbLinks = useCallback(async () => {
    try {
      const roleCode = getNormalizedRoleCode()
      if (!roleCode) {
        setDbNavSections([])
        return
      }
      // Enforce dedicated 4 modules for student and parent
      if (roleCode === 'R_STUDENT' || roleCode === 'R_GUARDIAN' || roleCode === 'R_PARENT') {
        setDbNavSections(null)
        return
      }
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/auth/role-links`, {
        params: { role_id: roleCode }
      })
      const items = Array.isArray(res.data) ? res.data : res.data?.data || []
      if (items.length > 0) {
        const sections = buildNavSectionsFromDb(items)
        setDbNavSections(sections || [])
      }
    } catch (err) {
      console.warn('Could not load database role links:', err?.message)
    }
  }, [])

  useEffect(() => {
    loadDbLinks()
  }, [loadDbLinks])

  // Live real-time listener for Role Link updates or status toggles across dashboards
  useEffect(() => {
    const handleUpdate = () => {
      loadDbLinks()
    }
    window.addEventListener('role-links-updated', handleUpdate)
    window.addEventListener('user-profile-updated', handleUpdate)
    window.addEventListener('session-reset', handleUpdate)
    window.addEventListener('storage', handleUpdate)
    return () => {
      window.removeEventListener('role-links-updated', handleUpdate)
      window.removeEventListener('user-profile-updated', handleUpdate)
      window.removeEventListener('session-reset', handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [loadDbLinks])

  const getUserRoleConfig = () => {
    try {
      const user = JSON.parse(sessionStorage.getItem('e_school_user'))
      const role = (user?.role_id || (user?.user_role || '').split(',')[0] || user?.role || '').toLowerCase().trim()

      if (role.includes('super')) return ROLES_CONFIG.SUPER_ADMIN
      if (role.includes('scholexec') || (role.includes('school') && role.includes('exec'))) return ROLES_CONFIG.SCHOOL_EXECUTIVE
      if (role.includes('schoolstaff') || (role.includes('school') && role.includes('staff'))) return ROLES_CONFIG.SCHOOL_STAFF
      if (role.includes('school') || role.includes('s_admin')) return ROLES_CONFIG.SCHOOL_ADMIN
      if (role.includes('branchexec') || (role.includes('branch') && role.includes('exec'))) return ROLES_CONFIG.BRANCH_EXECUTIVE
      if (role.includes('branch')) return ROLES_CONFIG.BRANCH_ADMIN
      if (role.includes('office') || role.includes('o_staff')) return ROLES_CONFIG.OFFICE_STAFF
      if (role.includes('teacher')) return ROLES_CONFIG.TEACHER
      if (role.includes('student')) return ROLES_CONFIG.STUDENT
      if (role.includes('guardian') || role.includes('parent')) return ROLES_CONFIG.GUARDIAN

      return []
    } catch (e) {
      return []
    }
  }

  const getBrandDetails = () => {
    try {
      const user = JSON.parse(sessionStorage.getItem('e_school_user') || '{}')
      const role = (user?.user_role || user?.role || user?.role_id || '').toLowerCase()
      const isSuper = role.includes('super')

      const branchName = user?.branch_name || user?.SCHL_BR_NM || user?.branchName || ''
      const schoolName = user?.school_name || user?.schl_mn_nm || user?.center_name || user?.schoolName || ''

      // If branch or student/teacher/parent: show Branch Name + School Name
      if (!isSuper && (branchName || schoolName)) {
        const title = branchName || schoolName
        const subtitle = branchName && schoolName ? schoolName : (settings?.WL_DESC?.appName || 'School Campus')
        return { title, subtitle }
      }

      // Non-super, non-admin roles (student/parent/teacher/guardian) without branch/school name
      // must never inherit the whitelabel "Qubix System Admin" title.
      const userRole = (user?.user_role || user?.role || user?.role_id || '').toLowerCase()
      if (userRole.includes('student')) return { title: 'Student Portal', subtitle: null }
      if (userRole.includes('guardian') || userRole.includes('parent')) return { title: 'Guardian Portal', subtitle: null }
      if (userRole.includes('teacher')) return { title: 'Teacher Portal', subtitle: null }
      const title = settings?.WL_DESC?.appName || 'MySkool ERP'
      return { title, subtitle: null }
    } catch (e) {
      return { title: settings?.WL_DESC?.appName || 'MySkool ERP', subtitle: null }
    }
  }

  const getPortalTagline = () => {
    try {
      const user = JSON.parse(sessionStorage.getItem('e_school_user'))
      const role = (user?.user_role || user?.role || '').toLowerCase()

      if (role.includes('super')) return 'Super Admin Portal'
      if (role.includes('scholexec') || (role.includes('school') && role.includes('exec'))) return 'School Executive Portal'
      if (role.includes('schoolstaff') || (role.includes('school') && role.includes('staff'))) return 'School Staff Portal'
      if (role.includes('school') || (role.includes('admin') && !role.includes('branch'))) return 'School Admin Portal'
      if (role.includes('branchexec') || (role.includes('branch') && role.includes('exec'))) return 'Branch Executive Portal'
      if (role.includes('branch')) return 'Branch Admin Portal'
      if (role.includes('office') || role.includes('o_staff')) return 'Branch Office Staff Portal'
      if (role.includes('teacher')) return 'Teacher Portal'
      if (role.includes('student')) return 'Student Portal'
      if (role.includes('guardian') || role.includes('parent')) return 'Guardian Portal'

      return 'Portal'
    } catch (e) {
      return 'Portal'
    }
  }

  const brandDetails = getBrandDetails()
  const portalTagline = getPortalTagline()

  // Filter nav sections by the search query (hidden in collapsed mode).
  const navSections = useMemo(() => {
    // If database navigation links exist for this role, use them; otherwise fallback to default config
    const base = (dbNavSections !== null && Array.isArray(dbNavSections)) ? dbNavSections : getUserRoleConfig()
    const q = menuSearch.trim().toLowerCase()
    if (!q) return base
    return base
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.label.toLowerCase().includes(q)),
      }))
      .filter((section) => section.items.length > 0)
  }, [dbNavSections, menuSearch])

  return (
    <>
      {mobileOpen && (
        <div
          className="sidebar-overlay show"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside className={`sidebar${mobileOpen ? ' mobile-open' : ''}`}>
      {/* ── Brand ─────────────────────────────────────────────── */}
      <div className="sidebar-brand">
        {settings?.WL_IMG_BASE64 ? (
          <div className="sidebar-brand-logo" style={{ display: 'flex', alignItems: 'center' }}>
            <img
              src={settings.WL_IMG_BASE64}
              alt="School Logo"
              style={{ maxHeight: '36px', maxWidth: '36px', objectFit: 'contain' }}
            />
          </div>
        ) : (
          <div className="sidebar-brand-logo" style={{ display: 'flex', alignItems: 'center' }}>
            <img
              src={defaultLogo}
              alt="School Logo"
              style={{ maxHeight: '36px', maxWidth: '36px', objectFit: 'contain', borderRadius: '6px' }}
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
          </div>
        )}

        {!collapsed && (
          <div className="sidebar-brand-text">
            <div className="sidebar-brand-name" title={brandDetails.title}>{brandDetails.title}</div>
            <div className="sidebar-brand-tagline">
              {brandDetails.subtitle ? (
                <span style={{ display: 'block', fontSize: '0.70rem', opacity: 0.9, color: 'var(--clr-text-muted, #93c5fd)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {brandDetails.subtitle}
                </span>
              ) : null}
              <span>{portalTagline}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Menu Search ───────────────────────────────────────── */}
      {!collapsed && (
        <div className="sidebar-search">
          <span className="sidebar-search-icon" aria-hidden="true"><FaSearch size={13} /></span>
          <input
            id="sidebar-search"
            className="sidebar-search-input"
            type="search"
            placeholder="Search menu…"
            aria-label="Search navigation menu"
            value={menuSearch}
            onChange={(e) => setMenuSearch(e.target.value)}
          />
        </div>
      )}

      {/* ── Navigation ────────────────────────────────────────── */}
      <nav className="sidebar-nav" aria-label="Main navigation">
        {navSections.map((section) => (
          <div key={section.label}>
            {!collapsed && <div className="sidebar-section-label">{section.label}</div>}
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/' || item.to === '/students'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `sidebar-nav-item${isActive ? ' active' : ''}`
                }
                title={collapsed ? item.label : undefined}
                aria-label={collapsed ? item.label : undefined}
              >
                <span className="sidebar-nav-icon">
                  <item.icon />
                </span>
                {!collapsed && <span className="sidebar-nav-label">{item.label}</span>}
                {!collapsed && item.badge !== null && item.badge !== undefined && (
                  <span className="sidebar-nav-badge">{item.badge}</span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* ── Footer ────────────────────────────────────────────── */}
      <div className="sidebar-footer">
        <button type="button" className="sidebar-footer-item" onClick={handleLogout} aria-label="Log out" title={collapsed ? 'Sign Out' : undefined}>
          <span className="sidebar-nav-icon">
            <FaSignOutAlt />
          </span>
          {!collapsed && <span>Sign Out</span>}
        </button>
        <button
          type="button"
          className="sidebar-footer-item"
          onClick={() => setCollapsed(v => !v)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <span className="sidebar-nav-icon">
            {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
          </span>
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
    </>
  )
}
