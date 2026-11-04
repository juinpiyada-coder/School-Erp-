import axios from '../../lib/axios'
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
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
  FaDoorOpen,
  FaBook,
  FaArrowRight
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
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [teacherRoutines, setTeacherRoutines] = useState([]);
  const [routinesLoading, setRoutinesLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
    return today === 'Sunday' ? 'Monday' : today;
  });

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem('e_school_user') || '{}');
    } catch (e) {
      return {};
    }
  }, []);

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/dashboard/overview`)
      .then(res => setDashboardData(res.data.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchTeacherRoutine = async () => {
      setRoutinesLoading(true);
      try {
        const [schRes, clsRes, subRes, rmRes, tchrRes] = await Promise.allSettled([
          axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/timetable`),
          axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/classes`),
          axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/subjects`),
          axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/rooms`),
          axios.get(`${import.meta.env.VITE_API_BASE_URL}/staff/teachers`)
        ]);

        const rawSchedule = schRes.status === 'fulfilled' ? (Array.isArray(schRes.value.data) ? schRes.value.data : schRes.value.data?.data || []) : [];
        const classes = clsRes.status === 'fulfilled' ? (Array.isArray(clsRes.value.data) ? clsRes.value.data : clsRes.value.data?.data || []) : [];
        const subjects = subRes.status === 'fulfilled' ? (Array.isArray(subRes.value.data) ? subRes.value.data : subRes.value.data?.data || []) : [];
        const rooms = rmRes.status === 'fulfilled' ? (Array.isArray(rmRes.value.data) ? rmRes.value.data : rmRes.value.data?.data || []) : [];
        const teachers = tchrRes.status === 'fulfilled' ? (Array.isArray(tchrRes.value.data) ? tchrRes.value.data : tchrRes.value.data?.data || []) : [];

        // Match current teacher
        const uid = String(currentUser.id || currentUser.user_id || '').toLowerCase();
        const uemail = String(currentUser.email || currentUser.user_email_id || '').toLowerCase();
        const uname = String(currentUser.name || currentUser.first_name || '').toLowerCase();

        const matchedTeacher = teachers.find(t => {
          const tId = String(t.BR_TCHR_ID || t.br_tchr_id || t.TCHR_ID || t.tchr_id || t.id || '').toLowerCase();
          const tEmail = String(t.BR_TCHR_EMAI_ID || t.TCHR_EMAIL || t.email || '').toLowerCase();
          const tName = String(t.BR_TCHR_NM || t.br_tchr_nm || t.TCHR_NM || t.tchr_nm || t.name || '').toLowerCase();
          return (tId && tId === uid) || (tEmail && tEmail === uemail) || (uname && tName === uname);
        });

        const targetTeacherId = matchedTeacher ? String(matchedTeacher.BR_TCHR_ID || matchedTeacher.br_tchr_id || matchedTeacher.TCHR_ID || matchedTeacher.tchr_id || matchedTeacher.id) : null;
        const targetTeacherName = (matchedTeacher ? (matchedTeacher.BR_TCHR_NM || matchedTeacher.name) : currentUser?.name || '').toLowerCase().trim();

        const mySlots = rawSchedule.filter(slot => {
          const slotTchrId = String(slot.SCHL_BR_TCHR_ID || slot.schl_br_tchr_id || '');
          if (targetTeacherId && slotTchrId === targetTeacherId) return true;
          const slotTchrName = String(slot.teacher_name || '').toLowerCase().trim();
          if (targetTeacherName && slotTchrName && (slotTchrName === targetTeacherName || targetTeacherName.includes(slotTchrName))) {
            return true;
          }
          return false;
        }).map((slot, idx) => {
          const sub = subjects.find(s => String(s.BR_CLS_SUB_ID || s.id) === String(slot.SCHL_CLS_SCHLDL_SUB_ID || slot.schl_cls_schldl_sub_id));
          const cls = classes.find(c => String(c.SCHL_BR_CLS_ID || c.id) === String(slot.SCHL_CLS_SCHLDL_SEC_SESS_ID || slot.schl_cls_schldl_sec_sess_id));
          const rm = rooms.find(r => String(r.SCHL_BR_RM_ID || r.id) === String(slot.SCHL_BR_RM_ID || slot.schl_br_rm_id));
          return {
            id: slot.SCHL_CLS_SCHLDL_ID || slot.id || idx,
            day: slot.SCHL_DAY_OF_WK || slot.day || 'Monday',
            fromTime: (slot.SCHL_CLS_SCHDL_FRM_DT || '08:00').substring(0, 5),
            toTime: (slot.SCHL_CLS_SCHDL_TO_DT || '08:45').substring(0, 5),
            time: `${(slot.SCHL_CLS_SCHDL_FRM_DT || '08:00').substring(0, 5)} - ${(slot.SCHL_CLS_SCHDL_TO_DT || '08:45').substring(0, 5)}`,
            subject: sub?.BR_CLS_SUB_NAME || slot.subject_name || 'Subject',
            class_name: cls?.SCHL_BR_CLASS_NM || slot.class_name || 'Assigned Class',
            room: rm?.SCHL_BR_ROOM_DESC || slot.SCHL_BR_RM_ID || 'Classroom',
          };
        });

        // Sort ascending by time
        mySlots.sort((a, b) => a.fromTime.localeCompare(b.fromTime));

        if (!cancelled) {
          setTeacherRoutines(mySlots);
          setRoutinesLoading(false);
        }
      } catch (e) {
        if (!cancelled) setRoutinesLoading(false);
      }
    };

    fetchTeacherRoutine();
    return () => { cancelled = true; };
  }, [currentUser]);

  const filteredTeacherRoutines = useMemo(() => {
    if (selectedDay === 'ALL') return teacherRoutines;
    return teacherRoutines.filter(r => String(r.day || '').toLowerCase() === selectedDay.toLowerCase());
  }, [teacherRoutines, selectedDay]);

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
          <div className="metric-value">{(metrics.total_students || 0).toLocaleString()}</div>
          <span className="metric-delta metric-delta-neutral">In your classes</span>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="glass-panel metric-card">
          <div className="metric-icon-wrap metric-icon-green"><FaChalkboardTeacher /></div>
          <div className="metric-label">{metrics.my_classes !== undefined ? 'My Classes' : 'Active Classes'}</div>
          <div className="metric-value">{(metrics.my_classes ?? metrics.active_faculty ?? 0).toLocaleString()}</div>
          <span className="metric-delta metric-delta-neutral">Assigned to you</span>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="glass-panel metric-card">
          <div className="metric-icon-wrap metric-icon-orange"><FaChartBar /></div>
          <div className="metric-label">Daily Attendance</div>
          <div className="metric-value">{metrics.daily_attendance_avg || 0}%</div>
          <span className="metric-delta metric-delta-neutral">Last 7 days avg</span>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="glass-panel metric-card">
          <div className="metric-icon-wrap metric-icon-red"><FaCommentDots /></div>
          <div className="metric-label">Unread Messages</div>
          <div className="metric-value">{metrics.unread_messages || 0}</div>
          <span className="metric-delta metric-delta-neutral">{metrics.unread_messages > 0 ? 'Needs attention' : 'All caught up'}</span>
        </motion.div>
      </div>

      {/* ── Two-Column Split ─────────────────────────────────────── */}
      <div className="dashboard-split">
        {/* ── My Daily Teaching Routine Module ── */}
        <div className="glass-panel chart-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="section-header" style={{ marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 className="section-title">
              <span className="section-title-dot" style={{ background: '#005A9E' }} />
              My Daily Teaching Routine
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select
                className="form-control"
                style={{ fontSize: '0.82rem', padding: '4px 10px', height: 'auto', minWidth: '120px' }}
                value={selectedDay}
                onChange={e => setSelectedDay(e.target.value)}
              >
                <option value="ALL">All Days</option>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
              <button
                type="button"
                className="section-link"
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                onClick={() => navigate('/academic/schedule')}
              >
                Full Timetable <FaArrowRight style={{ fontSize: '0.75rem' }} />
              </button>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: '260px' }}>
            {routinesLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--clr-text-muted, #6b7280)' }}>
                Loading your assigned daily routine...
              </div>
            ) : filteredTeacherRoutines.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--clr-text-muted, #6b7280)' }}>
                <FaCalendarAlt style={{ fontSize: '2.4rem', opacity: 0.3, marginBottom: '10px' }} />
                <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px' }}>No Assigned Classes for {selectedDay === 'ALL' ? 'the week' : selectedDay}</p>
                <p style={{ fontSize: '0.78rem' }}>You have no scheduled class periods assigned for this day.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '320px', overflowY: 'auto', paddingRight: '4px' }}>
                {filteredTeacherRoutines.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      background: 'rgba(0, 90, 158, 0.04)',
                      border: '1px solid rgba(0, 90, 158, 0.12)',
                      transition: 'all 0.2s ease',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '8px',
                          background: 'rgba(0, 90, 158, 0.15)',
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
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--clr-text, #111827)' }}>
                          {item.subject}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--clr-text-muted, #6b7280)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <span>🎓 {item.class_name}</span>
                          <span>•</span>
                          <span>🚪 {item.room}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '4px 10px',
                          borderRadius: '16px',
                          background: 'rgba(59, 130, 246, 0.12)',
                          color: '#2563eb'
                        }}
                      >
                        {item.day}
                      </span>
                      <span
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: '#005A9E',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <FaClock style={{ fontSize: '0.75rem' }} /> {item.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

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