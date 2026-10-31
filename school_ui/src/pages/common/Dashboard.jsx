import { useEffect, useState } from 'react'
import AdminDashboard from '../dashboards/AdminDashboard'
import BranchDashboard from '../dashboards/BranchDashboard'
import SchoolAdminDashboard from '../dashboards/SchoolAdminDashboard'
import TeacherDashboard from '../dashboards/TeacherDashboard'
import StudentDashboard from '../dashboards/StudentDashboard'
import GuardianDashboard from '../dashboards/GuardianDashboard'

export default function Dashboard() {
  const [role, setRole] = useState(() => {
    const userStr = sessionStorage.getItem('e_school_user')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        return user.role_id || (user.user_role ? user.user_role.split(',')[0].trim() : null) || user.role || user.MAS_role_id || null
      } catch (err) {
        console.error('Error parsing user session data', err)
      }
    }
    return null
  })

  useEffect(() => {
    const updateUserRole = () => {
      const userStr = sessionStorage.getItem('e_school_user')
      if (userStr) {
        try {
          const user = JSON.parse(userStr)
          setRole(user.role_id || (user.user_role ? user.user_role.split(',')[0].trim() : null) || user.role || user.MAS_role_id || null)
        } catch (err) {
          console.error('Error parsing user session data', err)
        }
      }
    }
    updateUserRole()

    window.addEventListener('storage', updateUserRole)
    window.addEventListener('session-reset', updateUserRole)
    window.addEventListener('user-profile-updated', updateUserRole)
    return () => {
      window.removeEventListener('storage', updateUserRole)
      window.removeEventListener('session-reset', updateUserRole)
      window.removeEventListener('user-profile-updated', updateUserRole)
    }
  }, [])

  const normalizedRole = (role || '').toString().toLowerCase()

  if (normalizedRole.includes('super')) {
    return <AdminDashboard key={normalizedRole} />
  } else if (normalizedRole.includes('scholexec') || (normalizedRole.includes('school') && normalizedRole.includes('exec'))) {
    return <SchoolAdminDashboard key={normalizedRole} />
  } else if (normalizedRole.includes('schoolstaff') || (normalizedRole.includes('school') && normalizedRole.includes('staff'))) {
    return <SchoolAdminDashboard key={normalizedRole} />
  } else if (normalizedRole.includes('school') || (normalizedRole.includes('admin') && !normalizedRole.includes('branch'))) {
    return <SchoolAdminDashboard key={normalizedRole} />
  } else if (normalizedRole.includes('branchexec') || (normalizedRole.includes('branch') && normalizedRole.includes('exec'))) {
    return <BranchDashboard key={normalizedRole} />
  } else if (normalizedRole.includes('branch') || normalizedRole.includes('office') || normalizedRole.includes('o_staff')) {
    return <BranchDashboard key={normalizedRole} />
  } else if (normalizedRole.includes('teacher')) {
    return <TeacherDashboard key={normalizedRole} />
  } else if (normalizedRole.includes('student')) {
    return <StudentDashboard key={normalizedRole} />
  } else if (normalizedRole.includes('guardian') || normalizedRole.includes('parent')) {
    return <GuardianDashboard key={normalizedRole} />
  }

  // Fallback dashboard if role is unknown or not set
  return <AdminDashboard key="default" />
}
