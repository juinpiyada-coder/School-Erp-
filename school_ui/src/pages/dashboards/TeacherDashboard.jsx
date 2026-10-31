import axios from '../../lib/axios'
import { useState, useEffect } from 'react'
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
  FaClock
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
export default function TeacherDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/dashboard/overview`)
      .then(res => setDashboardData(res.data.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const metrics = dashboardData?.metrics || { total_students: 0, active_faculty: 0, daily_attendance_avg: 0, unread_messages: 0 };
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
      <div className="dashboard-welcome-banner" />

      {/* ── Metrics Row ─────────────────────────────────────────── */}
      <div className="metrics-grid">
        <motion.div whileHover={{ y: -4 }} className="glass-panel metric-card">
          <div className="metric-icon-wrap metric-icon-blue"><FaGraduationCap /></div>
          <div className="metric-label">Total Students</div>
          <div className="metric-value">{metrics.total_students.toLocaleString()}</div>
          <span className="metric-delta metric-delta-neutral">In your branch</span>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="glass-panel metric-card">
          <div className="metric-icon-wrap metric-icon-green"><FaChalkboardTeacher /></div>
          <div className="metric-label">Active Faculty</div>
          <div className="metric-value">{metrics.active_faculty.toLocaleString()}</div>
          <span className="metric-delta metric-delta-neutral">Stable headcount</span>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="glass-panel metric-card">
          <div className="metric-icon-wrap metric-icon-orange"><FaChartBar /></div>
          <div className="metric-label">Daily Attendance</div>
          <div className="metric-value">{metrics.daily_attendance_avg}%</div>
          <span className="metric-delta metric-delta-neutral">Last 7 days avg</span>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="glass-panel metric-card">
          <div className="metric-icon-wrap metric-icon-red"><FaCommentDots /></div>
          <div className="metric-label">Unread Messages</div>
          <div className="metric-value">{metrics.unread_messages}</div>
          <span className="metric-delta metric-delta-neutral">{metrics.unread_messages > 0 ? 'Needs attention' : 'All caught up'}</span>
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
                    <Cell key={entry.day} fill={BAR_COLORS[entry.day]} />
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
                <div className={`activity-icon ${a.cls}`} aria-hidden="true">
                  {a.icon}
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