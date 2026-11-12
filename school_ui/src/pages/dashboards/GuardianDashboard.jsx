import axios from '../../lib/axios'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWhitelabel } from '../../contexts/WhitelabelContext'
import { useRealtimeSubscription } from '../../contexts/RealtimeContext'
import { motion } from 'framer-motion'
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  FaCheckCircle,
  FaTimesCircle,
  FaChartBar,
  FaClock,
  FaChalkboardTeacher,
  FaDoorOpen,
  FaUserGraduate,
  FaCalendarAlt,
  FaBook,
  FaExclamationCircle,
  FaCheck
} from 'react-icons/fa'

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function mapRoutineItem(r, idx) {
  const from = (r.SCHL_CLS_SCHDL_FRM_DT || '08:00').substring(0, 5)
  const to = (r.SCHL_CLS_SCHDL_TO_DT || '08:45').substring(0, 5)
  return {
    id: r.id || r.SCHL_CLS_SCHLDL_ID || idx,
    day: r.day || r.SCHL_DAY_OF_WK || 'Monday',
    period: r.period || r.period_label || `Period ${idx + 1}`,
    time: r.time || `${from} - ${to}`,
    subject: r.subject || r.subject_name || r.SCHLDL_SUB_NM || 'Subject',
    code: r.code || r.subject_code || '',
    teacher: r.teacher || r.teacher_name || r.SCHLDL_TCHR_NM || 'Assigned Faculty',
    room: r.room || r.SCHL_BR_RM_ID || 'Classroom',
    type: r.type || 'Lecture',
    attendance_status: r.attendance_status || 'Not Marked',
    attendance_remarks: r.attendance_remarks || '',
  }
}

function getAttendanceBadge(status) {
  const s = (status || '').toLowerCase()
  if (['present', 'p', 'y', '1'].includes(s)) {
    return {
      label: 'Present',
      bg: 'rgba(16, 185, 129, 0.12)',
      color: '#059669',
      border: 'rgba(16, 185, 129, 0.25)',
      icon: <FaCheckCircle style={{ marginRight: 4 }} />
    }
  }
  if (['absent', 'a', 'n', '0'].includes(s)) {
    return {
      label: 'Absent',
      bg: 'rgba(239, 68, 68, 0.12)',
      color: '#dc2626',
      border: 'rgba(239, 68, 68, 0.25)',
      icon: <FaTimesCircle style={{ marginRight: 4 }} />
    }
  }
  if (['late', 'l'].includes(s)) {
    return {
      label: 'Late',
      bg: 'rgba(245, 158, 11, 0.12)',
      color: '#d97706',
      border: 'rgba(245, 158, 11, 0.25)',
      icon: <FaClock style={{ marginRight: 4 }} />
    }
  }
  return {
    label: 'Pending / Not Marked',
    bg: 'rgba(107, 114, 128, 0.08)',
    color: '#6b7280',
    border: 'rgba(107, 114, 128, 0.18)',
    icon: <FaExclamationCircle style={{ marginRight: 4 }} />
  }
}

// ─── Guardian Dashboard Component ─────────────────────────────────────────────
export default function GuardianDashboard() {
  const navigate = useNavigate()
  const { settings } = useWhitelabel()
  const [wards, setWards] = useState([])
  const [selectedWard, setSelectedWard] = useState('')
  const [routines, setRoutines] = useState([])
  const [selectedDay, setSelectedDay] = useState(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const today = days[new Date().getDay()]
    return today === 'Sunday' ? 'Monday' : today
  })
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [subjectAttendance, setSubjectAttendance] = useState([])
  const [overallStats, setOverallStats] = useState(null)
  const [analyticsData, setAnalyticsData] = useState({
    subjectWise: [],
    dayWise: [],
    weekWise: [],
    monthWise: []
  })
  const [graphViewMode, setGraphViewMode] = useState('subject') // 'subject' | 'day' | 'week' | 'month'
  const [loading, setLoading] = useState(true)

  // 1. Strictly fetch real students linked to this logged-in guardian
  const fetchWards = useCallback(() => {
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/student/wards`)
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : res.data?.data || []
        setWards(list)
        if (list.length > 0) {
          setSelectedWard(prev => prev || list[0].id || list[0].STU_ID || '')
        }
      })
      .catch(() => setWards([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchWards()
  }, [fetchWards])

  // Real-time subscription for wards
  useRealtimeSubscription('wards', fetchWards)
  useRealtimeSubscription('*', fetchWards)

  // 2. Fetch the selected child's daily routine with period attendance and real attendance stats
  useEffect(() => {
    if (!selectedWard) return
    setLoading(true)
    Promise.allSettled([
      axios.get(`${import.meta.env.VITE_API_BASE_URL}/student/routine?student_id=${selectedWard}&date=${selectedDate}`),
      axios.get(`${import.meta.env.VITE_API_BASE_URL}/student/parent-analytics?student_id=${selectedWard}`),
      axios.get(`${import.meta.env.VITE_API_BASE_URL}/student/subject-attendance?student_id=${selectedWard}`),
      axios.get(`${import.meta.env.VITE_API_BASE_URL}/dashboard/overview?ward_id=${selectedWard}`),
    ])
      .then(([routineRes, analyticsRes, attRes, overviewRes]) => {
        if (routineRes.status === 'fulfilled') {
          const payload = routineRes.value?.data
          const items = Array.isArray(payload) ? payload : payload?.data || []
          setRoutines(items.map(mapRoutineItem))
        } else {
          setRoutines([])
        }

        if (analyticsRes.status === 'fulfilled') {
          const aData = analyticsRes.value?.data?.data || analyticsRes.value?.data || {}
          setAnalyticsData({
            subjectWise: aData.subjectWise || [],
            dayWise: aData.dayWise || [],
            weekWise: aData.weekWise || [],
            monthWise: aData.monthWise || []
          })
          if (aData.overall && aData.overall.overallPercentage !== undefined) {
            setOverallStats(aData.overall)
          }
        }

        if (attRes.status === 'fulfilled') {
          const attData = attRes.value?.data?.data || attRes.value?.data || {}
          const summary = attData.summary || []
          setSubjectAttendance(summary)
          if (!overallStats) {
            const totalSessions = summary.reduce((acc, s) => acc + (s.totalSessions || 0), 0)
            const totalPresent = summary.reduce((acc, s) => acc + (s.presentSessions || 0), 0)
            const overallPercentage = totalSessions > 0
              ? Math.round((totalPresent * 100) / totalSessions)
              : (summary.length > 0 ? 0 : null)
            setOverallStats(overallPercentage !== null ? { overallPercentage } : null)
          }
        } else {
          setSubjectAttendance([])
        }
      })
      .finally(() => setLoading(false))
  }, [selectedWard, selectedDate])

  const selectedWardObj = wards.find(w => (w.id || w.STU_ID) === selectedWard)
  const childName = selectedWardObj?.STU_NM || selectedWardObj?.name || 'Child'
  const childClass = selectedWardObj?.className || ''
  const childBranch = selectedWardObj?.branchName || ''

  // Filter routine by selected day tab
  const filteredRoutines = useMemo(() => {
    if (selectedDay === 'ALL') return routines
    return routines.filter(r => r.day.toLowerCase() === selectedDay.toLowerCase())
  }, [routines, selectedDay])

  // Count attendance summary for periods on the active view
  const periodAttendanceCounts = useMemo(() => {
    let present = 0, absent = 0, pending = 0
    filteredRoutines.forEach(r => {
      const s = (r.attendance_status || '').toLowerCase()
      if (['present', 'p', 'y', '1'].includes(s)) present++
      else if (['absent', 'a', 'n', '0'].includes(s)) absent++
      else pending++
    })
    return { present, absent, pending, total: filteredRoutines.length }
  }, [filteredRoutines])

  const guardianAttendanceChartData = useMemo(() => {
    const totalPresent = subjectAttendance.reduce((acc, s) => acc + (Number(s.presentSessions) || 0), 0)
    const totalAbsent = subjectAttendance.reduce((acc, s) => acc + (Number(s.absentSessions) || 0), 0)
    const totalSessions = subjectAttendance.reduce((acc, s) => acc + (Number(s.totalSessions) || 0), 0)
    const pending = Math.max(0, totalSessions - totalPresent - totalAbsent)
    return [
      { name: 'Present', value: totalPresent, color: '#10b981' },
      { name: 'Absent', value: totalAbsent, color: '#ef4444' },
      { name: 'Pending', value: pending, color: '#9ca3af' },
    ].filter(d => d.value > 0)
  }, [subjectAttendance])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="page-container"
    >
      {/* ── Welcome Banner ──────────────────────────────────────── */}
      <div
        className="dashboard-welcome-banner"
        style={settings?.WL_BANNER_BASE64 ? {
          backgroundImage: `url(${settings.WL_BANNER_BASE64})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : {}}
      />

      {/* ── Real Student Header & Ward Switcher ────────────────── */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '18px 24px', 
          marginBottom: '24px', 
          borderRadius: '12px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          borderLeft: '4px solid var(--clr-primary, #005A9E)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: 'rgba(0, 90, 158, 0.12)', color: 'var(--clr-primary, #005A9E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.35rem' }}>
            <FaUserGraduate />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--clr-text-muted, #6b7280)', fontWeight: 600 }}>
              Student Profile (Linked Ward)
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--clr-text, #111827)' }}>
              {childName}
              {childClass && (
                <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--clr-text-muted, #6b7280)', marginLeft: '10px' }}>
                  • {childClass}
                </span>
              )}
              {childBranch && (
                <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--clr-primary, #005A9E)', marginLeft: '8px' }}>
                  ({childBranch})
                </span>
              )}
            </div>
          </div>
        </div>

        {wards.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label htmlFor="wardSelect" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--clr-text, #111827)' }}>
              Switch Child:
            </label>
            <select
              id="wardSelect"
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="form-control"
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                minWidth: '220px',
                fontWeight: 600,
                border: '1px solid var(--clr-border, #d1d5db)',
                background: 'var(--clr-surface, #ffffff)',
                color: 'var(--clr-text, #111827)'
              }}
            >
              {wards.map(w => (
                <option key={w.id || w.STU_ID} value={w.id || w.STU_ID}>
                  {w.STU_NM || w.name} {w.className ? `— ${w.className}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {wards.length === 0 && !loading ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', borderRadius: '12px' }}>
          <FaUserGraduate style={{ fontSize: '2.2rem', color: 'var(--clr-text-muted, #9ca3af)', marginBottom: '12px' }} />
          <h4 style={{ margin: '0 0 6px 0', color: 'var(--clr-text, #111827)' }}>No Student Profile Linked</h4>
          <p style={{ margin: 0, color: 'var(--clr-text-muted, #6b7280)', fontSize: '0.875rem' }}>
            Your guardian login does not have an active linked student record in the school database.
          </p>
        </div>
      ) : loading ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', borderRadius: '12px' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--clr-text-muted, #6b7280)' }}>Loading real timetable and attendance records...</p>
        </div>
      ) : (
        <>
          {/* ── Key Real Metric Cards ─────────────────────────────── */}
          <div className="metrics-grid metrics-grid-3" style={{ marginBottom: '24px' }}>
            <motion.div
              whileHover={{ y: -3 }}
              className="glass-panel metric-card"
              onClick={() => navigate('/parent/routine')}
              style={{ cursor: 'pointer' }}
            >
              <div className="metric-icon-wrap metric-icon-blue"><FaCalendarAlt /></div>
              <div className="metric-label">Scheduled Periods</div>
              <div className="metric-value">
                {filteredRoutines.length > 0 ? `${filteredRoutines.length} Classes` : '0 Classes'}
              </div>
              <span className="metric-delta metric-delta-up">➔ Full Weekly Matrix</span>
            </motion.div>

            <motion.div
              whileHover={{ y: -3 }}
              className="glass-panel metric-card"
              onClick={() => navigate('/parent/attendance-report')}
              style={{ cursor: 'pointer' }}
            >
              <div className="metric-icon-wrap metric-icon-green"><FaCheckCircle /></div>
              <div className="metric-label">Marked Present Today</div>
              <div className="metric-value">
                {periodAttendanceCounts.present} <span style={{ fontSize: '0.9rem', color: 'var(--clr-text-muted, #6b7280)', fontWeight: 500 }}>/ {periodAttendanceCounts.total}</span>
              </div>
              <span className="metric-delta metric-delta-up">
                {periodAttendanceCounts.absent > 0 ? `⚠ ${periodAttendanceCounts.absent} Absent Marked` : '✓ Up to Date'}
              </span>
            </motion.div>

            <motion.div
              whileHover={{ y: -3 }}
              className="glass-panel metric-card"
              onClick={() => navigate('/parent/attendance-report')}
              style={{ cursor: 'pointer' }}
            >
              <div className="metric-icon-wrap metric-icon-purple"><FaChartBar /></div>
              <div className="metric-label">Cumulative Attendance</div>
              <div className="metric-value">
                {overallStats?.overallPercentage !== undefined ? `${overallStats.overallPercentage}%` : '0%'}
              </div>
              <span className="metric-delta metric-delta-up">➔ Subject Breakdown</span>
            </motion.div>
          </div>

          {/* ── Attendance Status Graph: Subject, Day, Week & Monthly Analytics ── */}
          <div className="glass-panel chart-card" style={{ padding: '24px', borderRadius: '12px', marginBottom: '24px' }}>
            <div className="section-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="section-title-dot" />
                  Real-Time Attendance Analytics
                </h3>
                <p style={{ margin: '4px 0 0 0', color: 'var(--clr-text-muted, #6b7280)', fontSize: '0.82rem' }}>
                  Subject-wise, full day-wise, weekly and monthly attendance breakdown for {childName}.
                </p>
              </div>

              {/* View Switcher Tabs */}
              <div style={{ display: 'inline-flex', padding: '3px', background: 'var(--clr-surface-alt, #f3f4f6)', borderRadius: '8px', gap: '4px' }}>
                {[
                  { key: 'subject', label: 'Subject Wise' },
                  { key: 'day', label: 'Day Wise' },
                  { key: 'week', label: 'Week Wise' },
                  { key: 'month', label: 'Monthly' },
                  { key: 'pie', label: 'Ratio Pie' }
                ].map(tab => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setGraphViewMode(tab.key)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      background: graphViewMode === tab.key ? 'var(--clr-primary, #005A9E)' : 'transparent',
                      color: graphViewMode === tab.key ? '#ffffff' : 'var(--clr-text-muted, #4b5563)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart Renderings based on mode */}
            {graphViewMode === 'pie' ? (
              guardianAttendanceChartData.length > 0 ? (
                <div style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={guardianAttendanceChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {guardianAttendanceChartData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p style={{ color: 'var(--clr-text-muted, #6b7280)', fontSize: '0.85rem' }}>No attendance ratio data recorded yet.</p>
              )
            ) : graphViewMode === 'subject' ? (
              analyticsData.subjectWise.length > 0 ? (
                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.subjectWise} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                      <XAxis dataKey="subject" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" interval={0} />
                      <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                      <RechartsTooltip formatter={(val, name) => [`${val}%`, 'Attendance']} />
                      <Bar dataKey="percentage" name="Attendance %" fill="#0078D4" radius={[4, 4, 0, 0]} maxBarSize={38}>
                        {analyticsData.subjectWise.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.percentage >= 75 ? '#10b981' : entry.percentage >= 50 ? '#f59e0b' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p style={{ color: 'var(--clr-text-muted, #6b7280)', fontSize: '0.85rem' }}>No subject-wise attendance recorded yet.</p>
              )
            ) : graphViewMode === 'day' ? (
              analyticsData.dayWise.length > 0 ? (
                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.dayWise} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                      <RechartsTooltip formatter={(val, name, props) => [`${val}% (${props.payload.dayStatus})`, 'Full Day Status']} />
                      <Bar dataKey="percentage" name="Daily Attendance %" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={36}>
                        {analyticsData.dayWise.map((entry, index) => (
                          <Cell key={`day-cell-${index}`} fill={entry.percentage >= 75 ? '#10b981' : entry.percentage > 0 ? '#f59e0b' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p style={{ color: 'var(--clr-text-muted, #6b7280)', fontSize: '0.85rem' }}>No daily attendance records found.</p>
              )
            ) : graphViewMode === 'week' ? (
              analyticsData.weekWise.length > 0 ? (
                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.weekWise} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                      <RechartsTooltip formatter={(val) => [`${val}%`, 'Weekly Attendance']} />
                      <Bar dataKey="percentage" name="Weekly Attendance %" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={38}>
                        {analyticsData.weekWise.map((entry, index) => (
                          <Cell key={`week-cell-${index}`} fill={entry.percentage >= 75 ? '#10b981' : '#8b5cf6'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p style={{ color: 'var(--clr-text-muted, #6b7280)', fontSize: '0.85rem' }}>No weekly attendance records found.</p>
              )
            ) : (
              analyticsData.monthWise.length > 0 ? (
                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.monthWise} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                      <RechartsTooltip formatter={(val) => [`${val}%`, 'Monthly Attendance']} />
                      <Bar dataKey="percentage" name="Monthly Attendance %" fill="#0284c7" radius={[4, 4, 0, 0]} maxBarSize={42}>
                        {analyticsData.monthWise.map((entry, index) => (
                          <Cell key={`mon-cell-${index}`} fill={entry.percentage >= 75 ? '#10b981' : '#0284c7'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p style={{ color: 'var(--clr-text-muted, #6b7280)', fontSize: '0.85rem' }}>No monthly attendance records found.</p>
              )
            )}
          </div>

          {/* ── Unified Daily Routine & Attendance Module (Matching Branch Routine UI) ── */}
          <div className="glass-panel chart-card" style={{ padding: '24px', borderRadius: '12px', marginBottom: '24px' }}>
            <div className="section-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="section-title-dot" />
                  {childName ? `${childName}'s Daily Routine & Class Attendance` : "Child's Daily Routine & Class Attendance"}
                </h3>
                <p style={{ margin: '4px 0 0 0', color: 'var(--clr-text-muted, #6b7280)', fontSize: '0.82rem' }}>
                  Real-time period schedule with slot attendance verification from assigned branch faculty.
                </p>
              </div>

              {/* Date Selector to inspect attendance across different days */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--clr-text-muted, #6b7280)' }}>
                  Date:
                </span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--clr-border, #d1d5db)',
                    background: 'var(--clr-surface, #ffffff)',
                    fontSize: '0.85rem',
                    color: 'var(--clr-text, #111827)'
                  }}
                />
              </div>
            </div>

            {/* Day Filter Tabs */}
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                overflowX: 'auto', 
                paddingBottom: '10px', 
                marginBottom: '20px' 
              }}
            >
              {WEEK_DAYS.map(day => {
                const isSelected = selectedDay === day
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      border: isSelected ? '1px solid var(--clr-primary, #005A9E)' : '1px solid var(--clr-border, #e5e7eb)',
                      background: isSelected ? 'var(--clr-primary, #005A9E)' : 'var(--clr-surface, #ffffff)',
                      color: isSelected ? '#ffffff' : 'var(--clr-text, #374151)',
                      fontWeight: isSelected ? 600 : 500,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {day}
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => setSelectedDay('ALL')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: selectedDay === 'ALL' ? '1px solid var(--clr-primary, #005A9E)' : '1px solid var(--clr-border, #e5e7eb)',
                  background: selectedDay === 'ALL' ? 'var(--clr-primary, #005A9E)' : 'var(--clr-surface, #ffffff)',
                  color: selectedDay === 'ALL' ? '#ffffff' : 'var(--clr-text, #374151)',
                  fontWeight: selectedDay === 'ALL' ? 600 : 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                All Days
              </button>
            </div>

            {/* Periods Timetable List */}
            {filteredRoutines.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <FaCalendarAlt style={{ fontSize: '2rem', color: 'var(--clr-text-muted, #9ca3af)', marginBottom: '10px' }} />
                <p style={{ margin: 0, color: 'var(--clr-text-muted, #6b7280)', fontSize: '0.875rem' }}>
                  No classes scheduled for {selectedDay}{childClass ? ` in ${childClass}` : ''}.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {filteredRoutines.map((item, idx) => {
                  const isBreak = item.type === 'Break'
                  const attBadge = getAttendanceBadge(item.attendance_status)

                  return (
                    <motion.div
                      key={item.id || idx}
                      whileHover={{ y: -2 }}
                      style={{
                        padding: '16px 20px',
                        borderRadius: '12px',
                        border: '1px solid var(--clr-border, #e5e7eb)',
                        borderLeft: `4px solid ${isBreak ? '#f59e0b' : item.type === 'Lab' ? '#10b981' : 'var(--clr-primary, #005A9E)'}`,
                        background: isBreak ? 'rgba(245, 158, 11, 0.03)' : 'var(--clr-surface, #ffffff)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '16px',
                      }}
                    >
                      {/* Left: Time and Subject */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '18px', minWidth: '240px' }}>
                        <div style={{ padding: '8px 14px', borderRadius: '8px', background: 'rgba(0, 90, 158, 0.08)', textAlign: 'center', minWidth: '85px' }}>
                          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--clr-primary, #005A9E)' }}>
                            {item.period}
                          </div>
                          {selectedDay === 'ALL' && (
                            <div style={{ fontSize: '0.68rem', color: 'var(--clr-text-muted, #6b7280)', fontWeight: 600 }}>
                              {item.day.substring(0, 3)}
                            </div>
                          )}
                          <div style={{ fontSize: '0.74rem', color: 'var(--clr-text-muted, #6b7280)', fontWeight: 600, marginTop: '2px' }}>
                            <FaClock style={{ fontSize: '0.65rem', marginRight: '3px' }} />
                            {item.time}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--clr-text, #111827)' }}>
                            {item.subject}
                            {item.code && (
                              <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--clr-text-muted, #6b7280)', marginLeft: '8px' }}>
                                ({item.code})
                              </span>
                            )}
                          </div>
                          {!isBreak && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--clr-text-muted, #6b7280)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                              <FaChalkboardTeacher /> {item.teacher}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Middle: Classroom Location */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '120px' }}>
                        <span style={{ color: '#10b981', fontSize: '0.9rem' }}>
                          <FaDoorOpen />
                        </span>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--clr-text-muted, #6b7280)' }}>Room</div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--clr-text, #111827)' }}>{item.room}</div>
                        </div>
                      </div>

                      {/* Right: Period Attendance Status Badge (Integrated in Routine) */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '6px 14px',
                            borderRadius: '20px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            background: attBadge.bg,
                            color: attBadge.color,
                            border: `1px solid ${attBadge.border}`,
                          }}
                        >
                          {attBadge.icon}
                          {attBadge.label}
                        </span>

                        <span
                          style={{
                            display: 'inline-flex',
                            padding: '4px 10px',
                            borderRadius: '16px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            background: isBreak ? 'rgba(245, 158, 11, 0.15)' : item.type === 'Lab' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0, 90, 158, 0.1)',
                            color: isBreak ? '#d97706' : item.type === 'Lab' ? '#059669' : 'var(--clr-primary, #005A9E)',
                          }}
                        >
                          {item.type}
                        </span>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </motion.div>
  )
}

