import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  FaBookOpen,
  FaCheckCircle,
  FaClock,
  FaHourglassHalf,
  FaChalkboardTeacher,
  FaUserGraduate,
  FaChartPie,
  FaSearch,
  FaChevronDown,
  FaChevronUp,
  FaCalendarCheck
} from 'react-icons/fa'
import axios from '../../lib/axios'


export default function SubjectClassCompletion({ forcedRole = null }) {
  const [userRole, setUserRole] = useState('')
  const [wards, setWards] = useState([])
  const [selectedWard, setSelectedWard] = useState('')
  const [subjectsData, setSubjectsData] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [expandedSubject, setExpandedSubject] = useState(null)
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

  // Fetch completion data
  useEffect(() => {
    setLoading(true)
    const endpoint = isParent && selectedWard
      ? `${import.meta.env.VITE_API_BASE_URL}/student/class-completion?student_id=${selectedWard}`
      : `${import.meta.env.VITE_API_BASE_URL}/student/class-completion`

    axios.get(endpoint)
      .then(res => {
        const items = Array.isArray(res.data) ? res.data : res.data?.data || []
        if (items.length > 0) {
          setSubjectsData(items)
        } else {
          setSubjectsData([])
        }
      })
      .catch(() => {
        setSubjectsData([])
      })
      .finally(() => setLoading(false))
  }, [isParent, selectedWard])

  // Overall Statistics
  const stats = useMemo(() => {
    const totalPlanned = subjectsData.reduce((acc, s) => acc + (s.totalClasses || 0), 0)
    const totalConducted = subjectsData.reduce((acc, s) => acc + (s.completedClasses || 0), 0)
    const avgPct = totalPlanned > 0 ? Math.round((totalConducted * 100) / totalPlanned) : 0
    return {
      totalSubjects: subjectsData.length,
      totalPlanned,
      totalConducted,
      avgPct
    }
  }, [subjectsData])

  // Filtered List
  const filteredSubjects = useMemo(() => {
    return subjectsData.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            s.teacher.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (s.code && s.code.toLowerCase().includes(searchQuery.toLowerCase()))
      if (!matchesSearch) return false
      if (statusFilter === 'COMPLETED') return s.completionPct >= 85
      if (statusFilter === 'IN_PROGRESS') return s.completionPct < 85
      return true
    })
  }, [subjectsData, searchQuery, statusFilter])

  const toggleExpand = (id) => {
    setExpandedSubject(prev => prev === id ? null : id)
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
              <FaBookOpen />
            </span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--clr-text, #111827)' }}>
                {isParent ? 'Children Subject Wise Class Completion' : 'Subject Wise Class Completion'}
              </h2>
              <p style={{ margin: '4px 0 0 0', color: 'var(--clr-text-muted, #6b7280)', fontSize: '0.875rem' }}>
                Track class syllabus progress, lecture sessions held, topics completed, and learning milestones.
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
            <label htmlFor="wardSelectCompletion" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--clr-text, #111827)' }}>
              Switch Ward:
            </label>
            <select
              id="wardSelectCompletion"
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

      {/* ── High-Level Completion Progress Summary ──────────────── */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '24px', 
          borderRadius: '14px', 
          marginBottom: '24px',
          background: 'linear-gradient(135deg, rgba(0, 90, 158, 0.04) 0%, rgba(16, 185, 129, 0.05) 100%)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--clr-text-muted, #6b7280)', fontWeight: 600, textTransform: 'uppercase' }}>
              Academic Term Completion Pace
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--clr-text, #111827)', display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
              {stats.avgPct}%
              <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#10b981' }}>
                ✓ On Track for Final Exams
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--clr-text-muted, #6b7280)', fontWeight: 600 }}>Total Subjects</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--clr-text, #111827)' }}>{stats.totalSubjects}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--clr-text-muted, #6b7280)', fontWeight: 600 }}>Classes Conducted</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>{stats.totalConducted}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--clr-text-muted, #6b7280)', fontWeight: 600 }}>Planned Curriculum</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--clr-text, #111827)' }}>{stats.totalPlanned} Classes</div>
            </div>
          </div>
        </div>

        {/* Big Progress Bar */}
        <div style={{ width: '100%', height: '12px', background: 'rgba(0, 90, 158, 0.1)', borderRadius: '6px', overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${stats.avgPct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{
              height: '100%',
              borderRadius: '6px',
              background: 'linear-gradient(90deg, #005A9E 0%, #10b981 100%)'
            }}
          />
        </div>
      </div>

      {/* ── Search & Filter Controls ───────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--clr-surface, #ffffff)', border: '1px solid var(--clr-border, #e5e7eb)', borderRadius: '8px', padding: '6px 12px', minWidth: '260px' }}>
          <FaSearch style={{ color: 'var(--clr-text-muted, #9ca3af)', marginRight: '8px' }} />
          <input
            type="text"
            placeholder="Search subject or faculty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '0.875rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: '1px solid var(--clr-border, #e5e7eb)',
              background: statusFilter === 'ALL' ? 'var(--clr-primary, #005A9E)' : 'var(--clr-surface, #ffffff)',
              color: statusFilter === 'ALL' ? '#ffffff' : 'var(--clr-text, #374151)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            All Subjects ({subjectsData.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('COMPLETED')}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: '1px solid var(--clr-border, #e5e7eb)',
              background: statusFilter === 'COMPLETED' ? '#10b981' : 'var(--clr-surface, #ffffff)',
              color: statusFilter === 'COMPLETED' ? '#ffffff' : 'var(--clr-text, #374151)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            High Progress (80%+)
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('IN_PROGRESS')}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: '1px solid var(--clr-border, #e5e7eb)',
              background: statusFilter === 'IN_PROGRESS' ? '#f59e0b' : 'var(--clr-surface, #ffffff)',
              color: statusFilter === 'IN_PROGRESS' ? '#ffffff' : 'var(--clr-text, #374151)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            In Progress
          </button>
        </div>
      </div>

      {/* ── Subject Cards Grid ─────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredSubjects.length === 0 ? (
          <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center', borderRadius: '12px' }}>
            <FaBookOpen style={{ fontSize: '2.5rem', color: 'var(--clr-text-muted, #9ca3af)', marginBottom: '14px' }} />
            <h4 style={{ margin: '0 0 8px 0', color: 'var(--clr-text, #111827)', fontSize: '1.1rem' }}>No Subjects or Classes Scheduled</h4>
            <p style={{ margin: 0, color: 'var(--clr-text-muted, #6b7280)', fontSize: '0.875rem' }}>
              There are currently 0 class sessions scheduled for this student's section by the branch administration.
            </p>
          </div>
        ) : filteredSubjects.map(sub => {
          const isExpanded = expandedSubject === sub.id
          return (
            <motion.div
              key={sub.id}
              className="glass-panel"
              style={{
                borderRadius: '12px',
                overflow: 'hidden',
                borderLeft: `5px solid ${sub.color || '#005A9E'}`
              }}
            >
              {/* Card Header Row */}
              <div 
                style={{ 
                  padding: '20px 24px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
                onClick={() => toggleExpand(sub.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '240px' }}>
                  <div 
                    style={{ 
                      width: '46px', 
                      height: '46px', 
                      borderRadius: '10px', 
                      background: `rgba(0, 90, 158, 0.1)`, 
                      color: sub.color || '#005A9E',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem'
                    }}
                  >
                    <FaBookOpen />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--clr-text-muted, #6b7280)', textTransform: 'uppercase' }}>
                      {sub.code || 'COURSE'}
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--clr-text, #111827)' }}>
                      {sub.name}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--clr-text-muted, #6b7280)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <FaChalkboardTeacher /> {sub.teacher}
                    </div>
                  </div>
                </div>

                {/* Progress Indicators */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: '180px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px', fontWeight: 600 }}>
                      <span style={{ color: 'var(--clr-text-muted, #6b7280)' }}>Class Progress:</span>
                      <span style={{ color: 'var(--clr-text, #111827)' }}>{sub.completedClasses} / {sub.totalClasses} Classes</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          width: `${sub.completionPct}%`, 
                          height: '100%', 
                          background: sub.color || '#005A9E', 
                          borderRadius: '4px' 
                        }} 
                      />
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', minWidth: '70px' }}>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: sub.color || '#005A9E' }}>
                      {sub.completionPct}%
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--clr-text-muted, #6b7280)', fontWeight: 600 }}>
                      Completed
                    </div>
                  </div>

                  <div style={{ color: 'var(--clr-text-muted, #9ca3af)', fontSize: '1.1rem' }}>
                    {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                  </div>
                </div>
              </div>

              {/* Collapsible Syllabus Chapters Details */}
              {isExpanded && (
                <div 
                  style={{ 
                    padding: '16px 24px 20px', 
                    borderTop: '1px solid var(--clr-border, #f3f4f6)',
                    background: 'rgba(0, 0, 0, 0.015)'
                  }}
                >
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--clr-text, #111827)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FaCalendarCheck style={{ color: 'var(--clr-primary, #005A9E)' }} /> Curriculum Units & Syllabus Chapters
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {sub.chapters.map((ch, cIdx) => (
                      <div 
                        key={ch.id || cIdx}
                        style={{
                          padding: '10px 16px',
                          borderRadius: '8px',
                          background: 'var(--clr-surface, #ffffff)',
                          border: '1px solid var(--clr-border, #e5e7eb)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {ch.status === 'Completed' ? (
                            <FaCheckCircle style={{ color: '#10b981', fontSize: '1rem' }} />
                          ) : ch.status === 'In Progress' ? (
                            <FaHourglassHalf style={{ color: '#f59e0b', fontSize: '1rem' }} />
                          ) : (
                            <FaClock style={{ color: '#9ca3af', fontSize: '1rem' }} />
                          )}
                          <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--clr-text, #111827)' }}>
                              {ch.title}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted, #6b7280)' }}>
                              Sessions: {ch.classesTaken} / {ch.totalClasses} conducted
                            </div>
                          </div>
                        </div>

                        <div>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '3px 10px',
                              borderRadius: '12px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              background: ch.status === 'Completed' 
                                ? 'rgba(16, 185, 129, 0.12)' 
                                : ch.status === 'In Progress' 
                                  ? 'rgba(245, 158, 11, 0.12)' 
                                  : 'rgba(156, 163, 175, 0.12)',
                              color: ch.status === 'Completed' 
                                ? '#059669' 
                                : ch.status === 'In Progress' 
                                  ? '#d97706' 
                                  : '#4b5563'
                            }}
                          >
                            {ch.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
