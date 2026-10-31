import { lazy, Suspense, useEffect } from 'react'
import { HashRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import Sidebar        from './components/common/Sidebar'
import Header         from './components/common/Header'
import ProtectedRoute from './components/common/ProtectedRoute'
import SessionTimeout from './components/common/SessionTimeout'
import ErrorBoundary  from './components/common/ErrorBoundary'
import RouteProgress, { finishRouteProgress } from './components/common/RouteProgress'
import { ToastContainer, Zoom } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { WhitelabelProvider } from './contexts/WhitelabelContext'
import { ThemeProvider } from './contexts/ThemeContext'

// Auth & Common
const Login = lazy(() => import('./pages/auth/Login'))
const Roles = lazy(() => import('./pages/auth/Roles'))
const RoleLinks = lazy(() => import('./pages/auth/RoleLinks'))
const UserLogins = lazy(() => import('./pages/auth/UserLogins'))
const Dashboard = lazy(() => import('./pages/common/Dashboard'))
const Unauthorized = lazy(() => import('./pages/common/Unauthorized'))
const Reports = lazy(() => import('./pages/common/Reports'))
const Settings = lazy(() => import('./pages/common/Settings'))
const Notifications = lazy(() => import('./pages/common/Notifications'))

// Academic & School
const SchoolDetails = lazy(() => import('./pages/academic/SchoolDetails'))
const Branches = lazy(() => import('./pages/academic/Branches'))
const Rooms = lazy(() => import('./pages/academic/Rooms'))
const Classes = lazy(() => import('./pages/academic/Classes'))
const ClassMatrix = lazy(() => import('./pages/academic/ClassMatrix'))
const ClassSessions = lazy(() => import('./pages/academic/ClassSessions'))
const Subjects = lazy(() => import('./pages/academic/Subjects'))
const ClassSchedule = lazy(() => import('./pages/academic/ClassSchedule'))

// Staff & Student
const Teachers = lazy(() => import('./pages/staff/Teachers'))
const SubjectMapping = lazy(() => import('./pages/staff/SubjectMapping'))
const TeacherAttendance = lazy(() => import('./pages/staff/Attendance'))
const Parents = lazy(() => import('./pages/student/Parents'))
const Students = lazy(() => import('./pages/student/Students'))
const StudentAttendance = lazy(() => import('./pages/student/StudentAttendance'))

// Student & Parent Dedicated Modules
const DailyRoutine = lazy(() => import('./pages/student/DailyRoutine'))
const SubjectClassCompletion = lazy(() => import('./pages/student/SubjectClassCompletion'))
const SubjectAttendanceReport = lazy(() => import('./pages/student/SubjectAttendanceReport'))
const FeesDuePaidReport = lazy(() => import('./pages/student/FeesDuePaidReport'))

function ProgressWatcher() {
  useEffect(() => {
    finishRouteProgress()
  }, [])
  return null
}

function PageFallback() {
  return (
    <div className="page-skeleton" aria-hidden="true">
      <div className="spinner" />
    </div>
  )
}

function SuspenseWrapper({ children }) {
  return (
    <Suspense fallback={<PageFallback />}>
      <ProgressWatcher />
      {children}
    </Suspense>
  )
}

// Authenticated Shell (Keeps Sidebar and Header persistent with central lazy suspense)
function AppShell() {
  return (
    <WhitelabelProvider>
      <div className="app-shell">
        <Sidebar />
        <div className="main-viewport">
          <Header />
          <main className="content-body" role="main">
            <Suspense fallback={<PageFallback />}>
              <ProgressWatcher />
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
    </WhitelabelProvider>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <Router>
        <RouteProgress />
        <ErrorBoundary>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<SuspenseWrapper><Login /></SuspenseWrapper>} />
            <Route path="/unauthorized" element={<SuspenseWrapper><Unauthorized /></SuspenseWrapper>} />
            <Route path="/403" element={<Navigate to="/unauthorized" replace />} />

            {/* Authenticated Application Shell */}
            <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
              {/* Dashboard */}
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />

              {/* User Management */}
              <Route path="/user/roles" element={<Roles />} />
              <Route path="/user/role-links" element={<RoleLinks />} />
              <Route path="/user/logins" element={<UserLogins />} />

              {/* School Management */}
              <Route path="/school/details" element={<SchoolDetails />} />
              <Route path="/school/branches" element={<Branches />} />
              <Route path="/school/rooms" element={<Rooms />} />
              <Route path="/school/classes" element={<Classes />} />
              <Route path="/school/matrix" element={<ClassMatrix />} />
              <Route path="/school/matrices" element={<ClassMatrix />} />
              <Route path="/school/sessions" element={<ClassSessions />} />
              <Route path="/school/subjects" element={<Subjects />} />

              {/* Teacher Management */}
              <Route path="/teacher/teachers" element={<Teachers />} />
              <Route path="/teacher/mapping" element={<SubjectMapping />} />

              {/* Parent & Student Management (Admin) */}
              <Route path="/parent/parents" element={<Parents />} />
              <Route path="/student/students" element={<Students />} />

              {/* Student Portal Dedicated Modules */}
              <Route path="/student/routine" element={<DailyRoutine forcedRole="STUDENT" />} />
              <Route path="/student/class-completion" element={<SubjectClassCompletion forcedRole="STUDENT" />} />
              <Route path="/student/attendance-report" element={<SubjectAttendanceReport forcedRole="STUDENT" />} />
              <Route path="/student/fees-report" element={<FeesDuePaidReport forcedRole="STUDENT" />} />

              {/* Parent Portal Dedicated Modules */}
              <Route path="/parent/routine" element={<DailyRoutine forcedRole="PARENT" />} />
              <Route path="/parent/class-completion" element={<SubjectClassCompletion forcedRole="PARENT" />} />
              <Route path="/parent/attendance-report" element={<SubjectAttendanceReport forcedRole="PARENT" />} />
              <Route path="/parent/fees-report" element={<FeesDuePaidReport forcedRole="PARENT" />} />

              {/* Academic & Attendance Management */}
              <Route path="/academic/schedule" element={<ClassSchedule />} />
              <Route path="/academic/teacher-attendance" element={<TeacherAttendance />} />
              <Route path="/academic/student-attendance" element={<StudentAttendance />} />

              {/* System */}
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/notifications" element={<Notifications />} />

              {/* Aliases & Redirects */}
              <Route path="/dashboards" element={<Navigate to="/" replace />} />
              <Route path="/home" element={<Navigate to="/" replace />} />
              <Route path="/overview" element={<Navigate to="/" replace />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
        <SessionTimeout />
        <ToastContainer position="top-right" autoClose={3000} theme="colored" transition={Zoom} />
      </Router>
    </ThemeProvider>
  )
}

