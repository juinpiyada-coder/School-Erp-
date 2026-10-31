import axios from '../../lib/axios'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  FaCalendarAlt,
  FaChartBar,
  FaCheckCircle,
  FaTimesCircle,
  FaClipboardList,
  FaClock,
  FaChalkboardTeacher,
  FaDoorOpen
} from 'react-icons/fa'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

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
  }
}

// Mapper for GET /student/routine payload with period attendance
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

export default function StudentDashboard() {
  const navigate = useNavigate()
  const [routines, setRoutines] = useState([])
  const [attendance, setAttendance] = useState({ total: 0, present: 0, absent: 0, pct: null })
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const api = import.meta.env.VITE_API_BASE_URL

    const load = async () => {
      setLoading(true)
      try {
        const [rRes, aRes] = await Promise.allSettled([
          axios.get(`${api}/student/routine?date=${selectedDate}`),
          axios.get(`${api}/student/subject-attendance`)
        ])

        let routineItems = []
        if (rRes.status === 'fulfilled') {
          const payload = rRes.value?.data
          const items = Array.isArray(payload) ? payload : payload?.data || []
          routineItems = items.map(mapRoutineItem)
          // Number periods per day (Period 1..N) in timetable order —
          // backend sends raw schedule ids, we show clean period numbers
          const counters = {}
          routineItems = routineItems.map((it) => {
            const k = String(it.day || '').toLowerCase()
            counters[k] = (counters[k] || 0) + 1
            return { ...it, period: `Period ${counters[k]}` }
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

  const todayName = DAY_NAMES[new Date().getDay()]
  const todayRoutines = routines.filter(r => String(r.day || '').toLowerCase() === todayName.toLowerCase())

  const attendancePct = attendance.pct
  const hasAttendance = attendance.total > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* ── Welcome Banner ──────────────────────────────────────── */}
      <div className="dashboard-welcome-banner" />

      {loading ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', borderRadius: '12px' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--clr-text-muted, #6b7280)' }}>Loading your dashboard...</p>
        </div>
      ) : (
        <>
          {/* ── Metrics Row: Routine + Attendance only ───────────── */}
          <div className="metrics-grid metrics-grid-2">
            <motion.div
              whileHover={{ y: -4 }}
              className="glass-panel metric-card"
              onClick={() => navigate('/student/routine')}
              style={{ cursor: 'pointer' }}
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
            >
              <div className="metric-icon-wrap metric-icon-orange"><FaChartBar /></div>
              <div className="metric-label">My Total Attendance</div>
              <div className="metric-value">
                {attendancePct !== null ? `${attendancePct}%` : 'Not Recorded'}
              </div>
              <span className="metric-delta metric-delta-up">➔ View Attendance Per Subject</span>
            </motion.div>
          </div>

          {/* ── Two-Column Split: Routine | Attendance ──────────── */}
          <div className="dashboard-split">
            {/* ── Today's Routine (branch-level main routine) ── */}
            <div className="glass-panel chart-card">
              <div className="section-header">
                <h3 className="section-title">
                  <span className="section-title-dot" />
                  Today&apos;s Routine — {todayName}
                </h3>
                <span
                  className="section-link"
                  onClick={() => navigate('/student/routine')}
                  style={{ cursor: 'pointer' }}
                >
                  Open Full Routine →
                </span>
              </div>

              {todayRoutines.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <FaCalendarAlt style={{ fontSize: '2rem', color: 'var(--clr-text-muted, #9ca3af)', marginBottom: '10px' }} />
                  <p style={{ margin: 0, color: 'var(--clr-text-muted, #6b7280)', fontSize: '0.875rem' }}>
                    No classes scheduled for {todayName}. Enjoy your rest day or self-study!
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {todayRoutines.map((item) => {
                    const isBreak = item.type === 'Break'
                    return (
                      <motion.div
                        key={item.id}
                        whileHover={{ y: -2 }}
                        style={{
                          padding: '14px 18px',
                          borderRadius: '10px',
                          border: '1px solid var(--clr-border, #e5e7eb)',
                          borderLeft: `4px solid ${isBreak ? '#f59e0b' : item.type === 'Lab' ? '#10b981' : 'var(--clr-primary, #005A9E)'}`,
                          background: isBreak ? 'rgba(245, 158, 11, 0.04)' : 'var(--clr-surface, #ffffff)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 180px', minWidth: 0 }}>
                          <div style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(0, 90, 158, 0.08)', textAlign: 'center', minWidth: '78px', flexShrink: 0 }}>
                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--clr-primary, #005A9E)' }}>
                              {item.period}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--clr-text-muted, #6b7280)', fontWeight: 600 }}>
                              <FaClock style={{ fontSize: '0.65rem', marginRight: '3px' }} />
                              {item.time}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--clr-text, #111827)' }}>
                              {item.subject}
                              {item.code && (
                                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--clr-text-muted, #6b7280)', marginLeft: '6px' }}>
                                  ({item.code})
                                </span>
                              )}
                            </div>
                            {!isBreak && (
                              <div style={{ fontSize: '0.78rem', color: 'var(--clr-text-muted, #6b7280)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                <FaChalkboardTeacher /> {item.teacher}
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--clr-text-muted, #6b7280)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <FaDoorOpen style={{ color: '#10b981' }} /> {item.room}
                          </span>
                          {(() => {
                            const badge = getAttendanceBadge(item.attendance_status)
                            return (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '4px 10px',
                                  borderRadius: '16px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  background: badge.bg,
                                  color: badge.color,
                                  border: `1px solid ${badge.border}`,
                                }}
                              >
                                {badge.icon}
                                {badge.label}
                              </span>
                            )
                          })()}
                          <span
                            style={{
                              display: 'inline-flex',
                              padding: '4px 12px',
                              borderRadius: '16px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              background: isBreak ? 'rgba(245, 158, 11, 0.15)' : item.type === 'Lab' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0, 90, 158, 0.12)',
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

            {/* ── My Total Attendance (this student only, totals only) ── */}
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
          </div>
        </>
      )}
    </motion.div>
  )
}
