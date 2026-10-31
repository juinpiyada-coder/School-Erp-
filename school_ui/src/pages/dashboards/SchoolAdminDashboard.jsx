import axios from '../../lib/axios'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWhitelabel } from '../../contexts/WhitelabelContext'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { motion } from 'framer-motion'
import {
  FaFileSignature,
  FaCheckCircle,
  FaExclamationTriangle,
  FaCalendarAlt,
  FaChalkboardTeacher,
  FaCommentDots,
  FaSun,
  FaGraduationCap,
  FaChartBar,
  FaTimesCircle,
  FaClock,
  FaBuilding,
  FaUsers,
  FaUniversity,
  FaLock,
  FaUserCircle,
  FaClipboardList,
  FaCoins,
  FaChartLine,
  FaBullhorn,
  FaUserPlus,
  FaPlusCircle,
  FaExchangeAlt,
  FaBookOpen,
  FaUserFriends,
  FaChalkboard,
  FaGraduationCap as FaStudentCap
} from 'react-icons/fa'
import { getGreeting } from '../../lib/timeGreeting'

// ─── Static Data ─────────────────────────────────────────────────────────────


const BAR_COLORS = {
  Mon: '#2B88D8',
  Tue: '#0078D4',
  Wed: '#005A9E',
  Thu: '#3a9fd6',
  Fri: '#A80000',
  Sat: '#6c9fc7',
  Sun: '#6c9fc7',
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-panel" style={{ padding: '10px 14px', minWidth: 120 }}>
      <p style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: 4, color: '#0f1923' }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ fontSize: '0.78rem', color: p.fill === '#A80000' ? '#A80000' : '#005A9E', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {p.name === 'present' ? <FaCheckCircle /> : <FaTimesCircle />} {p.name === 'present' ? 'Present' : 'Absent'}: <strong>{p.value}%</strong>
        </p>
      ))}
    </div>
  )
}

// ─── Dashboard Component ──────────────────────────────────────────────────────
export default function SchoolAdminDashboard() {
  const navigate = useNavigate();
  const { settings } = useWhitelabel();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [role, setRole] = useState('');

  // Fetch Branches & determine active role
  useEffect(() => {
    try {
      const user = JSON.parse(sessionStorage.getItem('e_school_user') || '{}');
      setRole((user?.user_role || user?.role || '').toLowerCase());
    } catch (e) {
      setRole('');
    }

    axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/branches`)
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setBranches(list);
      })
      .catch(err => console.error('Failed to load branches', err));
  }, []);

  const isExecutive = role.includes('exec');
  const isStaff = role.includes('staff');
  const isAdmin = !isExecutive && !isStaff;

  // Fetch Dashboard Data (runs when selectedBranch changes)
  useEffect(() => {
    setLoading(true);
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/dashboard/overview${selectedBranch ? `?branch_id=${selectedBranch}` : ''}`)
      .then(res => setDashboardData(res.data.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [selectedBranch]);

  const metrics = dashboardData?.metrics || { total_students: 0, active_faculty: 0, total_users: 0, total_schools: 0, total_branches: 0, daily_attendance_avg: 0, unread_messages: 0 };
  const chartData = dashboardData?.attendance_chart?.length ? dashboardData.attendance_chart : [
    { day: 'Mon', present: 0, absent: 0 },
    { day: 'Tue', present: 0, absent: 0 },
    { day: 'Wed', present: 0, absent: 0 },
    { day: 'Thu', present: 0, absent: 0 },
    { day: 'Fri', present: 0, absent: 0 },
    { day: 'Sat', present: 0, absent: 0 },
    { day: 'Sun', present: 0, absent: 0 }
  ];
  const activitiesData = dashboardData?.recent_activity || [];
  const eventsData = dashboardData?.upcoming_events || [];

  const now    = new Date()
  const dayNum = now.getDate()
  const month  = now.toLocaleString('en-US', { month: 'short', year: 'numeric' })

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
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

      {/* ── Filter Bar (Outside Banner) ─────────────────────────── */}
      {branches.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: 'var(--clr-surface)',
            borderRadius: 'var(--radius-md)',
            padding: '6px 14px',
            border: '1px solid var(--clr-glass-border)',
            boxShadow: 'var(--shadow-sm)',
            position: 'relative'
          }}>
            <FaBuilding style={{ color: 'var(--clr-primary)', marginRight: '8px' }} />
            <select 
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--clr-text-primary)',
                fontSize: '0.9rem',
                fontWeight: '500',
                padding: '4px 20px 4px 0',
                appearance: 'none',
                outline: 'none',
                cursor: 'pointer',
                minWidth: '220px'
              }}
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
            >
              <option value="">All Branches (Network Overview)</option>
              {branches.map(b => (
                <option key={b.SCHL_BR_ID} value={b.SCHL_BR_ID}>{b.SCHL_BR_NM}</option>
              ))}
            </select>
            <div style={{ position: 'absolute', right: '12px', pointerEvents: 'none', color: 'var(--clr-text-muted)', fontSize: '0.75rem' }}>
              ▼
            </div>
          </div>
        </div>
      )}

      {/* ── Rapid Data Entry Quick Access Bar ──────────────────── */}
      <div className="glass-panel" style={{ padding: '14px 20px', marginBottom: '24px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', background: 'linear-gradient(135deg, rgba(0, 120, 212, 0.06), rgba(0, 90, 158, 0.02))', border: '1px solid rgba(0, 120, 212, 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#0078D4', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
            <FaClipboardList />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--clr-text-primary)' }}>School Data Entry Operations</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--clr-text-muted)' }}>Central creation portal for campus branches, academic classes, faculty, parents, and students</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/school/branches')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <FaBuilding size={12} /> + Campus Branch
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/school/classes')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <FaChalkboard size={12} /> + Class Section
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/teacher/teachers')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <FaChalkboardTeacher size={12} /> + Faculty
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/parent/parents')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <FaUserFriends size={12} /> + Parent
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('/student/students')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <FaUserPlus size={12} /> + Student Admission
          </button>
        </div>
      </div>

      {/* ── Metrics Row ─────────────────────────────────────────── */}
      <div className="metrics-grid" >
        <motion.div whileHover={{ y: -4 }} className="glass-panel metric-card">
          <div className="metric-icon-wrap metric-icon-blue"><FaGraduationCap /></div>
          <div className="metric-label">Total Students</div>
          <div className="metric-value">{(metrics.total_students || 0).toLocaleString()}</div>
          <span className="metric-delta metric-delta-up">▲ Active enrolled</span>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="glass-panel metric-card">
          <div className="metric-icon-wrap metric-icon-green"><FaChalkboardTeacher /></div>
          <div className="metric-label">Active Faculty</div>
          <div className="metric-value">{(metrics.active_faculty || 0).toLocaleString()}</div>
          <span className="metric-delta metric-delta-neutral">Teaching staff</span>
        </motion.div>

        {/* Admin only metrics */}
        {isAdmin && (
          <>
            <motion.div whileHover={{ y: -4 }} className="glass-panel metric-card">
              <div className="metric-icon-wrap" style={{ background: 'rgba(155, 89, 182, 0.15)', color: '#9b59b6' }}><FaUsers /></div>
              <div className="metric-label">Total Users</div>
              <div className="metric-value">{(metrics.total_users || 0).toLocaleString()}</div>
              <span className="metric-delta" style={{ color: '#9b59b6', fontWeight: 600 }}>● System access users</span>
            </motion.div>

            <motion.div whileHover={{ y: -4 }} className="glass-panel metric-card">
              <div className="metric-icon-wrap" style={{ background: 'rgba(26, 188, 156, 0.15)', color: '#1abc9c' }}><FaUniversity /></div>
              <div className="metric-label">Total Schools</div>
              <div className="metric-value">{(metrics.total_schools !== undefined ? metrics.total_schools : 0).toLocaleString()}</div>
              <span className="metric-delta" style={{ color: '#1abc9c', fontWeight: 600 }}>▲ School institution centers</span>
            </motion.div>
          </>
        )}

        {/* Executive or Admin branches metric */}
        {(isAdmin || isExecutive) && (
          <motion.div whileHover={{ y: -4 }} className="glass-panel metric-card" onClick={() => navigate('/school/branches')} style={{ cursor: 'pointer' }}>
            <div className="metric-icon-wrap" style={{ background: 'rgba(230, 126, 34, 0.15)', color: '#e67e22' }}><FaBuilding /></div>
            <div className="metric-label">Total Branches</div>
            <div className="metric-value">{(metrics.total_branches !== undefined ? metrics.total_branches : 0).toLocaleString()}</div>
            <span className="metric-delta" style={{ color: '#e67e22', fontWeight: 600 }}>{selectedBranch ? '● Selected branch view' : '▲ Network branches'}</span>
          </motion.div>
        )}

        {/* Executive Financial metrics */}
        {isExecutive && (
          <motion.div whileHover={{ y: -4 }} className="glass-panel metric-card" onClick={() => navigate('/reports')} style={{ cursor: 'pointer' }}>
            <div className="metric-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}><FaCoins /></div>
            <div className="metric-label">Financial Position</div>
            <div className="metric-value">$482.5K</div>
            <span className="metric-delta" style={{ color: '#10b981', fontWeight: 600 }}>▲ Net branch revenue positive</span>
          </motion.div>
        )}

        <motion.div whileHover={{ y: -4 }} className="glass-panel metric-card">
          <div className="metric-icon-wrap metric-icon-orange"><FaChartBar /></div>
          <div className="metric-label">Daily Attendance</div>
          <div className="metric-value">{metrics.daily_attendance_avg || 0}%</div>
          <span className="metric-delta metric-delta-up">▲ Current attendance rate</span>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="glass-panel metric-card">
          <div className="metric-icon-wrap metric-icon-red"><FaCommentDots /></div>
          <div className="metric-label">Unread Messages</div>
          <div className="metric-value">{metrics.unread_messages || 0}</div>
          <span className="metric-delta metric-delta-down">▼ Active alerts & notices</span>
        </motion.div>
      </div>

      {/* ── Two-Column Split ─────────────────────────────────────── */}
      <div className="dashboard-split">
        {/* ── Attendance Bar Chart ── */}
        <div className="glass-panel chart-card">
          <div className="section-header">
            <h3 className="section-title">
              <span className="section-title-dot" />
              Daily Attendance Overview
            </h3>
            <span className="section-link">View Full Report →</span>
          </div>

          <div className="chart-wrapper" aria-label="Bar chart showing daily attendance for Mon through Sun">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                barGap={3}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(0,90,158,0.08)"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 12, fontFamily: 'Inter, sans-serif', fill: '#4a5568' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fontFamily: 'Inter, sans-serif', fill: '#8896a7' }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,90,158,0.04)' }} />
                <Bar dataKey="present" name="present" radius={[5, 5, 0, 0]} maxBarSize={34}>
                  {chartData.map((entry) => (
                    <Cell key={entry.day} fill={BAR_COLORS[entry.day] || '#0078D4'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-legend">
            <div className="chart-legend-item">
              <span className="chart-legend-dot" style={{ background: '#2B88D8' }} />
              Regular Days
            </div>
            <div className="chart-legend-item">
              <span className="chart-legend-dot" style={{ background: '#A80000' }} />
              Friday (Low Attendance Alert)
            </div>
            <div className="chart-legend-item">
              <span className="chart-legend-dot" style={{ background: '#6c9fc7' }} />
              Weekend
            </div>
          </div>
        </div>

        {/* ── Recent Activity Feed ── */}
        <div className="glass-panel activity-card">
          <div className="section-header">
            <h3 className="section-title">
              <span className="section-title-dot" />
              Recent Activity
            </h3>
            <span className="section-link">All →</span>
          </div>
          <ul className="activity-list" aria-label="Recent activity feed">
            {activitiesData.map((a, i) => (
              <li key={i} className="activity-item">
                <div className={`activity-icon ${a.cls || 'metric-icon-blue'}`} aria-hidden="true">
                  {typeof a.icon === 'object' && a.icon !== null ? a.icon : (
                    a.icon === 'FaTimesCircle' ? <FaTimesCircle /> :
                    a.icon === 'FaCheckCircle' ? <FaCheckCircle /> :
                    a.icon === 'FaBookOpen' ? <FaBookOpen /> :
                    a.icon === 'FaChalkboardTeacher' ? <FaChalkboardTeacher /> :
                    a.icon === 'FaClipboardList' ? <FaClipboardList /> :
                    <FaCalendarAlt />
                  )}
                </div>
                <div className="activity-content">
                  <p className="activity-text">{a.text}</p>
                  <p className="activity-time">{a.time}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Upcoming Academic Events ─────────────────────────────── */}
      <div>
        <div className="section-header mb-lg">
          <h3 className="section-title">
            <span className="section-title-dot" />
            Upcoming Academic Events
          </h3>
          <span className="section-link">View Calendar →</span>
        </div>
        <div className="events-grid">
          {eventsData.map((ev, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.02 }}
              className="glass-panel event-card"
              role="article"
              aria-label={`Event: ${ev.title}`}
            >
              <div className={`event-date-badge ${ev.cls}`}>
                <div className="event-date-day">{ev.day}</div>
                <div className="event-date-month">{ev.month}</div>
              </div>
              <div className="event-info">
                <div className="event-title">{ev.title}</div>
                <div className="event-meta" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FaClock /> {ev.meta}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
