import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  FaCalendarAlt,
  FaClock,
  FaChalkboardTeacher,
  FaDoorOpen,
  FaPrint,
  FaUserGraduate,
  FaBook,
  FaCheckCircle,
  FaSun
} from 'react-icons/fa'
import axios from '../../lib/axios'
import { toast } from 'react-toastify'

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']


export default function DailyRoutine({ forcedRole = null }) {
  const [userRole, setUserRole] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const [wards, setWards] = useState([])
  const [selectedWard, setSelectedWard] = useState('')
  const [selectedDay, setSelectedDay] = useState(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const today = days[new Date().getDay()]
    return today === 'Sunday' ? 'Monday' : today
  })
  const [routines, setRoutines] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    try {
      const u = JSON.parse(sessionStorage.getItem('e_school_user') || '{}')
      setCurrentUser(u)
      const role = (forcedRole || u?.user_role || u?.role || '').toUpperCase()
      setUserRole(role)
    } catch (e) {}
  }, [forcedRole])

  const isParent = userRole.includes('PARENT') || userRole.includes('GUARDIAN')

  // Load wards if parent
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

  // Load routine data
  useEffect(() => {
    setLoading(true)
    const endpoint = isParent && selectedWard 
      ? `${import.meta.env.VITE_API_BASE_URL}/student/routine?student_id=${selectedWard}`
      : `${import.meta.env.VITE_API_BASE_URL}/student/routine`

    axios.get(endpoint)
      .then(res => {
        const items = Array.isArray(res.data) ? res.data : res.data?.data || []
        if (items.length > 0) {
          const mapped = items.map(r => ({
            id: r.id || r.SCHL_CLS_SCHLDL_ID,
            day: r.day || r.SCHL_DAY_OF_WK || 'Monday',
            period: r.period || r.period_label || 'Period',
            time: r.time || `${(r.SCHL_CLS_SCHDL_FRM_DT || '08:00').substring(0, 5)} - ${(r.SCHL_CLS_SCHDL_TO_DT || '08:45').substring(0, 5)}`,
            subject: r.subject || r.subject_name || r.SCHLDL_SUB_NM || 'Subject',
            teacher: r.teacher || r.teacher_name || r.SCHLDL_TCHR_NM || 'Faculty Guide',
            room: r.room || r.SCHL_BR_RM_ID || 'Classroom',
            code: r.code || r.subject_code || 'CRS-101',
            type: r.type || 'Lecture'
          }))
          setRoutines(mapped)
        } else {
          setRoutines([])
        }
      })
      .catch(() => {
        setRoutines([])
      })
      .finally(() => setLoading(false))
  }, [isParent, selectedWard])

  const filteredRoutines = useMemo(() => {
    if (selectedDay === 'ALL') return routines
    return routines.filter(r => r.day.toLowerCase() === selectedDay.toLowerCase())
  }, [routines, selectedDay])

  const handlePrint = () => {
    window.print()
  }

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
            <span style={{ display: 'inline-flex', padding: '10px', borderRadius: '10px', background: 'rgba(0, 90, 158, 0.12)', color: 'var(--clr-primary, #005A9E)', fontSize: '1.25rem' }}>
              <FaCalendarAlt />
            </span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--clr-text, #111827)' }}>
                {isParent ? 'Children Daily Routine & Timetable' : 'My Daily Routine & Schedule'}
              </h2>
              <p style={{ margin: '4px 0 0 0', color: 'var(--clr-text-muted, #6b7280)', fontSize: '0.875rem' }}>
                {isParent 
                  ? 'Inspect weekly class routine, assigned faculty, classroom halls, and timings for your child.' 
                  : 'View your weekly periods, active subjects, classroom rooms, and teacher schedules.'}
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            type="button" 
            onClick={handlePrint}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          >
            <FaPrint /> Print Routine
          </button>
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
            borderLeft: '4px solid var(--clr-primary, #005A9E)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(0, 90, 158, 0.15)', color: 'var(--clr-primary, #005A9E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
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
            <label htmlFor="wardSelect" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--clr-text, #111827)' }}>
              Switch Ward:
            </label>
            <select
              id="wardSelect"
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

      {/* ── Quick Stat Chips ────────────────────────────────────── */}
      <div className="grid-auto-sm" style={{ gap: '16px', marginBottom: '24px' }}>
        <div className="glass-panel" style={{ padding: '14px 18px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FaClock />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted, #6b7280)', fontWeight: 600, textTransform: 'uppercase' }}>Classes / Day</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--clr-text, #111827)' }}>5 Periods</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '14px 18px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FaBook />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted, #6b7280)', fontWeight: 600, textTransform: 'uppercase' }}>Subjects Enrolled</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--clr-text, #111827)' }}>7 Subjects</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '14px 18px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FaDoorOpen />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted, #6b7280)', fontWeight: 600, textTransform: 'uppercase' }}>Homeroom Hall</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--clr-text, #111827)' }}>Room 201</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '14px 18px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FaCheckCircle />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted, #6b7280)', fontWeight: 600, textTransform: 'uppercase' }}>Schedule Status</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#10b981' }}>Active Term</div>
          </div>
        </div>
      </div>

      {/* ── Day Filter Navigation Tabs ─────────────────────────── */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          overflowX: 'auto', 
          paddingBottom: '8px', 
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
                padding: '9px 18px',
                borderRadius: '24px',
                border: isSelected ? '1px solid var(--clr-primary, #005A9E)' : '1px solid var(--clr-border, #e5e7eb)',
                background: isSelected ? 'var(--clr-primary, #005A9E)' : 'var(--clr-surface, #ffffff)',
                color: isSelected ? '#ffffff' : 'var(--clr-text, #374151)',
                fontWeight: isSelected ? 600 : 500,
                fontSize: '0.875rem',
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
            padding: '9px 18px',
            borderRadius: '24px',
            border: selectedDay === 'ALL' ? '1px solid var(--clr-primary, #005A9E)' : '1px solid var(--clr-border, #e5e7eb)',
            background: selectedDay === 'ALL' ? 'var(--clr-primary, #005A9E)' : 'var(--clr-surface, #ffffff)',
            color: selectedDay === 'ALL' ? '#ffffff' : 'var(--clr-text, #374151)',
            fontWeight: selectedDay === 'ALL' ? 600 : 500,
            fontSize: '0.875rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease'
          }}
        >
          Entire Week View
        </button>
      </div>

      {/* ── Daily Schedule Timeline / Grid ─────────────────────── */}
      {loading ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', borderRadius: '12px' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--clr-text-muted, #6b7280)' }}>Loading daily routine...</p>
        </div>
      ) : filteredRoutines.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', borderRadius: '12px' }}>
          <FaCalendarAlt style={{ fontSize: '2.5rem', color: 'var(--clr-text-muted, #9ca3af)', marginBottom: '12px' }} />
          <h4 style={{ margin: '0 0 6px 0', color: 'var(--clr-text, #111827)' }}>No Classes Scheduled</h4>
          <p style={{ margin: 0, color: 'var(--clr-text-muted, #6b7280)', fontSize: '0.875rem' }}>
            There are no routine entries for {selectedDay}. Enjoy your rest day or self-study!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredRoutines.map((item, idx) => {
            const isBreak = item.type === 'Break'
            return (
              <motion.div
                key={item.id || idx}
                whileHover={{ y: -2 }}
                className="glass-panel"
                style={{
                  padding: '18px 24px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px',
                  borderLeft: isBreak 
                    ? '4px solid #f59e0b' 
                    : item.type === 'Lab' 
                      ? '4px solid #10b981' 
                      : '4px solid var(--clr-primary, #005A9E)',
                  background: isBreak ? 'rgba(245, 158, 11, 0.03)' : undefined
                }}
              >
                {/* Left: Time and Period */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', minWidth: '220px' }}>
                  <div 
                    style={{ 
                      padding: '8px 14px', 
                      borderRadius: '8px', 
                      background: 'rgba(0, 90, 158, 0.08)', 
                      textAlign: 'center',
                      minWidth: '85px'
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--clr-primary, #005A9E)' }}>
                      {item.period}
                    </div>
                    {selectedDay === 'ALL' && (
                      <div style={{ fontSize: '0.68rem', color: 'var(--clr-text-muted, #6b7280)', fontWeight: 600 }}>
                        {item.day.substring(0, 3)}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--clr-text-muted, #6b7280)', fontWeight: 500 }}>
                      <FaClock style={{ fontSize: '0.75rem' }} /> {item.time}
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--clr-text, #111827)', marginTop: '2px' }}>
                      {item.subject}
                    </div>
                  </div>
                </div>

                {/* Middle: Teacher & Room Details */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '28px', flexWrap: 'wrap' }}>
                  {!isBreak && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '160px' }}>
                      <span style={{ color: 'var(--clr-primary, #005A9E)', fontSize: '0.9rem' }}>
                        <FaChalkboardTeacher />
                      </span>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--clr-text-muted, #6b7280)' }}>Faculty</div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--clr-text, #111827)' }}>{item.teacher}</div>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '130px' }}>
                    <span style={{ color: '#10b981', fontSize: '0.9rem' }}>
                      <FaDoorOpen />
                    </span>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--clr-text-muted, #6b7280)' }}>Location</div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--clr-text, #111827)' }}>{item.room}</div>
                    </div>
                  </div>
                </div>

                {/* Right: Badge */}
                <div>
                  <span 
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '4px 12px',
                      borderRadius: '16px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: isBreak 
                        ? 'rgba(245, 158, 11, 0.15)' 
                        : item.type === 'Lab' 
                          ? 'rgba(16, 185, 129, 0.15)' 
                          : 'rgba(0, 90, 158, 0.12)',
                      color: isBreak ? '#d97706' : item.type === 'Lab' ? '#059669' : 'var(--clr-primary, #005A9E)'
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
    </motion.div>
  )
}
