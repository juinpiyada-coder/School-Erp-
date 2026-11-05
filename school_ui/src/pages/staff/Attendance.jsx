import axios from '../../lib/axios'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify'

import { motion } from 'framer-motion'
import { FaSearch, FaDownload, FaEdit, FaSchool, FaCheckCircle, FaClipboardList, FaTimesCircle, FaClock, FaUmbrellaBeach, FaTimes, FaSave, FaChartBar, FaSync, FaCalendarAlt, FaCircle, FaUserCheck, FaCheckDouble, FaLock, FaInfoCircle, FaHistory } from 'react-icons/fa'


// ─── Constants ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  Present:      { badge: 'badge-success', icon: <FaCheckCircle />, label: 'Present' },
  Absent:       { badge: 'badge-danger',  icon: <FaTimesCircle />, label: 'Absent'  },
  Late:         { badge: 'badge-warning', icon: <FaClock />, label: 'Late'    },
  Leave:        { badge: 'badge-info',    icon: <FaUmbrellaBeach />, label: 'Leave'   },
  'Not Marked': { badge: 'badge-secondary', icon: <FaClock />, label: 'Not Marked' },
}

const AVATAR_CLRS = ['avatar-blue', 'avatar-green', 'avatar-orange', 'avatar-purple', 'avatar-teal']

function initials(name) {
  if (!name) return 'UN'
  const parts = name.split(' ')
  return parts.slice(-2).map((w) => (w[0] || '')).join('').toUpperCase() || 'UN'
}

function toDateInputValue(date) {
  return date.toISOString().split('T')[0]
}

// ─── Give / Edit Attendance Modal ─────────────────────────────────────────────
function EditAttendanceModal({ record, records = [], isBranchAdmin = true, onClose, onSaved }) {
  const [selectedId, setSelectedId] = useState(record?.id)
  const activeRecord = (records.length ? records.find(r => String(r.id) === String(selectedId)) : null) || record

  const [form, setForm] = useState({
    checkIn: (!activeRecord?.checkIn || activeRecord?.checkIn === '—') ? '08:00 AM' : activeRecord.checkIn,
    checkOut: (!activeRecord?.checkOut || activeRecord?.checkOut === '—') ? '04:00 PM' : activeRecord.checkOut,
    status: (activeRecord?.status === 'Not Marked' || !activeRecord?.status) ? 'Present' : activeRecord.status,
  })
  const [saving, setSaving] = useState(false)

  // Update form when activeRecord changes
  useEffect(() => {
    if (!activeRecord) return
    setForm({
      checkIn: (!activeRecord.checkIn || activeRecord.checkIn === '—') ? '08:00 AM' : activeRecord.checkIn,
      checkOut: (!activeRecord.checkOut || activeRecord.checkOut === '—') ? '04:00 PM' : activeRecord.checkOut,
      status: (activeRecord.status === 'Not Marked' || !activeRecord.status) ? 'Present' : activeRecord.status,
    })
  }, [activeRecord])

  if (!isBranchAdmin) return null

  const handleStatusClick = (status) => {
    setForm(prev => {
      let checkIn = prev.checkIn
      let checkOut = prev.checkOut
      if (status === 'Present') {
        if (!checkIn || checkIn === '—') checkIn = '08:00 AM'
        if (!checkOut || checkOut === '—') checkOut = '04:00 PM'
      } else if (status === 'Late') {
        checkIn = '09:30 AM'
        if (!checkOut || checkOut === '—') checkOut = '04:00 PM'
      } else if (status === 'Absent' || status === 'Leave') {
        checkIn = ''
        checkOut = ''
      }
      return { ...prev, status, checkIn, checkOut }
    })
  }

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!activeRecord?.id) {
      toast.error('Please select a valid staff member.')
      return
    }
    setSaving(true)
    try {
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/staff/attendance/${activeRecord.id}`, {
        ...form,
        date: activeRecord.date || new Date().toISOString().split('T')[0]
      })
      toast.success(`Attendance for ${activeRecord.name} updated successfully.`)
      onSaved({
        ...activeRecord,
        ...form,
        checkIn: form.checkIn || '—',
        checkOut: form.checkOut || '—'
      })
    } catch (err) {
      console.error(err)
      toast.error('Failed to update attendance record.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Give Attendance" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="glass-panel modal-panel animate-fade-in-up" style={{ maxWidth: '460px' }}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title flex items-center gap-sm">
              <FaUserCheck style={{ color: 'var(--clr-primary)' }} /> Give Staff Attendance
            </h2>
            <p className="modal-subtitle">{activeRecord.name} — {activeRecord.date ? new Date(activeRecord.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Today'}</p>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close"><FaTimes /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {records.length > 1 && (
              <div className="form-group">
                <label htmlFor="select-staff" className="form-label">Staff Member <span className="form-required">*</span></label>
                <select
                  id="select-staff"
                  className="form-input"
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                >
                  {records.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} (Current: {r.status})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Quick Status Selection Buttons */}
            <div className="form-group">
              <label className="form-label" style={{ marginBottom: '8px' }}>Attendance Status <span className="form-required">*</span></label>
              <div className="grid-4" style={{ gap: '8px' }}>
                {Object.keys(STATUS_CONFIG).filter(k => k !== 'Not Marked').map(s => {
                  const isSelected = form.status === s
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleStatusClick(s)}
                      style={{
                        padding: '10px 4px',
                        borderRadius: '8px',
                        border: isSelected ? '2px solid var(--clr-primary)' : '1px solid rgba(0, 90, 158, 0.15)',
                        background: isSelected ? 'rgba(0, 90, 158, 0.12)' : 'rgba(255, 255, 255, 0.6)',
                        color: isSelected ? 'var(--clr-primary)' : 'var(--clr-text-secondary)',
                        fontWeight: isSelected ? 700 : 500,
                        fontSize: '0.82rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span style={{ fontSize: '1.1rem' }}>{STATUS_CONFIG[s].icon}</span>
                      <span>{s}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="form-row-2col">
              <div className="form-group">
                <label htmlFor="edit-checkin" className="form-label">Clock-In Time</label>
                <input
                  id="edit-checkin"
                  name="checkIn"
                  type="text"
                  className="form-input"
                  placeholder="08:00 AM"
                  value={form.checkIn}
                  onChange={handleChange}
                  disabled={form.status === 'Absent' || form.status === 'Leave'}
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-checkout" className="form-label">Clock-Out Time</label>
                <input
                  id="edit-checkout"
                  name="checkOut"
                  type="text"
                  className="form-input"
                  placeholder="04:00 PM"
                  value={form.checkOut}
                  onChange={handleChange}
                  disabled={form.status === 'Absent' || form.status === 'Leave'}
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving} aria-busy={saving}>
              {saving ? (
                <>
                  <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} aria-hidden="true" />
                  Saving…
                </>
              ) : (
                <>
                  <FaSave /> Save Attendance
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Attendance Page ─────────────────────────────────────────────────────
export default function Attendance() {
  const [activeTab, setActiveTab]       = useState('daily') // 'daily' or 'history'
  const [logs, setLogs]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [statusFilter, setStatusFilter] = useState('All')
  const [dateFilter, setDateFilter]     = useState(toDateInputValue(new Date()))
  const [search, setSearch]             = useState('')
  const [editRecord, setEditRecord]     = useState(null)

  // Attendance History specific state
  const [historyTeacherId, setHistoryTeacherId] = useState('')
  const [historyStartDate, setHistoryStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [historyEndDate, setHistoryEndDate]     = useState(() => toDateInputValue(new Date()))
  const [historyLogs, setHistoryLogs]           = useState([])
  const [loadingHistory, setLoadingHistory]     = useState(false)

  const user = JSON.parse(sessionStorage.getItem('e_school_user') || '{}')
  const userRole = (user?.user_role || user?.role_id || user?.role || '').toUpperCase()
  const isBranchAdmin = userRole === 'R_BRANCHADMIN' || userRole.includes('BRANCH') || userRole === 'R_SUPERADMIN'
  const isTeacher = userRole === 'R_TEACHER' || userRole.includes('TEACHER')
  const currentTeacherId = user?.teacher_id || user?.teacherId || user?.id || user?.user_id

  const TODAY_LABEL = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const statuses = ['All', ...Object.keys(STATUS_CONFIG)]
  const staffOptions = Array.from(new Map(logs.concat(historyLogs).map(item => [item.id, item.name])).entries())

  // ── Fetch historical attendance logs across date ranges ──
  const loadHistoryLogs = useCallback(async () => {
    setLoadingHistory(true)
    try {
      const start = new Date(historyStartDate)
      const end = new Date(historyEndDate)
      const dateList = []
      let curr = new Date(start)
      while (curr <= end && dateList.length < 31) {
        dateList.push(curr.toISOString().split('T')[0])
        curr.setDate(curr.getDate() + 1)
      }

      const requests = dateList.map(dt => {
        const p = { date: dt }
        if (historyTeacherId) p.teacherId = historyTeacherId
        else if (isTeacher && currentTeacherId) p.teacherId = currentTeacherId
        return axios.get(`${import.meta.env.VITE_API_BASE_URL}/staff/attendance`, { params: p })
          .then(res => {
            const items = Array.isArray(res.data) ? res.data : res.data?.data ?? []
            return items.map(item => ({ ...item, date: dt }))
          })
          .catch(() => [])
      })

      const results = await Promise.all(requests)
      const flattened = results.flat().sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      setHistoryLogs(flattened)
    } catch (err) {
      console.error('Failed to load staff attendance history:', err)
      setHistoryLogs([])
    } finally {
      setLoadingHistory(false)
    }
  }, [historyStartDate, historyEndDate, historyTeacherId, isTeacher, currentTeacherId])

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistoryLogs()
    }
  }, [activeTab, loadHistoryLogs])

  // ── Fetch logs from API ──
  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = { date: dateFilter }
      if (statusFilter !== 'All')           params.status     = statusFilter
      if (isTeacher && currentTeacherId)    params.teacherId  = currentTeacherId

      const { data } = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/staff/attendance`, { params: params })
      setLogs(Array.isArray(data) ? data : data?.data ?? [])
    } catch (err) {
      console.error('Failed to load attendance logs:', err)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [dateFilter, statusFilter, isTeacher, currentTeacherId])

  useEffect(() => { loadLogs() }, [loadLogs])

  // ── Client-side search ──
  const filteredHistory = historyLogs.filter((r) => {
    const haystack = `${r.name}`.toLowerCase()
    const matchesSearch = !search || haystack.includes(search.toLowerCase())
    const matchesTeacher = !historyTeacherId || String(r.id) === String(historyTeacherId) || String(r.teacherId) === String(historyTeacherId)
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter
    return matchesSearch && matchesTeacher && matchesStatus
  })

  const filtered = logs.filter((r) => {
    const haystack = `${r.name}`.toLowerCase()
    return !search || haystack.includes(search.toLowerCase())
  })

  // ── Summary counts ──
  const counts = {
    Present: logs.filter((r) => r.status === 'Present').length,
    Absent:  logs.filter((r) => r.status === 'Absent').length,
    Late:    logs.filter((r) => r.status === 'Late').length,
    Leave:   logs.filter((r) => r.status === 'Leave').length,
  }

  const attendanceRate = logs.length
    ? Math.round(((counts.Present + counts.Late) / logs.length) * 100)
    : 0

  const [markingAll, setMarkingAll] = useState(false)

  const handleMarkAll = async (targetStatus = 'Present') => {
    if (!isBranchAdmin) {
      toast.error('Access denied: Only Branch Admin can mark or update teacher attendance.')
      return
    }
    if (!logs.length) {
      toast.info('No staff members found to mark.')
      return
    }
    if (!window.confirm(`Are you sure you want to mark all ${logs.length} staff members as "${targetStatus}" for ${dateFilter}?`)) return
    
    setMarkingAll(true)
    try {
      const promises = logs.map(r => 
        axios.put(`${import.meta.env.VITE_API_BASE_URL}/staff/attendance/${r.id}`, {
          date: dateFilter,
          status: targetStatus,
          checkIn: targetStatus === 'Absent' || targetStatus === 'Leave' ? '' : (r.checkIn !== '—' ? r.checkIn : '08:00 AM'),
          checkOut: targetStatus === 'Absent' || targetStatus === 'Leave' ? '' : (r.checkOut !== '—' ? r.checkOut : '04:00 PM'),
        })
      )
      await Promise.all(promises)
      toast.success(`Successfully marked all staff as ${targetStatus}!`)
      await loadLogs()
    } catch (err) {
      console.error(err)
      toast.error('Failed to mark all staff attendance.')
    } finally {
      setMarkingAll(false)
    }
  }

  // ── Handlers ──
  const handleEditSaved = () => {
    loadLogs()
    setEditRecord(null)
  }

  return (
    <motion.div className="animate-fade-in" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{isTeacher ? 'My Attendance & Leave' : 'Staff Attendance'}</h1>
          <p className="page-subtitle">{TODAY_LABEL}</p>
        </div>

        {/* Tab Switcher: Daily Roll-Call vs Attendance History */}
        <div style={{
          display: 'inline-flex',
          background: 'var(--clr-surface)',
          border: '1px solid var(--clr-glass-border)',
          borderRadius: 'var(--radius-md)',
          padding: '4px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('daily')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 16px',
              fontSize: '0.85rem',
              fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: activeTab === 'daily' ? 'var(--clr-primary)' : 'transparent',
              color: activeTab === 'daily' ? '#fff' : 'var(--clr-text-secondary)'
            }}
          >
            <FaClipboardList /> Today's Log
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 16px',
              fontSize: '0.85rem',
              fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: activeTab === 'history' ? 'var(--clr-primary)' : 'transparent',
              color: activeTab === 'history' ? '#fff' : 'var(--clr-text-secondary)'
            }}
          >
            <FaHistory /> Attendance History
          </button>
        </div>
        <div className="flex gap-md" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
          {isBranchAdmin ? (
            <>
              <button
                id="give-attendance-header-btn"
                className="btn-primary"
                onClick={() => setEditRecord(filtered[0] || logs[0] || { id: null, name: 'Staff Member', date: dateFilter, status: 'Present', checkIn: '08:00 AM', checkOut: '04:00 PM' })}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <FaUserCheck /> Give Attendance
              </button>
              <button
                id="mark-attendance-btn"
                className="btn-secondary"
                onClick={() => handleMarkAll('Present')}
                disabled={markingAll || loading || logs.length === 0}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                {markingAll ? (
                  <>
                    <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                    Marking…
                  </>
                ) : (
                  <>
                    <FaCheckDouble /> Mark All Present
                  </>
                )}
              </button>
            </>
          ) : (
            <span
              className="badge badge-secondary"
              style={{
                padding: '8px 14px',
                fontSize: '0.82rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(0, 90, 158, 0.08)',
                color: 'var(--clr-text-secondary)',
                border: '1px solid rgba(0, 90, 158, 0.15)'
              }}
            >
              <FaLock style={{ color: 'var(--clr-primary)' }} /> View Only Mode (Branch Admin Required to Mark)
            </span>
          )}
          <button
            id="export-attendance-btn"
            className="btn-secondary"
            onClick={() => toast.info('Export feature coming soon.')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <FaDownload /> Export Report
          </button>
        </div>
      </div>

      {/* ── Attendance History Mode View ── */}
      {activeTab === 'history' ? (
        <div className="space-y-md">
          {/* History Controls Bar */}
          <div className="glass-panel page-card">
            <div className="flex items-center gap-md" style={{ flexWrap: 'wrap', marginBottom: 'var(--sp-md)' }}>
              {/* Status tabs */}
              <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                {statuses.map((s) => (
                  <button
                    key={s}
                    className={statusFilter === s ? 'btn-primary' : 'btn-secondary'}
                    style={{ padding: '7px 14px', fontSize: '0.82rem' }}
                    onClick={() => setStatusFilter(s)}
                  >
                    {s === 'All' ? <FaClipboardList /> : STATUS_CONFIG[s].icon} {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-md" style={{ flexWrap: 'wrap' }}>
              {/* Search */}
              <div className="header-search">
                <span className="header-search-icon"><FaSearch /></span>
                <input
                  className="header-search-input"
                  type="search"
                  placeholder="Search staff name…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Staff filter dropdown (for Admins) */}
              {!isTeacher && staffOptions.length > 0 && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}>Staff Member</label>
                  <select
                    className="form-input"
                    style={{ width: 'auto' }}
                    value={historyTeacherId}
                    onChange={(e) => setHistoryTeacherId(e.target.value)}
                  >
                    <option value="">All Staff</option>
                    {staffOptions.map(([id, nm]) => (
                      <option key={id} value={id}>{nm}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date range filter */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}><FaCalendarAlt /> From Date</label>
                <input
                  type="date"
                  className="form-input"
                  style={{ width: 'auto' }}
                  value={historyStartDate}
                  onChange={(e) => setHistoryStartDate(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}><FaCalendarAlt /> To Date</label>
                <input
                  type="date"
                  className="form-input"
                  style={{ width: 'auto' }}
                  value={historyEndDate}
                  onChange={(e) => setHistoryEndDate(e.target.value)}
                />
              </div>

              <button
                className="btn-secondary"
                onClick={loadHistoryLogs}
                disabled={loadingHistory}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <FaSync /> {loadingHistory ? 'Loading…' : 'Refresh History'}
              </button>
            </div>
          </div>

          {/* History Records Table */}
          <div className="glass-panel page-card">
            <div className="section-header">
              <div className="section-title">
                <span className="section-title-dot" />
                Historical Attendance Logs
              </div>
              <span className="text-muted">
                {loadingHistory ? 'Fetching past logs…' : `${filteredHistory.length} historical record${filteredHistory.length !== 1 ? 's' : ''} found`}
              </span>
            </div>

            {loadingHistory ? (
              <div className="spinner-wrap">
                <span className="spinner" role="status" aria-label="Loading historical attendance" />
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col" style={{ width: '48px' }}>#</th>
                      <th scope="col">Date</th>
                      <th scope="col">Staff Member</th>
                      <th scope="col">Clock-In</th>
                      <th scope="col">Clock-Out</th>
                      <th scope="col">Duration</th>
                      <th scope="col">Classes Conducted</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((r, i) => (
                      <tr key={r.id + '_' + r.date + '_' + i}>
                        <td>{i + 1}</td>
                        <td>
                          <span style={{ fontWeight: 600, color: 'var(--clr-text-primary)' }}>
                            {r.date ? new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-sm">
                            <div className={`avatar ${AVATAR_CLRS[i % AVATAR_CLRS.length]}`}>
                              {initials(r.name)}
                            </div>
                            <div>
                              <div className="font-bold">{r.name}</div>
                              <div className="text-muted" style={{ fontSize: '0.75rem' }}>ID: {r.id || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`attendance-time-cell${r.checkIn !== '—' ? ' time-present' : ' time-absent'}`}>
                            {r.checkIn !== '—' && <FaCircle style={{ color: 'green', marginRight: 4, display: 'inline', fontSize: '0.65rem' }} />} {r.checkIn}
                          </span>
                        </td>
                        <td>
                          <span className={`attendance-time-cell${r.checkOut !== '—' ? ' time-present' : ' time-absent'}`}>
                            {r.checkOut !== '—' && <FaCircle style={{ color: 'red', marginRight: 4, display: 'inline', fontSize: '0.65rem' }} />} {r.checkOut}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: r.duration !== '—' ? 'var(--clr-text-primary)' : 'var(--clr-text-muted)' }}>
                            {r.duration || '—'}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-secondary" style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                            {r.classesConducted ?? 0} / {r.totalClasses ?? 0}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${STATUS_CONFIG[r.status]?.badge ?? 'badge-info'}`}>
                            {STATUS_CONFIG[r.status]?.icon} {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {filteredHistory.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--clr-text-muted)' }}>
                          <div style={{ fontSize: '2rem', marginBottom: '8px' }}><FaHistory /></div>
                          No attendance history records match your selected range and filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Today's Log View (Daily Mode) ── */
        <>
      {/* ── Summary Stat Cards ── */}
      <div className="metrics-grid metrics-grid-5">
        <div className="glass-panel metric-card animate-fade-in-up">
          <div className="metric-icon-wrap metric-icon-green"><FaCheckCircle /></div>
          <div className="metric-label">Present</div>
          <div className="metric-value">{counts.Present}</div>
          <span className="metric-delta metric-delta-up">↑ on time</span>
        </div>
        <div className="glass-panel metric-card animate-fade-in-up">
          <div className="metric-icon-wrap metric-icon-red"><FaTimesCircle /></div>
          <div className="metric-label">Absent</div>
          <div className="metric-value">{counts.Absent}</div>
          {counts.Absent > 0 && <span className="metric-delta metric-delta-down">⚠ alert</span>}
        </div>
        <div className="glass-panel metric-card animate-fade-in-up">
          <div className="metric-icon-wrap metric-icon-orange"><FaClock /></div>
          <div className="metric-label">Late Arrivals</div>
          <div className="metric-value">{counts.Late}</div>
        </div>
        <div className="glass-panel metric-card animate-fade-in-up">
          <div className="metric-icon-wrap metric-icon-blue"><FaUmbrellaBeach /></div>
          <div className="metric-label">On Leave</div>
          <div className="metric-value">{counts.Leave}</div>
        </div>
        <div className="glass-panel metric-card animate-fade-in-up">
          <div className="metric-icon-wrap" style={{ background: 'linear-gradient(135deg,#7a4e9e,#5c3d7a)', color: '#fff' }}><FaChartBar /></div>
          <div className="metric-label">Attendance Rate</div>
          <div className="metric-value">{attendanceRate}%</div>
          <div className="attendance-rate-bar" role="progressbar" aria-valuenow={attendanceRate} aria-valuemin={0} aria-valuemax={100}>
            <div className="attendance-rate-fill" style={{ width: `${attendanceRate}%` }} />
          </div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="glass-panel page-card">
        <div className="flex items-center gap-md" style={{ flexWrap: 'wrap', marginBottom: 'var(--sp-md)' }}>
          {/* Status tabs */}
          <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
            {statuses.map((s) => (
              <button
                key={s}
                id={`attendance-filter-${s.toLowerCase()}`}
                className={statusFilter === s ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '7px 14px', fontSize: '0.82rem' }}
                onClick={() => setStatusFilter(s)}
                aria-pressed={statusFilter === s}
              >
                {s === 'All' ? <FaClipboardList /> : STATUS_CONFIG[s].icon} {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-md" style={{ flexWrap: 'wrap' }}>
          {/* Search */}
          <div className="header-search">
            <span className="header-search-icon"><FaSearch /></span>
            <input
              id="attendance-search"
              className="header-search-input"
              type="search"
              placeholder="Search staff name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search attendance records"
            />
          </div>

          {/* Date filter */}
          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="attendance-date-filter" className="form-label" style={{ fontSize: '0.75rem', marginBottom: '2px' }}><FaCalendarAlt /> Date</label>
            <input
              id="attendance-date-filter"
              type="date"
              className="form-input"
              style={{ width: 'auto' }}
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              aria-label="Filter by date"
            />
          </div>

          <button
            id="attendance-refresh-btn"
            className="btn-secondary"
            onClick={loadLogs}
            disabled={loading}
            aria-label="Refresh attendance logs"
          >
            <FaSync /> Refresh
          </button>
        </div>
      </div>

      {/* ── View-Only Notice if not Branch Admin ── */}
      {!isBranchAdmin && (
        <div
          className="glass-panel animate-fade-in"
          style={{
            padding: '12px 18px',
            marginBottom: 'var(--sp-md)',
            borderRadius: '8px',
            background: 'rgba(0, 90, 158, 0.06)',
            border: '1px solid rgba(0, 90, 158, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '0.875rem',
            color: 'var(--clr-text-secondary)'
          }}
        >
          <FaInfoCircle style={{ color: 'var(--clr-primary)', fontSize: '1.25rem', flexShrink: 0 }} />
          <div>
            <strong style={{ color: 'var(--clr-primary)' }}>Branch Admin Protected:</strong> Only the Branch Admin is authorized to record, give, or modify teacher attendance. You have read-only access.
          </div>
        </div>
      )}

      {/* ── Attendance Log Table ── */}
      <div className="glass-panel page-card">
        <div className="section-header">
          <div className="section-title">
            <span className="section-title-dot" />
            Clock-In / Clock-Out Log
          </div>
          <span className="text-muted">
            {loading ? 'Loading…' : `${filtered.length} record${filtered.length !== 1 ? 's' : ''} found`}
          </span>
        </div>

        {loading ? (
          <div className="spinner-wrap">
            <span className="spinner" role="status" aria-label="Loading attendance records" />
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table" aria-label="Staff attendance log table">
              <thead>
                <tr>
                  <th scope="col">Staff Member</th>
                  <th scope="col">Date</th>
                  <th scope="col">Clock-In</th>
                  <th scope="col">Clock-Out</th>
                  <th scope="col">Total Duration</th>
                  <th scope="col">Assigned Periods</th>
                  <th scope="col">Conducted</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id}>
                    {/* Staff */}
                    <td>
                      <div className="filter-row">
                        <div className={`avatar avatar-md ${AVATAR_CLRS[i % AVATAR_CLRS.length]}`}>
                          {initials(r.name)}
                        </div>
                        <div>
                          <div className="font-bold" style={{ fontSize: '0.875rem' }}>{r.name}</div>
                          <div className="text-muted">ID: TCH-{String(r.id).padStart(3, '0')}</div>
                        </div>
                      </div>
                    </td>

                    {/* Date */}
                    <td>
                      <span style={{ fontSize: '0.82rem', color: 'var(--clr-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                        {r.date
                          ? new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '—'}
                      </span>
                    </td>

                    {/* Clock-In */}
                    <td>
                      <span className={`attendance-time-cell${r.checkIn !== '—' ? ' time-present' : ' time-absent'}`}>
                        {r.checkIn !== '—' && <FaCircle style={{ color: 'green', marginRight: 4, display: 'inline', fontSize: '0.65rem' }} />} {r.checkIn}
                      </span>
                    </td>

                    {/* Clock-Out */}
                    <td>
                      <span className={`attendance-time-cell${r.checkOut !== '—' ? ' time-present' : ' time-absent'}`}>
                        {r.checkOut !== '—' && <FaCircle style={{ color: 'red', marginRight: 4, display: 'inline', fontSize: '0.65rem' }} />} {r.checkOut}
                      </span>
                    </td>

                    {/* Duration */}
                    <td>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: r.duration !== '—' ? 'var(--clr-text-primary)' : 'var(--clr-text-muted)' }}>
                        {r.duration || '—'}
                      </span>
                    </td>

                    {/* Total Classes */}
                    <td>
                      <span className="badge badge-secondary" style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                        {r.totalClasses ?? 0} Periods
                      </span>
                    </td>

                    {/* Classes Conducted */}
                    <td>
                      {(() => {
                        const total = Number(r.totalClasses) || 0;
                        const conducted = Number(r.classesConducted) || 0;
                        const isAll = total > 0 && conducted >= total;
                        const isPart = conducted > 0 && conducted < total;
                        return (
                          <span
                            className="badge"
                            style={{
                              fontVariantNumeric: 'tabular-nums',
                              fontWeight: 600,
                              background: isAll ? 'rgba(16, 185, 129, 0.15)' : isPart ? 'rgba(245, 158, 11, 0.15)' : 'rgba(107, 114, 128, 0.12)',
                              color: isAll ? '#059669' : isPart ? '#d97706' : '#6b7280',
                              border: '1px solid ' + (isAll ? 'rgba(16, 185, 129, 0.3)' : isPart ? 'rgba(245, 158, 11, 0.3)' : 'rgba(107, 114, 128, 0.2)')
                            }}
                            title={conducted + ' of ' + total + ' periods conducted for this date'}
                          >
                            {conducted} / {total}
                          </span>
                        );
                      })()}
                    </td>

                    {/* Status */}
                    <td>
                      <span className={`badge ${STATUS_CONFIG[r.status]?.badge ?? 'badge-info'}`}>
                        {STATUS_CONFIG[r.status]?.icon} {r.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="flex items-center gap-sm" style={{ flexWrap: 'nowrap' }}>
                        {isBranchAdmin ? (
                          <>
                            <button
                              id={`give-attendance-btn-${r.id}`}
                              className={r.status === 'Not Marked' ? 'btn-primary' : 'btn-secondary'}
                              style={{
                                padding: '6px 12px',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                whiteSpace: 'nowrap',
                                borderRadius: '6px',
                                boxShadow: r.status === 'Not Marked' ? '0 2px 6px rgba(0, 90, 158, 0.25)' : 'none',
                              }}
                              onClick={() => setEditRecord(r)}
                              title={`Give attendance for ${r.name}`}
                            >
                              <FaUserCheck /> Give Attendance
                            </button>
                            <button
                              className="btn-icon"
                              aria-label={`Edit attendance for ${r.name}`}
                              title="Edit details"
                              onClick={() => setEditRecord(r)}
                            ><FaEdit /></button>
                          </>
                        ) : (
                          <span
                            className="badge badge-secondary"
                            style={{
                              fontSize: '0.75rem',
                              padding: '4px 10px',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Only Branch Admin can modify attendance"
                          >
                            <FaLock style={{ fontSize: '0.68rem' }} /> Read Only
                          </span>
                        )}
                        <button
                          className="btn-icon"
                          aria-label={`View history for ${r.name}`}
                          title="View history"
                          onClick={() => {
                            setHistoryTeacherId(r.id)
                            setActiveTab('history')
                          }}
                        ><FaHistory /></button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--clr-text-muted)' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '8px' }}><FaClipboardList /></div>
                      No attendance records match your current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Table footer summary */}
        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between" style={{ marginTop: 'var(--sp-md)', paddingTop: 'var(--sp-md)', borderTop: '1px solid rgba(0,90,158,0.08)', flexWrap: 'wrap', gap: 'var(--sp-sm)' }}>
            <div className="flex gap-md">
              {Object.entries(counts).map(([key, val]) => (
                <span key={key} className="flex items-center gap-sm text-muted">
                  {STATUS_CONFIG[key].icon}
                  <span style={{ fontWeight: 600, color: 'var(--clr-text-primary)' }}>{val}</span> {key}
                </span>
              ))}
            </div>
            <span className="text-muted">
              Showing <strong style={{ color: 'var(--clr-text-primary)' }}>{filtered.length}</strong> of <strong style={{ color: 'var(--clr-text-primary)' }}>{logs.length}</strong> records
            </span>
          </div>
        )}
      </div>

        </>
      )}

      {/* ── Edit Modal ── */}
      {editRecord && isBranchAdmin && (
        <EditAttendanceModal
          record={editRecord}
          records={filtered.length ? filtered : logs}
          isBranchAdmin={isBranchAdmin}
          onClose={() => setEditRecord(null)}
          onSaved={handleEditSaved}
        />
      )}
    </motion.div>
  )
}
