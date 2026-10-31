import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  FaClipboardCheck,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaExclamationTriangle,
  FaUserGraduate,
  FaSearch,
  FaFilter,
  FaCalendarAlt,
  FaChalkboardTeacher,
  FaBook
} from 'react-icons/fa'
import axios from '../../lib/axios'


export default function SubjectAttendanceReport({ forcedRole = null }) {
  const [userRole, setUserRole] = useState('')
  const [wards, setWards] = useState([])
  const [selectedWard, setSelectedWard] = useState('')
  const [subjectSummary, setSubjectSummary] = useState([])
  const [logs, setLogs] = useState([])
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    try {
      const u = JSON.parse(sessionStorage.getItem('e_school_user') || '{}')
      const role = (forcedRole || u?.user_role || u?.role || '').toUpperCase()
      setUserRole(role)
    } catch (e) {}
  }, [forcedRole])

  const isParent = userRole.includes('PARENT') || userRole.includes('GUARDIAN')

  // Load parent's wards if parent
  useEffect(() => {
    if (isParent) {
      axios.get(`${import.meta.env.VITE_API_BASE_URL}/student/wards`)
        .then(res => {
          const list = Array.isArray(res.data) ? res.data : res.data?.data || []
          setWards(list)
          if (list.length > 0) {
            setSelectedWard(list[0].id || list[0].STU_ID || '')
          }
        })
        .catch(() => {
          setWards([]); setSelectedWard('')
        })
    }
  }, [isParent])

  // Fetch subject-wise attendance data
  useEffect(() => {
    setLoading(true)
    const endpoint = isParent && selectedWard
      ? `${import.meta.env.VITE_API_BASE_URL}/student/subject-attendance?student_id=${selectedWard}`
      : `${import.meta.env.VITE_API_BASE_URL}/student/subject-attendance`

    axios.get(endpoint)
      .then(res => {
        const data = res.data?.data || res.data
        if (data?.summary && Array.isArray(data.summary) && data.summary.length > 0) {
          setSubjectSummary(data.summary)
          if (data?.logs && Array.isArray(data.logs)) {
            setLogs(data.logs)
          }
        } else {
          setSubjectSummary([])
          setLogs([])
        }
      })
      .catch(() => {
        setSubjectSummary([])
        setLogs([])
      })
      .finally(() => setLoading(false))
  }, [isParent, selectedWard])

  // Overall Statistics Calculation
  const totalStats = useMemo(() => {
    const totalHeld = subjectSummary.reduce((acc, s) => acc + (s.totalSessions || 0), 0)
    const totalPresent = subjectSummary.reduce((acc, s) => acc + (s.presentSessions || 0), 0)
    const totalAbsent = subjectSummary.reduce((acc, s) => acc + (s.absentSessions || 0), 0)
    const overallPct = totalHeld > 0 ? ((totalPresent * 100) / totalHeld).toFixed(1) : 0
    return {
      totalHeld,
      totalPresent,
      totalAbsent,
      overallPct
    }
  }, [subjectSummary])

  // Filtered Detailed Logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchSubject = selectedSubjectFilter === 'ALL' || log.subject.toLowerCase() === selectedSubjectFilter.toLowerCase()
      const matchStatus = statusFilter === 'ALL' || log.status.toLowerCase() === statusFilter.toLowerCase()
      const matchSearch = log.subject.toLowerCase().includes(search.toLowerCase()) || 
                          log.teacher.toLowerCase().includes(search.toLowerCase()) ||
                          log.date.includes(search)
      return matchSubject && matchStatus && matchSearch
    })
  }, [logs, selectedSubjectFilter, statusFilter, search])

  const selectedWardObj = wards.find(w => (w.id || w.STU_ID) === selectedWard)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="page-container"
    >
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="section-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ display: 'inline-flex', padding: '10px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', fontSize: '1.25rem' }}>
              <FaClipboardCheck />
            </span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--clr-text, #111827)' }}>
                {isParent ? 'Children Attendance Per Subject' : 'My Attendance Per Subject'}
              </h2>
              <p style={{ margin: '4px 0 0 0', color: 'var(--clr-text-muted, #6b7280)', fontSize: '0.875rem' }}>
                Subject-wise attendance breakdown, attendance percentage thresholds, and daily period logs.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Parent Ward Switcher Bar (Only if Parent) ──────────── */}
      {isParent && (
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
            borderLeft: '4px solid #10b981'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              <FaUserGraduate />
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--clr-text-muted, #6b7280)', fontWeight: 600 }}>
                Selected Child / Ward
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--clr-text, #111827)' }}>
                {selectedWardObj?.STU_NM || selectedWardObj?.name || 'Selected Student'} 
                <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--clr-text-muted, #6b7280)', marginLeft: '8px' }}>
                  ({selectedWardObj?.className || selectedWardObj?.grade || 'Class Section'})
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label htmlFor="wardSelectAttendance" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--clr-text, #111827)' }}>
              Switch Ward:
            </label>
            <select
              id="wardSelectAttendance"
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="form-control"
              style={{ padding: '8px 14px', borderRadius: '8px', minWidth: '220px', fontWeight: 500 }}
            >
              {wards.map(w => (
                <option key={w.id || w.STU_ID} value={w.id || w.STU_ID}>
                  {w.STU_NM || w.name} {w.className ? `— ${w.className}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ── Top Attendance Metric Cards ────────────────────────── */}
      <div className="grid-auto-sm" style={{ gap: '16px', marginBottom: '24px' }}>
        <div className="glass-panel" style={{ padding: '18px 20px', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--clr-text-muted, #6b7280)', fontWeight: 600, textTransform: 'uppercase' }}>
            Cumulative Attendance
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: totalStats.overallPct >= 75 ? '#10b981' : '#ef4444', marginTop: '4px' }}>
            {totalStats.overallPct}%
          </div>
          <span 
            style={{ 
              display: 'inline-block', 
              fontSize: '0.75rem', 
              fontWeight: 600, 
              color: totalStats.overallPct >= 75 ? '#059669' : '#dc2626',
              marginTop: '4px' 
            }}
          >
            {totalStats.overallPct >= 75 ? '✓ Exam Eligible (> 75%)' : '⚠ Below 75% Requirement'}
          </span>
        </div>

        <div className="glass-panel" style={{ padding: '18px 20px', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--clr-text-muted, #6b7280)', fontWeight: 600, textTransform: 'uppercase' }}>
            Total Lectures Held
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--clr-text, #111827)', marginTop: '4px' }}>
            {totalStats.totalHeld}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted, #6b7280)' }}>
            Across all enrolled subjects
          </span>
        </div>

        <div className="glass-panel" style={{ padding: '18px 20px', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--clr-text-muted, #6b7280)', fontWeight: 600, textTransform: 'uppercase' }}>
            Classes Attended
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
            {totalStats.totalPresent}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
            Present in lecture periods
          </span>
        </div>

        <div className="glass-panel" style={{ padding: '18px 20px', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--clr-text-muted, #6b7280)', fontWeight: 600, textTransform: 'uppercase' }}>
            Classes Missed
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>
            {totalStats.totalAbsent}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>
            Absences / leaves recorded
          </span>
        </div>
      </div>

      {/* ── Subject-Wise Attendance Overview Grid ──────────────── */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--clr-text, #111827)' }}>
            Subject Breakdown & Thresholds
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--clr-text-muted, #6b7280)' }}>
            Click card to view subject logs below
          </span>
        </div>

        <div className="grid-auto-lg" style={{ gap: '16px' }}>
          {subjectSummary.map(sub => {
            const isSafe = sub.percentage >= 75
            const isSelected = selectedSubjectFilter.toLowerCase() === sub.subjectName.toLowerCase()
            return (
              <motion.div
                key={sub.subjectId}
                whileHover={{ y: -3 }}
                onClick={() => setSelectedSubjectFilter(isSelected ? 'ALL' : sub.subjectName)}
                className="glass-panel"
                style={{
                  padding: '18px 20px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  border: isSelected ? '2px solid var(--clr-primary, #005A9E)' : undefined,
                  borderLeft: isSafe ? '4px solid #10b981' : '4px solid #ef4444',
                  boxShadow: isSelected ? '0 4px 12px rgba(0, 90, 158, 0.15)' : undefined
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--clr-text, #111827)' }}>
                      {sub.subjectName}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--clr-text-muted, #6b7280)', marginTop: '2px' }}>
                      {sub.teacher}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: isSafe ? '#10b981' : '#ef4444' }}>
                      {sub.percentage}%
                    </div>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '10px',
                        background: isSafe ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                        color: isSafe ? '#059669' : '#dc2626'
                      }}
                    >
                      {sub.status}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden', margin: '12px 0 8px' }}>
                  <div 
                    style={{ 
                      width: `${sub.percentage}%`, 
                      height: '100%', 
                      background: isSafe ? '#10b981' : '#ef4444', 
                      borderRadius: '4px' 
                    }} 
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--clr-text-muted, #6b7280)', fontWeight: 500 }}>
                  <span>Attended: <strong>{sub.presentSessions}</strong> / {sub.totalSessions}</span>
                  <span>Missed: <strong style={{ color: sub.absentSessions > 3 ? '#ef4444' : undefined }}>{sub.absentSessions}</strong></span>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* ── Daily Period Attendance Logs ───────────────────────── */}
      <div className="glass-panel" style={{ padding: '24px', borderRadius: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--clr-text, #111827)' }}>
              Detailed Attendance Log
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--clr-text-muted, #6b7280)' }}>
              Showing {filteredLogs.length} attendance records
            </p>
          </div>

          {/* Filter bars */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div className="header-search">
              <span className="header-search-icon"><FaSearch /></span>
              <input
                type="search"
                className="header-search-input"
                placeholder="Search subject, faculty, date…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ padding: '6px 10px 6px 30px', fontSize: '0.82rem' }}
              />
            </div>

            <select
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
              className="form-control"
              style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '0.82rem' }}
            >
              <option value="ALL">All Subjects</option>
              {subjectSummary.map(s => (
                <option key={s.subjectId} value={s.subjectName}>{s.subjectName}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-control"
              style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '0.82rem' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
              <option value="LATE">Late</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--clr-border, #e5e7eb)', color: 'var(--clr-text-muted, #6b7280)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px' }}>Date & Day</th>
                <th style={{ padding: '12px 16px' }}>Period</th>
                <th style={{ padding: '12px 16px' }}>Subject</th>
                <th style={{ padding: '12px 16px' }}>Teacher</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: 'var(--clr-text-muted, #9ca3af)' }}>
                    No attendance records match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const isPresent = log.status.toLowerCase() === 'present'
                  const isLate = log.status.toLowerCase() === 'late'
                  return (
                    <tr 
                      key={log.id} 
                      style={{ 
                        borderBottom: '1px solid var(--clr-border, #f3f4f6)', 
                        fontSize: '0.875rem' 
                      }}
                    >
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--clr-text, #111827)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FaCalendarAlt style={{ color: 'var(--clr-primary, #005A9E)', fontSize: '0.8rem' }} />
                          {log.date}
                          <span style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted, #6b7280)', fontWeight: 400 }}>
                            ({log.day})
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--clr-text-muted, #6b7280)' }}>
                        {log.period}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--clr-text, #111827)' }}>
                        {log.subject}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--clr-text-muted, #6b7280)' }}>
                        {log.teacher}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: isPresent 
                              ? 'rgba(16, 185, 129, 0.12)' 
                              : isLate 
                                ? 'rgba(245, 158, 11, 0.12)' 
                                : 'rgba(239, 68, 68, 0.12)',
                            color: isPresent ? '#059669' : isLate ? '#d97706' : '#dc2626'
                          }}
                        >
                          {isPresent ? <FaCheckCircle /> : isLate ? <FaClock /> : <FaTimesCircle />}
                          {log.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--clr-text-muted, #6b7280)', fontSize: '0.8rem' }}>
                        {log.remarks || '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  )
}
