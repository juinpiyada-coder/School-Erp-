import axios from '../../lib/axios'
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWhitelabel } from '../../contexts/WhitelabelContext'
import { motion } from 'framer-motion'
import {
  FaCalendarAlt,
  FaChartBar,
  FaCheckCircle,
  FaTimesCircle,
  FaClipboardList,
  FaClock,
  FaChalkboardTeacher,
  FaDoorOpen,
  FaExclamationCircle
} from 'react-icons/fa'

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function mapRoutineItem(r, idx) {
  const from = (r.SCHL_CLS_SCHDL_FRM_DT || r.time?.split(' - ')[0] || '08:00').toString().substring(0, 5)
  const to = (r.SCHL_CLS_SCHDL_TO_DT || r.time?.split(' - ')[1] || '08:45').toString().substring(0, 5)
  return {
    id: r.id || r.SCHL_CLS_SCHLDL_ID || idx,
    day: r.day || r.SCHL_DAY_OF_WK || 'Monday',
    period: r.period || r.period_label || `Period ${idx + 1}`,
    time: r.time || `${from} - ${to}`,
    subject: r.subject || r.subject_name || r.SCHLDL_SUB_NM || r.subject || 'Subject',
    code: r.code || r.subject_code || r.code || '',
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

export default function StudentDashboard() {
  const navigate = useNavigate()
  const { settings } = useWhitelabel()
  const [userData, setUserData] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('e_school_user')) || {}
    } catch (e) {
      return {}
    }
  })
  const [studentInfo, setStudentInfo] = useState(null)
  const [routines, setRoutines] = useState([])
  const [attendance, setAttendance] = useState({ total: 0, present: 0, absent: 0, pct: null })
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [selectedDay, setSelectedDay] = useState(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const today = days[new Date().getDay()]
    return today === 'Sunday' ? 'Monday' : today
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const api = import.meta.env.VITE_API_BASE_URL

    const load = async () => {
      setLoading(true)
      try {
        const [rRes, aRes, pRes] = await Promise.allSettled([
          axios.get(`${api}/student/routine?date=${selectedDate}`),
          axios.get(`${api}/student/subject-attendance`),
          axios.get(`${api}/student/profile`)
        ])

        if (pRes.status === 'fulfilled') {
          const pData = pRes.value?.data?.data || pRes.value?.data || {}
          setStudentInfo(pData)
        }

        let routineItems = []
        if (rRes.status === 'fulfilled') {
          const payload = rRes.value?.data
          const items = Array.isArray(payload) ? payload : (payload?.data || payload?.routines || [])
          routineItems = items.map(mapRoutineItem)
          // Number periods per day in timetable order
          const counters = {}
          routineItems = routineItems.map((it) => {
            const k = String(it.day || '').trim().toLowerCase()
            counters[k] = (counters[k] || 0) + 1
            return { ...it, period: it.period && !it.period.startsWith('Period SCH_') ? it.period : `Period ${counters[k]}` }
          })
        }

        let totals = { total: 0, present: 0, absent: 0, pct: null }
        if (aRes.status === 'fulfilled') {
          const data = aRes.value?.data?.data || aRes.value?.data || {}
          const summary = Array.isArray(data.summary) ? data.summary : []
          const total = summary.reduce((acc, s) => acc + (Number(s.totalSessions) || 0), 0)
          const present = summary.reduce((acc, s) => acc + (Number(s.presentSessions) || 0), 0)
          const absent = summary.reduce((acc, s) => acc + (Number(s.absentSessions) || 0), 0)
          totals = {
            total,
            present,
            absent,
            pct: total > 0 ? Math.round(((present * 100) / total) * 10) / 10 : null,
          }
        }

        if (!cancelled) {
          setRoutines(routineItems)
          setAttendance(totals)
          setLoading(false)
        }
      } catch (e) {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [selectedDate])

  const filteredRoutines = useMemo(() => {
    if (selectedDay === 'ALL') return routines
    return routines.filter(r => String(r.day || '').trim().toLowerCase() === selectedDay.trim().toLowerCase())
  }, [routines, selectedDay])

  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const todayRoutines = routines.filter(r => String(r.day || '').trim().toLowerCase() === todayName.trim().toLowerCase())

  const attendancePct = attendance.pct
  const hasAttendance = attendance.total > 0

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

      {/* ── Student Identity Card ───────────────────────────────── */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '16px 20px', 
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
        <div>
          <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--clr-text-muted, #6b7280)', fontWeight: 600 }}>
            Student Enrollment Profile
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--clr-text, #111827)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '2px' }}>
            <span>{userData?.name || userData?.first_name || 'Enrolled Student'}</span>
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--clr-primary, #005A9E)', background: 'rgba(0, 90, 158, 0.08)', padding: '3px 10px', borderRadius: '6px' }}>
              {studentInfo?.className || userData?.class_name || userData?.className || 'Class'}
              {(studentInfo?.sectionName || userData?.section_name || userData?.sectionName || userData?.section) ? ` - Section ${studentInfo?.sectionName || userData?.section_name || userData?.sectionName || userData?.section}` : ''}
            </span>
            {(studentInfo?.branchName || userData?.branch_name || userData?.branchName) && (
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#059669', background: 'rgba(16, 185, 129, 0.08)', padding: '3px 10px', borderRadius: '6px' }}>
                Branch: {studentInfo?.branchName || userData?.branch_name || userData?.branchName}
              </span>
            )}
            {(studentInfo?.rollNo || userData?.roll_no || userData?.rollNo) && (
              <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--clr-text-muted, #6b7280)' }}>
                · Roll No: {studentInfo?.rollNo || userData?.roll_no || userData?.rollNo}
              </span>
            )}
          </div>
        </div>
      </div>

      {loading && routines.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', borderRadius: '12px' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--clr-text-muted, #6b7280)' }}>Loading your dashboard...</p>
        </div>
      ) : (
        <>
          {/* ── Metrics Row ──────────────────────────────────────── */}
          <div className="metrics-grid metrics-grid-2" style={{ marginBottom: '24px' }}>
            <motion.div
              whileHover={{ y: -4 }}
              className="glass-panel metric-card"
              onClick={() => navigate('/student/routine')}
              style={{ cursor: 'pointer' }}
              role="button"
              tabIndex={0}
            >
              <div className="metric-icon-wrap metric-icon-blue"><FaCalendarAlt /></div>
              <div className="metric-label">Daily Routine</div>
              <div className="metric-value">
                {todayRoutines.length > 0 ? `${todayRoutines.length} Periods Today` : `No Classes Today`}
              </div>
              <span className="metric-delta metric-delta-up">➔ View Class Timetable</span>
            </motion.div>

            <motion.div
              whileHover={{ y: -4 }}
              className="glass-panel metric-card"
              onClick={() => navigate('/student/attendance-report')}
              style={{ cursor: 'pointer' }}
              role="button"
              tabIndex={0}
            >
              <div className="metric-icon-wrap metric-icon-orange"><FaChartBar /></div>
              <div className="metric-label">My Total Attendance</div>
              <div className="metric-value">
                {attendancePct !== null ? `${attendancePct}%` : 'Not Recorded'}
              </div>
              <span className="metric-delta metric-delta-up">➔ View Attendance Per Subject</span>
            </motion.div>
          </div>

          {/* ── Unified Daily Routine & Attendance Module ─────────── */}
          <div className="glass-panel chart-card" style={{ padding: '24px', borderRadius: '12px', marginBottom: '24px' }}>
            <div className="section-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="section-title-dot" />
                  My Daily Routine & Class Attendance
                </h3>
                <p style={{ margin: '4px 0 0 0', color: 'var(--clr-text-muted, #6b7280)', fontSize: '0.82rem' }}>
                  Real-time period schedule with slot attendance verification from assigned branch faculty.
                </p>
              </div>

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
                  No classes scheduled for {selectedDay}. Enjoy your rest day or self-study!
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
                              {String(item.day).substring(0, 3)}
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

                      {/* Right: Period Attendance Status Badge */}
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

          {/* ── My Total Attendance (detailed) ───────────────────── */}
          <div className="glass-panel chart-card">
            <div className="section-header">
              <h3 className="section-title">
                <span className="section-title-dot" />
                My Total Attendance
              </h3>
              <span
                className="section-link"
                onClick={() => navigate('/student/attendance-report')}
                style={{ cursor: 'pointer' }}
                role="button"
                tabIndex={0}
              >
                Details →
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div style={{ width: '46px', height: '46px', borderRadius: '10px', background: 'rgba(0, 90, 158, 0.12)', color: 'var(--clr-primary, #005A9E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.15rem' }}>
                <FaChartBar />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, color: 'var(--clr-text-muted, #6b7280)' }}>
                  Overall Attendance
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: attendancePct !== null ? 'var(--clr-text, #111827)' : 'var(--clr-text-muted, #9ca3af)' }}>
                  {attendancePct !== null ? `${attendancePct}%` : '—'}
                </div>
              </div>
            </div>

            {hasAttendance ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--clr-border, #e5e7eb)', background: 'var(--clr-surface, #ffffff)' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(0, 90, 158, 0.12)', color: 'var(--clr-primary, #005A9E)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FaClipboardList />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--clr-text-muted, #6b7280)' }}>Total Classes Marked</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--clr-text, #111827)' }}>{attendance.total}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--clr-border, #e5e7eb)', background: 'var(--clr-surface, #ffffff)' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FaCheckCircle />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--clr-text-muted, #6b7280)' }}>Total Present</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>{attendance.present}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--clr-border, #e5e7eb)', background: 'var(--clr-surface, #ffffff)' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FaTimesCircle />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--clr-text-muted, #6b7280)' }}>Total Absent</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#dc2626' }}>{attendance.absent}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '30px 10px', textAlign: 'center' }}>
                <FaChartBar style={{ fontSize: '1.8rem', color: 'var(--clr-text-muted, #9ca3af)', marginBottom: '8px' }} />
                <p style={{ margin: 0, color: 'var(--clr-text-muted, #6b7280)', fontSize: '0.85rem' }}>
                  No attendance recorded yet. Your status will appear here once classes are marked.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </motion.div>
  )
}