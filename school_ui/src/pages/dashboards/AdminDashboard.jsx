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
  FaUserLock,
  FaDoorOpen,
  FaBook,
  FaLayerGroup,
  FaUserFriends,
  FaCogs,
  FaChartLine,
  FaClipboardList,
  FaExchangeAlt,
  FaUserPlus,
  FaTable
} from 'react-icons/fa'
import { ATTENDANCE_COLORS } from '../../lib/chartColors'
import { getGreeting } from '../../lib/timeGreeting'

// ─── Static Data ─────────────────────────────────────────────────────────────


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
export default function AdminDashboard() {
  const navigate = useNavigate()
  const { settings } = useWhitelabel()
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [matrices, setMatrices] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');

  // Fetch Branches & Matrices
  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/branches`)
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setBranches(list);
      })
      .catch(err => console.error('Failed to load branches', err));

    axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/matrices`)
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setMatrices(list);
      })
      .catch(err => console.error('Failed to load matrices', err));
  }, []);

  // Fetch Dashboard Data (runs when selectedBranch changes)
  useEffect(() => {
    setLoading(true);
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/dashboard/overview${selectedBranch ? `?branch_id=${selectedBranch}` : ''}`)
      .then(res => setDashboardData(res.data.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [selectedBranch]);

  const metrics = dashboardData?.metrics || { total_students: 0, active_faculty: 0, total_users: 0, total_schools: 0, total_branches: 0, daily_attendance_avg: 0, unread_messages: 0 };
  const chartData = dashboardData?.attendance_chart || [];
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
            maxWidth: '100%',
            background: 'var(--clr-surface)',
            borderRadius: 'var(--radius-md)',
            padding: '6px 14px',
            border: '1px solid var(--clr-glass-border)',
            boxShadow: 'var(--shadow-sm)',
            position: 'relative'
          }}>
            <FaBuilding style={{ color: 'var(--clr-primary)', marginRight: '8px', flexShrink: 0 }} />
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
                flex: 1,
                minWidth: 0,
                maxWidth: '100%'
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 260px', minWidth: 0 }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#0078D4', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
            <FaClipboardList />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--clr-text-primary)' }}>Institution Data Entry Hub</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--clr-text-muted)' }}>Quick access to register schools, branches, staff, parents, and student cohorts</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/school/details')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <FaUniversity size={12} /> + School Center
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/school/branches')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <FaBuilding size={12} /> + Campus Branch
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/teacher/teachers')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <FaChalkboardTeacher size={12} /> + Faculty
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/parent/parents')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <FaUserFriends size={12} /> + Guardian
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('/student/students')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <FaUserPlus size={12} /> + Student Admission
          </button>
        </div>
      </div>

      {/* ── Metrics Row ─────────────────────────────────────────── */}
      <div className="metrics-grid" >
        <motion.div whileHover={{ y: -4 }} className="glass-panel metric-card" onClick={() => navigate('/student/students')} style={{ cursor: 'pointer' }}>
          <div className="metric-icon-wrap metric-icon-blue"><FaGraduationCap /></div>
          <div className="metric-label">Total Students</div>
          <div className="metric-value">{(metrics.total_students || 0).toLocaleString()}</div>
          <span className="metric-delta metric-delta-up">▲ Active enrolled</span>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="glass-panel metric-card" onClick={() => navigate('/teacher/teachers')} style={{ cursor: 'pointer' }}>
          <div className="metric-icon-wrap metric-icon-green"><FaChalkboardTeacher /></div>
          <div className="metric-label">Active Faculty</div>
          <div className="metric-value">{(metrics.active_faculty || 0).toLocaleString()}</div>
          <span className="metric-delta metric-delta-neutral">Teaching staff</span>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="glass-panel metric-card" onClick={() => navigate('/user/logins')} style={{ cursor: 'pointer' }}>
          <div className="metric-icon-wrap" style={{ background: 'rgba(155, 89, 182, 0.15)', color: '#9b59b6' }}><FaUsers /></div>
          <div className="metric-label">Total Users</div>
          <div className="metric-value">{(metrics.total_users || 0).toLocaleString()}</div>
          <span className="metric-delta" style={{ color: '#9b59b6', fontWeight: 600 }}>● System access users</span>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="glass-panel metric-card" onClick={() => navigate('/school/details')} style={{ cursor: 'pointer' }}>
          <div className="metric-icon-wrap" style={{ background: 'rgba(26, 188, 156, 0.15)', color: '#1abc9c' }}><FaUniversity /></div>
          <div className="metric-label">Total Schools</div>
          <div className="metric-value">{(metrics.total_schools !== undefined ? metrics.total_schools : 0).toLocaleString()}</div>
          <span className="metric-delta" style={{ color: '#1abc9c', fontWeight: 600 }}>▲ School institution centers</span>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="glass-panel metric-card" onClick={() => navigate('/school/branches')} style={{ cursor: 'pointer' }}>
          <div className="metric-icon-wrap" style={{ background: 'rgba(230, 126, 34, 0.15)', color: '#e67e22' }}><FaBuilding /></div>
          <div className="metric-label">Total Branches</div>
          <div className="metric-value">{(metrics.total_branches !== undefined ? metrics.total_branches : 0).toLocaleString()}</div>
          <span className="metric-delta" style={{ color: '#e67e22', fontWeight: 600 }}>{selectedBranch ? '● Selected branch view' : '▲ Across school network'}</span>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="glass-panel metric-card" onClick={() => navigate('/school/matrix')} style={{ cursor: 'pointer' }}>
          <div className="metric-icon-wrap" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}><FaTable /></div>
          <div className="metric-label">Schedule Matrices</div>
          <div className="metric-value">{matrices.length}</div>
          <span className="metric-delta" style={{ color: '#8b5cf6', fontWeight: 600 }}>▲ Active timetable templates</span>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="glass-panel metric-card" onClick={() => navigate('/academic/student-attendance')} style={{ cursor: 'pointer' }}>
          <div className="metric-icon-wrap metric-icon-orange"><FaChartBar /></div>
          <div className="metric-label">Daily Attendance</div>
          <div className="metric-value">{metrics.daily_attendance_avg || 0}%</div>
          <span className="metric-delta metric-delta-up">▲ Current attendance rate</span>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="glass-panel metric-card" onClick={() => navigate('/notifications')} style={{ cursor: 'pointer' }}>
          <div className="metric-icon-wrap metric-icon-red"><FaCommentDots /></div>
          <div className="metric-label">Unread Messages</div>
          <div className="metric-value">{metrics.unread_messages || 0}</div>
          <span className="metric-delta metric-delta-down">▼ Active alerts & notices</span>
        </motion.div>
      </div>

      {/* ── Master Schedule Matrix Roster Overview (Super Admin) ── */}
      <div className="glass-panel page-card mb-xl" style={{ padding: '20px', marginBottom: '24px' }}>
        <div className="section-header" style={{ marginBottom: '16px' }}>
          <h3 className="section-title">
            <span className="section-title-dot" style={{ background: '#8b5cf6' }} />
            Master Schedule Matrix Roster
          </h3>
          <span className="section-link" onClick={() => navigate('/school/matrix')} style={{ cursor: 'pointer', color: '#8b5cf6' }}>
            Manage Roster Templates →
          </span>
        </div>

        {matrices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--clr-text-muted)' }}>
            No schedule matrix templates configured yet. <span style={{ color: 'var(--clr-primary)', cursor: 'pointer', fontWeight: 600 }} onClick={() => navigate('/school/matrix')}>Create one here</span>
          </div>
        ) : (
          <div className="grid-auto-md" style={{ gap: '14px' }}>
            {matrices.slice(0, 4).map(mat => {
              const name = mat.SCHL_UNIQ_MATRIX_NM || mat.schl_uniq_matrix_nm || mat.uniqueName || 'Matrix';
              const type = mat.SCHL_MAT_NM || mat.schl_mat_nm || mat.type || 'Regular Class';
              const periods = mat.SCHL_NO_OF_CLASS || mat.schl_no_of_class || mat.noOfClass || 6;
              const duration = mat.SCHL_CLASS_DURATION || mat.schl_class_duration || mat.duration || 45;
              const startTime = (mat.SCHL_CLASS_FRM || mat.fromTime || '08:00').substring(0, 5);
              const endTime = (mat.SCHL_CLASS_TO || mat.toTime || '14:30').substring(0, 5);

              return (
                <motion.div
                  key={mat.SCHL_MAT_ID || mat.id}
                  whileHover={{ y: -3 }}
                  onClick={() => navigate('/school/matrix')}
                  style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--clr-glass-border)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="font-bold" style={{ fontSize: '0.9rem' }}>{name}</span>
                    <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>{type}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--clr-text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FaClock style={{ color: '#8b5cf6' }} />
                      <span>{startTime} - {endTime} ({periods} periods @ {duration}m)</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  )
}
