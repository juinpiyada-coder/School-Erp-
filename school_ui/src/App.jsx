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
import { RealtimeProvider } from './contexts/RealtimeContext'

// Safe lazy import wrapper: automatically reloads once if a stale chunk hash fails after a deployment
function lazyRetry(componentImport) {
  return lazy(async () => {
    const pageHasBeenForceRefreshed = window.sessionStorage.getItem('page_has_reloaded_for_chunk')
    try {
      return await componentImport()
    } catch (error) {
      if (!pageHasBeenForceRefreshed) {
        window.sessionStorage.setItem('page_has_reloaded_for_chunk', 'true')
        window.location.reload()
        return new Promise(() => {}) // never resolves while page reloads
      }
      window.sessionStorage.removeItem('page_has_reloaded_for_chunk')
      throw error
    }
  })
}

// Auth & Common
const Login = lazyRetry(() => import('./pages/auth/Login'))
const Roles = lazyRetry(() => import('./pages/auth/Roles'))
const RoleLinks = lazyRetry(() => import('./pages/auth/RoleLinks'))
const UserLogins = lazyRetry(() => import('./pages/auth/UserLogins'))
const Dashboard = lazyRetry(() => import('./pages/common/Dashboard'))
const Unauthorized = lazyRetry(() => import('./pages/common/Unauthorized'))
const Reports = lazyRetry(() => import('./pages/common/Reports'))
const Settings = lazyRetry(() => import('./pages/common/Settings'))
const Notifications = lazyRetry(() => import('./pages/common/Notifications'))

// Academic & School
const SchoolDetails = lazyRetry(() => import('./pages/academic/SchoolDetails'))
const Branches = lazyRetry(() => import('./pages/academic/Branches'))
const Rooms = lazyRetry(() => import('./pages/academic/Rooms'))
const Classes = lazyRetry(() => import('./pages/academic/Classes'))
const ClassMatrix = lazyRetry(() => import('./pages/academic/ClassMatrix'))
const ClassSessions = lazyRetry(() => import('./pages/academic/ClassSessions'))
const Subjects = lazyRetry(() => import('./pages/academic/Subjects'))
const ClassSchedule = lazyRetry(() => import('./pages/academic/ClassSchedule'))

// Staff & Student
const Teachers = lazyRetry(() => import('./pages/staff/Teachers'))
const SubjectMapping = lazyRetry(() => import('./pages/staff/SubjectMapping'))
const TeacherAttendance = lazyRetry(() => import('./pages/staff/Attendance'))
const TeacherDailyRoutine = lazyRetry(() => import('./pages/staff/DailyRoutine'))
const Parents = lazyRetry(() => import('./pages/student/Parents'))
const Students = lazyRetry(() => import('./pages/student/Students'))
const StudentAttendance = lazyRetry(() => import('./pages/student/StudentAttendance'))

// Student & Parent Dedicated Modules
const DailyRoutine = lazyRetry(() => import('./pages/student/DailyRoutine'))
const SubjectClassCompletion = lazyRetry(() => import('./pages/student/SubjectClassCompletion'))
const SubjectAttendanceReport = lazyRetry(() => import('./pages/student/SubjectAttendanceReport'))
const FeesDuePaidReport = lazyRetry(() => import('./pages/student/FeesDuePaidReport'))

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
      <RealtimeProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
                <Route path="/teacher/routine" element={<TeacherDailyRoutine />} />

                {/* Parent & Student Management (Admin) */}
                <Route path="/parent/parents" element={<Parents />} />
                <Route path="/student/students" element={<Students />} />

                {/* Student Portal Dedicated Modules */}
                <Route path="/student/routine" element={<DailyRoutine forcedRole="STUDENT" />} />
                <Route path="/student/class-completion" element={<SubjectClassCompletion forcedRole="STUDENT" />} />
                <Route path="/student/attendance-report" element={<SubjectAttendanceReport forcedRole="STUDENT" />} />
                <Route path="/student/fees-report" element={<FeesDuePaidReport forcedRole="STUDENT" />} />

                {/* Direct Aliases and Compatibility Routes */}
                <Route path="/routine" element={<DailyRoutine />} />
                <Route path="/daily-routine" element={<DailyRoutine />} />
                <Route path="/attendance-report" element={<SubjectAttendanceReport />} />
                <Route path="/class-completion" element={<SubjectClassCompletion />} />
                <Route path="/fees-report" element={<FeesDuePaidReport />} />
                <Route path="/attendance" element={<StudentAttendance />} />
                <Route path="/schedule" element={<ClassSchedule />} />
                <Route path="/student-attendance" element={<StudentAttendance />} />
                <Route path="/parents" element={<Parents />} />

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
      </RealtimeProvider>
    </ThemeProvider>
  )
}

