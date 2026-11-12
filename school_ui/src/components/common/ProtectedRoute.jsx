import { Navigate, useLocation } from 'react-router-dom'

/**
 * ProtectedRoute
 * Guards authenticated route trees.
 * If the user is not authenticated, redirects to /login,
 * preserving the originally requested path so we can redirect
 * back after successful authentication.
 */
export default function ProtectedRoute({ children }) {
  const location = useLocation()
  const token = sessionStorage.getItem('e_school_access_token')

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    )
  }

  // Role-Based Route Access Guard (Redirect to 403 Unauthorized UI if permission denied)
  try {
    const user = JSON.parse(sessionStorage.getItem('e_school_user') || '{}')
    const role = (user?.user_role || user?.role || '').toLowerCase()
    const path = location.pathname.toLowerCase()

    // 1. Students and Guardians are restricted from administrative configuration and directory pages
    const isStudentOrParent = role.includes('student') || role.includes('guardian') || role.includes('parent')
    if (isStudentOrParent) {
      const isRestrictedAdminPath = path.startsWith('/user/') || 
                                    path.startsWith('/school/') || 
                                    path.startsWith('/teacher/') || 
                                    path === '/parent/parents' || 
                                    path === '/student/students' || 
                                    path.startsWith('/reports') || 
                                    path.startsWith('/settings')
      if (isRestrictedAdminPath) {
        return <Navigate to="/unauthorized" replace />
      }
    }

    // 2. Teachers cannot access User Login Management, Roles, or System Setup Settings
    if (role.includes('teacher')) {
      if (path.startsWith('/user/') || path.startsWith('/school/details') || path.startsWith('/school/branches') || path.startsWith('/settings')) {
        return <Navigate to="/unauthorized" replace />
      }
    }

    // 3. Branch Office Staff cannot access User Roles/Logins or System Security Settings
    if (role.includes('office') || role.includes('o_staff')) {
      if (path.startsWith('/user/') || path.startsWith('/settings')) {
        return <Navigate to="/unauthorized" replace />
      }
    }
  } catch (e) {
    // Ignore JSON parse error, allow fallback to normal component render where API handles permissions
  }

  return children
}
