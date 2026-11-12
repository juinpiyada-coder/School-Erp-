import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  FaCalendarAlt,
  FaClock,
  FaDoorOpen,
  FaBook,
  FaChalkboardTeacher,
  FaPrint,
  FaLayerGroup,
  FaCheckCircle,
  FaArrowLeft,
  FaGraduationCap
} from 'react-icons/fa'
import axios from '../../lib/axios'
import { toast } from 'react-toastify'
import { useRealtimeSubscription } from '../../contexts/RealtimeContext'

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function TeacherDailyRoutine() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [routines, setRoutines] = useState([])
  const [selectedDay, setSelectedDay] = useState(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const today = days[new Date().getDay()]
    return today === 'Sunday' ? 'Monday' : today
  })

  // Load current user from session
  useEffect(() => {
    try {
      const u = JSON.parse(sessionStorage.getItem('e_school_user') || '{}')
      setCurrentUser(u)
    } catch (e) {}
  }, [])

  // Fetch full timetable & lookups for real-time parity with Dashboard
  const fetchRoutines = useCallback(async () => {
    try {
      setLoading(true)
      const [schRes, clsRes, subRes, rmRes, tchrRes] = await Promise.allSettled([
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/timetable`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/classes?limit=1000`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/subjects?limit=1000`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/rooms?limit=1000`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/staff/teachers?limit=1000`)
      ])

      const rawSchedule = schRes.status === 'fulfilled' ? (Array.isArray(schRes.value.data) ? schRes.value.data : schRes.value.data?.data || []) : []
      const classes = clsRes.status === 'fulfilled' ? (Array.isArray(clsRes.value.data) ? clsRes.value.data : clsRes.value.data?.data || []) : []
      const subjects = subRes.status === 'fulfilled' ? (Array.isArray(subRes.value.data) ? subRes.value.data : subRes.value.data?.data || []) : []
      const rooms = rmRes.status === 'fulfilled' ? (Array.isArray(rmRes.value.data) ? rmRes.value.data : rmRes.value.data?.data || []) : []
      const teachers = tchrRes.status === 'fulfilled' ? (Array.isArray(tchrRes.value.data) ? tchrRes.value.data : tchrRes.value.data?.data || []) : []

      const u = currentUser || JSON.parse(sessionStorage.getItem('e_school_user') || '{}')
      const uid = String(u.id || u.user_id || u.teacher_id || u.teacherId || '').toLowerCase()
      const uemail = String(u.email || u.user_email_id || '').toLowerCase()
      const uname = String(u.name || u.first_name || '').toLowerCase()

      const matchedTeacher = teachers.find(t => {
        const tId = String(t.BR_TCHR_ID || t.br_tchr_id || t.TCHR_ID || t.tchr_id || t.id || '').toLowerCase()
        const tEmail = String(t.BR_TCHR_EMAI_ID || t.TCHR_EMAIL || t.email || '').toLowerCase()
        const tName = String(t.BR_TCHR_NM || t.br_tchr_nm || t.TCHR_NM || t.tchr_nm || t.name || '').toLowerCase()
        return (tId && tId === uid) || (tEmail && tEmail === uemail) || (uname && tName === uname)
      })

      const targetTeacherId = matchedTeacher ? String(matchedTeacher.BR_TCHR_ID || matchedTeacher.br_tchr_id || matchedTeacher.TCHR_ID || matchedTeacher.tchr_id || matchedTeacher.id) : (uid || null)
      const targetTeacherName = (matchedTeacher ? (matchedTeacher.BR_TCHR_NM || matchedTeacher.name) : u?.name || '').toLowerCase().trim()

      const mySlots = rawSchedule.filter(slot => {
        const slotTchrId = String(slot.SCHL_BR_TCHR_ID || slot.schl_br_tchr_id || '')
        if (targetTeacherId && slotTchrId && String(slotTchrId) === String(targetTeacherId)) return true
        const slotTchrName = String(slot.teacher_name || '').toLowerCase().trim()
        if (targetTeacherName && slotTchrName && (slotTchrName === targetTeacherName || targetTeacherName.includes(slotTchrName) || slotTchrName.includes(targetTeacherName))) {
          return true
        }
        return false
      }).map((slot, idx) => {
        const subId = String(slot.SCHL_CLS_SCHLDL_SUB_ID || slot.schl_cls_schldl_sub_id || '')
        const clsId = String(slot.SCHL_CLS_SCHLDL_SEC_SESS_ID || slot.schl_cls_schldl_sec_sess_id || '')
        const rmId = String(slot.SCHL_BR_RM_ID || slot.schl_br_rm_id || '')

        const sub = subjects.find(s => String(s.BR_CLS_SUB_ID || s.br_cls_sub_id || s.SUB_ID || s.id) === subId)
        const cls = classes.find(c => String(c.SCHL_BR_CLS_ID || c.schl_br_cls_id || c.id) === clsId)
        const rm = rooms.find(r => String(r.SCHL_BR_RM_ID || r.schl_br_rm_id || r.id) === rmId)

        const fromTime = (slot.SCHL_CLS_SCHDL_FRM_DT || '08:00').substring(0, 5)
        const toTime = (slot.SCHL_CLS_SCHDL_TO_DT || '08:45').substring(0, 5)

        return {
          id: slot.SCHL_CLS_SCHLDL_ID || slot.id || idx,
          day: slot.SCHL_DAY_OF_WK || slot.day || 'Monday',
          fromTime,
          toTime,
          time: `${fromTime} - ${toTime}`,
          subject: sub?.BR_CLS_SUB_NAME || sub?.name || slot.subject_name || 'Subject',
          class_name: cls?.SCHL_BR_CLASS_NM || cls?.name || slot.class_name || 'Assigned Class',
          room: rm?.SCHL_BR_ROOM_DESC || rm?.name || slot.SCHL_BR_RM_ID || 'Classroom',
          teacher: matchedTeacher?.BR_TCHR_NM || u?.name || 'Assigned Faculty'
        }
      })

      // Sort chronological
      mySlots.sort((a, b) => a.fromTime.localeCompare(b.fromTime))

      setRoutines(mySlots)
    } catch (err) {
      toast.error('Failed to load teaching schedule')
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  // Subscriptions for instant real-time sync
  useRealtimeSubscription('routine', fetchRoutines)
  useRealtimeSubscription('timetable', fetchRoutines)
  useRealtimeSubscription('*', fetchRoutines)

  useEffect(() => {
    fetchRoutines()
  }, [fetchRoutines])

  // Filtered by selected day
  const filteredSlots = useMemo(() => {
    if (selectedDay === 'ALL') return routines
    return routines.filter(r => String(r.day || '').toLowerCase() === selectedDay.toLowerCase())
  }, [routines, selectedDay])

  // Day counts summary
  const dayCounts = useMemo(() => {
    const counts = {}
    WEEK_DAYS.forEach(d => {
      counts[d] = routines.filter(r => String(r.day || '').toLowerCase() === d.toLowerCase()).length
    })
    return counts
  }, [routines])

  return (
    <motion.div
      className="animate-fade-in"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Page Header */}
      <div className="page-header flex justify-between items-center flex-wrap gap-md">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <FaCalendarAlt className="text-primary" /> My Teaching Routine & Schedule
          </h1>
          <p className="page-subtitle">
            Real-time daily classroom periods and lecture timings assigned to you
          </p>
        </div>

        <div className="flex gap-md items-center flex-wrap no-print">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate('/academic/schedule')}
            title="View entire class master schedule"
          >
            <FaLayerGroup /> Master Timetable Grid
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => window.print()}
          >
            <FaPrint /> Print Routine
          </button>
        </div>
      </div>

      {/* Teacher Profile Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'linear-gradient(135deg, rgba(0, 90, 158, 0.08) 0%, rgba(59, 130, 246, 0.05) 100%)',
          border: '1px solid rgba(0, 90, 158, 0.15)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: 'var(--clr-primary, #005A9E)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              fontWeight: 700
            }}
          >
            <FaChalkboardTeacher />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f1923' }}>
              {currentUser?.name || 'Faculty Member'}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--clr-text-muted, #64748b)' }}>
              Total Weekly Classes: <strong>{routines.length} periods</strong>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span
            style={{
              padding: '6px 14px',
              background: 'rgba(59, 130, 246, 0.12)',
              color: '#2563eb',
              borderRadius: '20px',
              fontWeight: 600,
              fontSize: '0.82rem'
            }}
          >
            📍 {currentUser?.branch_name || currentUser?.branchName || 'Enrolled Branch'}
          </span>
          <span
            style={{
              padding: '6px 14px',
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#059669',
              borderRadius: '20px',
              fontWeight: 600,
              fontSize: '0.82rem'
            }}
          >
            ⚡ Live Routine Active
          </span>
        </div>
      </div>

      {/* Weekday Switcher Tabs */}
      <div
        className="glass-panel"
        style={{
          padding: '10px 14px',
          marginBottom: '20px',
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          alignItems: 'center'
        }}
      >
        <button
          type="button"
          onClick={() => setSelectedDay('ALL')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: selectedDay === 'ALL' ? 'var(--clr-primary, #005A9E)' : 'transparent',
            color: selectedDay === 'ALL' ? '#ffffff' : 'var(--clr-text, #334155)'
          }}
        >
          All Days ({routines.length})
        </button>

        {WEEK_DAYS.map(day => {
          const isSelected = selectedDay.toLowerCase() === day.toLowerCase()
          const count = dayCounts[day] || 0
          return (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(day)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: isSelected ? 'var(--clr-primary, #005A9E)' : 'transparent',
                color: isSelected ? '#ffffff' : 'var(--clr-text, #334155)'
              }}
            >
              <span>{day}</span>
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  background: isSelected ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 90, 158, 0.1)',
                  color: isSelected ? '#fff' : '#005A9E'
                }}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Schedule Period Cards */}
      <div className="glass-panel page-card" style={{ padding: '24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
            <p style={{ fontWeight: 600 }}>Loading real-time teaching routine...</p>
          </div>
        ) : filteredSlots.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            <FaCalendarAlt style={{ fontSize: '3rem', opacity: 0.3, marginBottom: '14px' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px', color: '#1e293b' }}>
              No Class Periods Scheduled
            </h3>
            <p style={{ fontSize: '0.85rem', maxWidth: '420px', margin: '0 auto' }}>
              You do not have any teaching classes scheduled for {selectedDay === 'ALL' ? 'the entire week' : selectedDay}.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {filteredSlots.map((slot, index) => (
              <motion.div
                key={slot.id || index}
                whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
                style={{
                  background: 'var(--clr-card-bg, #ffffff)',
                  border: '1px solid rgba(0, 90, 158, 0.15)',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Colored Top Accent */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: 'linear-gradient(90deg, #005A9E, #3a9fd6)'
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '8px',
                        background: 'rgba(0, 90, 158, 0.12)',
                        color: '#005A9E',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem'
                      }}
                    >
                      <FaBook />
                    </div>
                    <div>
                      <h4 style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a', margin: 0, textTransform: 'capitalize' }}>
                        {slot.subject}
                      </h4>
                      <span
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          color: '#005A9E',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginTop: '2px'
                        }}
                      >
                        <FaGraduationCap /> {slot.class_name}
                      </span>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '14px',
                      background: 'rgba(59, 130, 246, 0.12)',
                      color: '#2563eb'
                    }}
                  >
                    {slot.day}
                  </span>
                </div>

                {/* Info Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    background: 'rgba(0, 90, 158, 0.03)',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    fontSize: '0.82rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155' }}>
                    <FaClock style={{ color: '#005A9E', flexShrink: 0 }} />
                    <span style={{ fontWeight: 600 }}>{slot.time}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155' }}>
                    <FaDoorOpen style={{ color: '#005A9E', flexShrink: 0 }} />
                    <span>Room: <strong>{slot.room}</strong></span>
                  </div>
                </div>

                {/* Action Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '10px', borderTop: '1px solid rgba(0, 0, 0, 0.05)' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Faculty: <strong>{slot.teacher}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate('/academic/student-attendance')}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '16px',
                      border: 'none',
                      background: 'var(--clr-primary, #005A9E)',
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'opacity 0.2s'
                    }}
                  >
                    <FaCheckCircle style={{ fontSize: '0.7rem' }} /> Mark Attendance
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

