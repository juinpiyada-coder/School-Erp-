import axios from '../../lib/axios'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  FaSearch, 
  FaCalendarAlt, 
  FaCheck, 
  FaTimes, 
  FaSave, 
  FaExclamationTriangle, 
  FaClock, 
  FaBook, 
  FaUserTie,
  FaCheckDouble,
  FaUserTimes,
  FaCalendarDay,
  FaLayerGroup,
  FaHistory,
  FaSync
} from 'react-icons/fa'
import { toast } from 'react-toastify'

const STATUS_COLORS = {
  Present: { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
  Absent:  { bg: 'rgba(239,68,68,0.15)',  color: '#ef4444' },
  Late:    { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
}

export default function StudentAttendance() {
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [branches, setBranches] = useState([])
  const [schedules, setSchedules] = useState([])
  const [classRoutines, setClassRoutines] = useState([])
  const [loadingRoutines, setLoadingRoutines] = useState(false)
  const [subjects, setSubjects] = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [role, setRole] = useState('')
  const [userCenterId, setUserCenterId] = useState('')

  // Mode: 'daily' (Class-wise daily roll-call), 'period' (Period timetable routine), or 'history' (Historical Attendance Records)
  const [attendanceMode, setAttendanceMode] = useState('daily')
  const [historyLogs, setHistoryLogs] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historyStartDate, setHistoryStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [historyEndDate, setHistoryEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [historyStatusFilter, setHistoryStatusFilter] = useState('ALL')

  const today = new Date().toISOString().split('T')[0]
  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedBranch, setSelectedBranch] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSchedule, setSelectedSchedule] = useState('')
  const [search, setSearch] = useState('')

  const [draftAttendance, setDraftAttendance] = useState({})

  useEffect(() => {
    try {
      const u = JSON.parse(sessionStorage.getItem('e_school_user') || '{}')
      setRole((u?.user_role || u?.role || '').toUpperCase())
      const brId = u?.branch_id || u?.SCHL_BR_ID || u?.center_id || ''
      setUserCenterId(brId)
      if (brId) {
        setSelectedBranch(brId)
      }
    } catch (e) {}
  }, [])

  const isReadOnlyRole = ['R_STUDENT', 'R_PARENT', 'R_GUARDIAN'].includes(role)

  useEffect(() => {
    if (role && isReadOnlyRole) {
      navigate('/student/attendance-report', { replace: true })
    }
  }, [role, isReadOnlyRole, navigate])

  const loadAttendanceHistory = useCallback(async () => {
    setLoadingHistory(true)
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/student/attendance?limit=1000`)
      const list = Array.isArray(res.data) ? res.data : res.data?.data || []
      setHistoryLogs(list)
    } catch (err) {
      console.error('Failed to load attendance history:', err)
      setHistoryLogs([])
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  useEffect(() => {
    if (attendanceMode === 'history') {
      loadAttendanceHistory()
    }
  }, [attendanceMode, loadAttendanceHistory])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [clsRes, branchRes, schRes, subRes, tchrRes] = await Promise.allSettled([
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/classes`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/branches`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/student/schedules?limit=1000`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/subjects?limit=1000`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/staff/teachers?limit=1000`)
      ])

      const clsData = clsRes.status === 'fulfilled' ? clsRes.value.data : []
      const clsItems = Array.isArray(clsData) ? clsData : clsData?.data || []
      const parsedClasses = clsItems.map(c => ({
        id: c.SCHL_BR_CLS_ID || c.schl_br_cls_id || c.id,
        name: (c.SCHL_BR_CLASS_NM || c.schl_br_class_nm || c.name || 'Unknown').trim(),
        branchId: c.SCHL_BR_CENT_ID || c.schl_br_cent_id || ''
      }))
      setClasses(parsedClasses)

      const branchData = branchRes.status === 'fulfilled' ? branchRes.value.data : []
      const branchItems = Array.isArray(branchData) ? branchData : branchData?.data || []
      const mappedBranches = branchItems.map(b => ({ id: b.SCHL_BR_ID || b.id, name: (b.SCHL_BR_NM || b.name || 'Unknown').trim() }))
      setBranches(mappedBranches)

      const schData = schRes.status === 'fulfilled' ? schRes.value.data : []
      const schItems = Array.isArray(schData) ? schData : schData?.data || []
      setSchedules(schItems)

      const subData = subRes.status === 'fulfilled' ? subRes.value.data : []
      const subItems = Array.isArray(subData) ? subData : subData?.data || []
      setSubjects(subItems.map(s => ({
        id: s.SCHL_BR_SUB_ID || s.SCHL_SUB_ID || s.id,
        name: s.SCHL_SUB_NM || s.name || 'Subject'
      })))

      const tchrData = tchrRes.status === 'fulfilled' ? tchrRes.value.data : []
      const tchrItems = Array.isArray(tchrData) ? tchrData : tchrData?.data || []
      setTeachers(tchrItems.map(t => ({
        id: t.BR_TCHR_ID || t.id,
        name: t.BR_TCHR_NM || t.name || 'Teacher'
      })))

      // Auto-select branch by default (logged-in user's branch or first available branch)
      let branchToSelect = ''
      const u = JSON.parse(sessionStorage.getItem('e_school_user') || '{}')
      const userBranch = u?.branch_id || u?.SCHL_BR_ID || u?.center_id || ''
      if (userBranch && mappedBranches.some(b => String(b.id) === String(userBranch))) {
        branchToSelect = String(userBranch)
      } else if (mappedBranches.length > 0) {
        branchToSelect = String(mappedBranches[0].id)
      }
      if (branchToSelect) {
        setSelectedBranch(branchToSelect)

        // Auto-select class for selected branch
        const branchClasses = parsedClasses.filter(c => String(c.branchId) === String(branchToSelect) || !c.branchId)
        if (branchClasses.length > 0) {
          setSelectedClass(String(branchClasses[0].id))
        }
      }

    } catch (err) {
      console.error('Failed to load initial data:', err)
      toast.error('Failed to load classes and schedules')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Handle branch change: update branch and auto-select first class for that branch
  const handleBranchChange = (newBranchId) => {
    setSelectedBranch(newBranchId)
    setSelectedSchedule('')
    const branchClasses = classes.filter(c => newBranchId ? (String(c.branchId) === String(newBranchId) || !c.branchId) : true)
    if (branchClasses.length > 0) {
      setSelectedClass(branchClasses[0].id)
    } else {
      setSelectedClass('')
    }
  }

  // Handle class change: update class and clear routine selection
  const handleClassChange = (newClassId) => {
    setSelectedClass(newClassId)
    setSelectedSchedule('')
  }

  // Fetch Daily Routine / Timetable whenever selectedClass changes
  useEffect(() => {
    if (!selectedClass) {
      setClassRoutines([])
      return
    }

    const loadRoutinesForClass = async () => {
      setLoadingRoutines(true)
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/timetable/${selectedClass}`)
        const items = Array.isArray(res.data) ? res.data : res.data?.data || []
        if (items.length > 0) {
          const mapped = items.map(r => ({
            id: r.SCHL_CLS_SCHLDL_ID || r.id,
            subjectName: (r.subject_name || '').trim() || (subjects.find(s => String(s.id) === String(r.SCHL_CLS_SCHLDL_SUB_ID))?.name) || 'Class Period',
            teacherName: (r.teacher_name || '').trim() || (teachers.find(t => String(t.id) === String(r.SCHL_BR_TCHR_ID))?.name) || 'Assigned Teacher',
            fromTime: r.SCHL_CLS_SCHDL_FRM_DT || r.from_time || '',
            toTime: r.SCHL_CLS_SCHDL_TO_DT || r.to_time || '',
            day: r.SCHL_DAY_OF_WK || r.day || '',
            room: r.SCHL_BR_RM_ID || ''
          }))
          setClassRoutines(mapped)
        } else {
          // Fallback to schedules
          const fallback = schedules.filter(s => {
            const schClassId = s.SCHL_CLS_SCHLDL_SEC_SESS_ID || s.class_id
            return String(schClassId) === String(selectedClass)
          }).map(s => {
            const sub = subjects.find(sub => String(sub.id) === String(s.SCHL_CLS_SCHLDL_SUB_ID || s.subject_id))
            const tchr = teachers.find(t => String(t.id) === String(s.SCHL_BR_TCHR_ID || s.teacher_id))
            return {
              id: s.SCHL_CLS_SCHLDL_ID || s.id,
              subjectName: sub ? sub.name : (s.subject_name || 'Class Period'),
              teacherName: tchr ? tchr.name : (s.teacher_name || 'Assigned Teacher'),
              fromTime: s.SCHL_CLS_SCHDL_FRM_DT || s.from_time || '',
              toTime: s.SCHL_CLS_SCHDL_TO_DT || s.to_time || '',
              day: s.SCHL_DAY_OF_WK || s.day || '',
              room: s.SCHL_BR_RM_ID || ''
            }
          })
          setClassRoutines(fallback)
        }
      } catch (err) {
        console.error('Failed to load class routine timetable:', err)
        setClassRoutines([])
      } finally {
        setLoadingRoutines(false)
      }
    }

    loadRoutinesForClass()
  }, [selectedClass, subjects, teachers, schedules])

  // Get available periods/routines for the selected class
  const classSchedules = useMemo(() => {
    if (!selectedClass) return []
    return schedules.filter(s => {
      const schClassId = s.SCHL_CLS_SCHLDL_SEC_SESS_ID || s.class_id
      return String(schClassId) === String(selectedClass)
    }).map(s => {
      const sub = subjects.find(sub => String(sub.id) === String(s.SCHL_CLS_SCHLDL_SUB_ID || s.subject_id))
      const tchr = teachers.find(t => String(t.id) === String(s.SCHL_BR_TCHR_ID || s.teacher_id))
      return {
        id: s.SCHL_CLS_SCHLDL_ID || s.id,
        subjectName: sub ? sub.name : (s.subject_name || 'Class Period'),
        teacherName: tchr ? tchr.name : (s.teacher_name || 'Assigned Teacher'),
        fromTime: s.SCHL_CLS_SCHDL_FRM_DT || s.from_time || '',
        toTime: s.SCHL_CLS_SCHDL_TO_DT || s.to_time || '',
        day: s.SCHL_DAY_OF_WK || s.day || '',
        room: s.SCHL_BR_RM_ID || ''
      }
    })
  }, [schedules, selectedClass, subjects, teachers])

  const activeRoutines = useMemo(() => {
    return classRoutines.length > 0 ? classRoutines : classSchedules
  }, [classRoutines, classSchedules])

  // Fetch student roster and their attendance for the chosen class, date and routine
  useEffect(() => {
    if (!selectedClass) {
      setStudents([])
      setDraftAttendance({})
      return
    }

    const loadClassStudents = async () => {
      setLoading(true)
      try {
        const [stuRes, attRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_BASE_URL}/student/students?limit=1000`),
          axios.get(`${import.meta.env.VITE_API_BASE_URL}/student/attendance?limit=1000`)
        ])

        const stuItems = Array.isArray(stuRes.data) ? stuRes.data : stuRes.data?.data || []
        const selectedClassObj = classes.find(c => String(c.id) === String(selectedClass))
        const selectedClassName = (selectedClassObj?.name || '').trim().toLowerCase()

        const filteredList = stuItems.filter(s => {
          const sClassId = s.class_id || s.STU_BR_CLASS_ID || s.stu_br_class_id || s.STU_CLASS_REF_ID || s.class_session_id || s.SCHL_BR_CLS_ID
          const sClassName = (s.className || s.SCHL_BR_CLASS_NM || s.class_name || '').trim().toLowerCase()
          const sBranchId = s.branch_id || s.SCHL_BR_ID || s.branchId || ''
          
          const matchesBranch = !selectedBranch || !sBranchId || String(sBranchId) === String(selectedBranch)
          const matchesClass = String(sClassId) === String(selectedClass) || 
                               (selectedClassName && sClassName === selectedClassName) ||
                               (s.class_session_id && String(s.class_session_id) === String(selectedClass))
          
          return matchesBranch && matchesClass
        }).map(s => ({
          id: s.STU_ID || s.stu_id || s.id,
          name: s.STU_NM || s.stu_nm || s.name || 'Unknown',
          rollNumber: s.STU_ROLL_NO || s.STU_AADHAR || s.rollNumber || 'N/A'
        }))

        // If no students matched the currently selected class but the backend did return
        // students (e.g. for a teacher whose assigned class differs), auto-select the
        // class of the first returned student so the roster is never empty.
        if (filteredList.length === 0 && stuItems.length > 0) {
          const firstStu = stuItems[0]
          const firstClassId = firstStu.class_id || firstStu.STU_BR_CLASS_ID || firstStu.stu_br_class_id || firstStu.class_session_id || firstStu.SCHL_BR_CLS_ID
          if (firstClassId && String(firstClassId) !== String(selectedClass)) {
            setSelectedClass(String(firstClassId))
            setLoading(false)
            return
          }
        }

        setStudents(filteredList)

        // Populate draft attendance matching selected Date and optional Period Routine
        const attItems = Array.isArray(attRes.data) ? attRes.data : attRes.data?.data || []
        const draft = {}
        filteredList.forEach(s => {
          const record = attItems.find(a => {
            const matchStudent = (a.ATT_STU_REF_ID || a.STU_STU_ID) === s.id
            const matchDate = (a.ATT_DT || a.STU_ATT_DT) === selectedDate
            if (selectedSchedule) {
              return matchStudent && matchDate && String(a.STU_CLS_SCHLDL_ID || a.schedule_id) === String(selectedSchedule)
            } else {
              return matchStudent && matchDate && (!a.STU_CLS_SCHLDL_ID || a.STU_CLS_SCHLDL_ID === '')
            }
          })

          draft[s.id] = record
            ? { ATT_ID: record.ATT_ID || record.STU_ATT_ID, status: record.ATT_STATUS || record.STU_PRES || 'Present', remarks: record.ATT_REMARKS || '' }
            : { ATT_ID: null, status: 'Present', remarks: '' }
        })

        setDraftAttendance(draft)
      } catch (err) {
        console.error('Failed to fetch class roster:', err)
      } finally {
        setLoading(false)
      }
    }

    loadClassStudents()
  }, [selectedClass, selectedSchedule, selectedDate, classes])

  const filteredHistoryLogs = useMemo(() => {
    return historyLogs.filter(log => {
      const logDate = log.STU_ATT_DT || log.ATT_DT || log.date || ''
      const logStatus = log.STU_PRES || log.ATT_STATUS || log.status || 'Present'
      const stuName = (log.STU_NM || log.student_name || log.name || '').toLowerCase()
      const className = (log.class_name || log.className || '').toLowerCase()
      const searchLower = search.toLowerCase()

      const matchSearch = !search || stuName.includes(searchLower) || className.includes(searchLower)
      const matchStatus = historyStatusFilter === 'ALL' || logStatus.toLowerCase() === historyStatusFilter.toLowerCase()
      const matchStart = !historyStartDate || (logDate >= historyStartDate)
      const matchEnd = !historyEndDate || (logDate <= historyEndDate)

      return matchSearch && matchStatus && matchStart && matchEnd
    })
  }, [historyLogs, search, historyStatusFilter, historyStartDate, historyEndDate])

  const filteredStudents = useMemo(() => {
    return students.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(search.toLowerCase())
    )
  }, [students, search])

  const handleStatusChange = (stuId, status) => {
    setDraftAttendance(prev => ({ ...prev, [stuId]: { ...prev[stuId], status } }))
  }

  const handleRemarksChange = (stuId, remarks) => {
    setDraftAttendance(prev => ({ ...prev, [stuId]: { ...prev[stuId], remarks } }))
  }

  // Quick action: Mark all displayed students as Present or Absent
  const markAll = (status) => {
    setDraftAttendance(prev => {
      const updated = { ...prev }
      filteredStudents.forEach(s => {
        updated[s.id] = { ...updated[s.id], status }
      })
      return updated
    })
    toast.info(`Marked all students as ${status}`)
  }

  const handleSave = async () => {
    if (!selectedClass) {
      toast.warning('Please select a class first.')
      return
    }
    if (filteredStudents.length === 0) {
      toast.warning('No students to save attendance for.')
      return
    }
    try {
      setSaving(true)
      const promises = filteredStudents.map(s => {
        const draft = draftAttendance[s.id]
        if (!draft) return Promise.resolve()
        const payload = {
          ATT_STU_REF_ID: s.id,
          STU_STU_ID: s.id,
          ATT_DT: selectedDate,
          STU_ATT_DT: selectedDate,
          ATT_STATUS: draft.status,
          STU_PRES: draft.status,
          ATT_REMARKS: draft.remarks || '',
          STU_CLS_SCHLDL_ID: selectedSchedule || null
        }
        return draft.ATT_ID
          ? axios.put(`${import.meta.env.VITE_API_BASE_URL}/student/attendance/${draft.ATT_ID}`, payload)
          : axios.post(`${import.meta.env.VITE_API_BASE_URL}/student/attendance`, payload)
      })
      await Promise.all(promises)
      toast.success(selectedSchedule ? 'Period routine attendance saved successfully!' : 'Daily class attendance saved successfully!')
    } catch (err) {
      console.error('Failed to save attendance:', err)
      toast.error('Failed to save attendance. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const totalStudents = filteredStudents.length
  const presentCount = filteredStudents.filter(s => draftAttendance[s.id]?.status === 'Present').length
  const absentCount  = filteredStudents.filter(s => draftAttendance[s.id]?.status === 'Absent').length
  const lateCount    = filteredStudents.filter(s => draftAttendance[s.id]?.status === 'Late').length

  const currentScheduleObj = activeRoutines.find(cs => String(cs.id) === String(selectedSchedule))

  return (
    <motion.div className="animate-fade-in" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Student Attendance</h1>
          <p className="page-subtitle">Record and manage class-wise daily roll-call or period routine attendance</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Mode Switcher */}
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
              onClick={() => { setAttendanceMode('daily'); setSelectedSchedule('') }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                fontSize: '0.85rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: attendanceMode === 'daily' ? 'var(--clr-primary)' : 'transparent',
                color: attendanceMode === 'daily' ? '#fff' : 'var(--clr-text-secondary)'
              }}
            >
              <FaCalendarDay /> Daily Class Attendance
            </button>
            <button
              type="button"
              onClick={() => setAttendanceMode('period')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                fontSize: '0.85rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: attendanceMode === 'period' ? 'var(--clr-primary)' : 'transparent',
                color: attendanceMode === 'period' ? '#fff' : 'var(--clr-text-secondary)'
              }}
            >
              <FaClock /> Period Routine
            </button>
            <button
              type="button"
              onClick={() => { setAttendanceMode('history'); setSelectedSchedule('') }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                fontSize: '0.85rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: attendanceMode === 'history' ? 'var(--clr-primary)' : 'transparent',
                color: attendanceMode === 'history' ? '#fff' : 'var(--clr-text-secondary)'
              }}
            >
              <FaHistory /> Attendance History
            </button>
          </div>

          {!isReadOnlyRole && attendanceMode !== 'history' && (
            <button className="btn-primary" onClick={handleSave} disabled={saving || loading || !selectedClass}>
              <FaSave /> {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="metrics-grid">
        <div className="glass-panel metric-card animate-fade-in-up">
          <div className="metric-icon-wrap metric-icon-blue"><FaCalendarAlt /></div>
          <div className="metric-label">Date</div>
          <div className="metric-value" style={{ fontSize: '1.2rem' }}>{selectedDate}</div>
        </div>
        <div className="glass-panel metric-card animate-fade-in-up">
          <div className="metric-icon-wrap metric-icon-green"><FaCheck /></div>
          <div className="metric-label">Present</div>
          <div className="metric-value">{presentCount} / {totalStudents}</div>
        </div>
        <div className="glass-panel metric-card animate-fade-in-up">
          <div className="metric-icon-wrap metric-icon-red"><FaTimes /></div>
          <div className="metric-label">Absent</div>
          <div className="metric-value">{absentCount}</div>
        </div>
        <div className="glass-panel metric-card animate-fade-in-up">
          <div className="metric-icon-wrap" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}><FaClock /></div>
          <div className="metric-label">Late</div>
          <div className="metric-value">{lateCount}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="glass-panel page-card">
        <div className="flex items-center gap-md flex-wrap" style={{ marginBottom: 0 }}>
          {!isReadOnlyRole && (
            <>
              <div className="form-group" style={{ flex: 1, minWidth: 150, marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Branch</label>
                <select className="form-input" value={selectedBranch} onChange={(e) => handleBranchChange(e.target.value)}>
                  <option value="">-- All Branches --</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ flex: 1.2, minWidth: 160, marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Class & Section <span style={{ color: 'red' }}>*</span></label>
                <select className="form-input" value={selectedClass} onChange={(e) => handleClassChange(e.target.value)}>
                  <option value="">-- Select Class --</option>
                  {classes
                    .filter(c => selectedBranch ? (String(c.branchId) === String(selectedBranch) || !c.branchId) : true)
                    .map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                  }
                </select>
              </div>

              <div className="form-group" style={{ flex: 1.5, minWidth: 200, marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Daily Routine / Period</label>
                <select
                  className="form-input"
                  value={selectedSchedule}
                  onChange={(e) => {
                    const val = e.target.value
                    setSelectedSchedule(val)
                    setAttendanceMode(val ? 'period' : 'daily')
                  }}
                  disabled={!selectedClass}
                >
                  <option value="">-- Full Day Roll Call (General) --</option>
                  {activeRoutines.map(sch => (
                    <option key={sch.id} value={sch.id}>
                      {sch.subjectName} ({sch.fromTime} - {sch.toTime}) • {sch.teacherName}{sch.day ? ` [${sch.day}]` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="form-group" style={{ flex: 1, minWidth: 150, marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Select Date</label>
            <input type="date" className="form-input" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} max={today} />
          </div>

          <div className="header-search">
            <span className="header-search-icon"><FaSearch /></span>
            <input
              type="search"
              className="header-search-input"
              placeholder="Search student..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Daily Routine / Timetable Bar for Selected Class */}
      {attendanceMode !== 'history' && selectedClass && (
        <div className="glass-panel page-card mt-sm" style={{ padding: '14px 20px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--clr-glass-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.9rem' }}>
              <FaClock style={{ color: 'var(--clr-primary)' }} />
              <span>Daily Routine for {classes.find(c => String(c.id) === String(selectedClass))?.name || 'Class'}:</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--clr-text-muted)' }}>
              {loadingRoutines ? 'Loading daily routines...' : activeRoutines.length > 0 ? `${activeRoutines.length} routine slot(s) configured` : 'No routine configured in Timetable'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => { setSelectedSchedule(''); setAttendanceMode('daily') }}
              style={{
                padding: '7px 16px',
                borderRadius: '20px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                border: !selectedSchedule ? '1px solid var(--clr-primary)' : '1px solid var(--clr-glass-border)',
                background: !selectedSchedule ? 'var(--clr-primary)' : 'rgba(255, 255, 255, 0.05)',
                color: !selectedSchedule ? '#fff' : 'var(--clr-text-secondary)'
              }}
            >
              <FaCalendarDay /> Full Day Roll Call
            </button>

            {activeRoutines.map((r, idx) => {
              const isSelected = String(selectedSchedule) === String(r.id)
              const selectedDateDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(selectedDate || today).getDay()]
              const isToday = r.day && r.day.toLowerCase() === selectedDateDay.toLowerCase()
              return (
                <button
                  key={r.id || idx}
                  type="button"
                  onClick={() => { setSelectedSchedule(r.id); setAttendanceMode('period') }}
                  style={{
                    padding: '7px 16px',
                    borderRadius: '20px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                    border: isSelected ? '1px solid var(--clr-primary)' : '1px solid var(--clr-glass-border)',
                    background: isSelected ? 'var(--clr-primary)' : 'rgba(255, 255, 255, 0.05)',
                    color: isSelected ? '#fff' : 'var(--clr-text-primary)'
                  }}
                >
                  <FaBook style={{ opacity: 0.8 }} />
                  <span>{r.subjectName}</span>
                  <span style={{ opacity: 0.75, fontSize: '0.75rem' }}>({r.fromTime} - {r.toTime})</span>
                  {r.teacherName && <span style={{ opacity: 0.65, fontSize: '0.75rem' }}>• {r.teacherName}</span>}
                  {isToday && (
                    <span style={{
                      background: isSelected ? '#fff' : 'rgba(16, 185, 129, 0.2)',
                      color: isSelected ? 'var(--clr-primary)' : '#10b981',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      fontSize: '0.68rem',
                      fontWeight: 700
                    }}>
                      Today
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Routine Banner */}
      {attendanceMode !== 'history' && selectedClass && (
        <div className="glass-panel page-card mt-sm flex items-center justify-between" style={{ padding: '12px 20px', background: currentScheduleObj ? 'rgba(0, 90, 158, 0.06)' : 'rgba(16, 185, 129, 0.06)', border: currentScheduleObj ? '1px solid rgba(0, 90, 158, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)' }}>
          <div className="flex items-center gap-md flex-wrap">
            {currentScheduleObj ? (
              <>
                <span className="flex items-center gap-xs font-bold text-primary"><FaBook /> {currentScheduleObj.subjectName}</span>
                <span className="text-muted">|</span>
                <span className="flex items-center gap-xs text-muted"><FaClock /> {currentScheduleObj.fromTime} - {currentScheduleObj.toTime}</span>
                <span className="text-muted">|</span>
                <span className="flex items-center gap-xs text-muted"><FaUserTie /> {currentScheduleObj.teacherName}</span>
                {currentScheduleObj.day && (
                  <>
                    <span className="text-muted">|</span>
                    <span className="badge badge-primary">{currentScheduleObj.day}</span>
                  </>
                )}
              </>
            ) : (
              <span className="flex items-center gap-xs font-bold" style={{ color: '#059669' }}>
                <FaCheckDouble /> Full Day Class Roll Call Attendance ({classes.find(c => String(c.id) === String(selectedClass))?.name || 'Class'})
              </span>
            )}
          </div>
          <span className={currentScheduleObj ? "badge badge-primary" : "badge badge-success"}>
            {currentScheduleObj ? 'Period Routine Mode' : 'Class-Wise Daily Mode'}
          </span>
        </div>
      )}

      {/* Quick Action Toolbar (Mark All) */}
      {attendanceMode !== 'history' && selectedClass && filteredStudents.length > 0 && !isReadOnlyRole && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 6px 0', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--clr-text-secondary)' }}>
            Total Roster: <span style={{ color: 'var(--clr-primary)', fontWeight: 700 }}>{filteredStudents.length} Students</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => markAll('Present')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(16,185,129,0.3)',
                background: 'rgba(16,185,129,0.1)',
                color: '#059669',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <FaCheckDouble /> Mark All Present
            </button>
            <button
              type="button"
              onClick={() => markAll('Absent')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(239,68,68,0.3)',
                background: 'rgba(239,68,68,0.1)',
                color: '#dc2626',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <FaUserTimes /> Mark All Absent
            </button>
          </div>
        </div>
      )}

      {/* Attendance History View */}
      {attendanceMode === 'history' ? (
        <div className="glass-panel page-card mt-md">
          {/* History Filters Bar */}
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '20px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '3px' }}><FaCalendarAlt /> From Date</label>
              <input
                type="date"
                className="form-input"
                style={{ width: 'auto' }}
                value={historyStartDate}
                onChange={(e) => setHistoryStartDate(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '3px' }}><FaCalendarAlt /> To Date</label>
              <input
                type="date"
                className="form-input"
                style={{ width: 'auto' }}
                value={historyEndDate}
                onChange={(e) => setHistoryEndDate(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '3px' }}>Status</label>
              <select
                className="form-input"
                style={{ width: 'auto' }}
                value={historyStatusFilter}
                onChange={(e) => setHistoryStatusFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="Late">Late</option>
              </select>
            </div>

            <button
              type="button"
              className="btn-secondary"
              onClick={loadAttendanceHistory}
              disabled={loadingHistory}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <FaSync /> {loadingHistory ? 'Refreshing...' : 'Refresh History'}
            </button>

            <div style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--clr-text-secondary)', alignSelf: 'center' }}>
              Showing <strong style={{ color: 'var(--clr-primary)' }}>{filteredHistoryLogs.length}</strong> attendance records
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col" style={{ width: '50px' }}>#</th>
                  <th scope="col">Date</th>
                  <th scope="col">Student Name</th>
                  <th scope="col">Class / Session</th>
                  <th scope="col">Status</th>
                  <th scope="col">Recorded Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistoryLogs.length > 0 ? filteredHistoryLogs.map((log, idx) => {
                  const status = log.STU_PRES || log.ATT_STATUS || log.status || 'Present'
                  const color = STATUS_COLORS[status] || STATUS_COLORS.Present
                  const dateStr = log.STU_ATT_DT || log.ATT_DT || log.date || '—'
                  return (
                    <tr key={log.STU_ATT_ID || log.ATT_ID || idx}>
                      <td>{idx + 1}</td>
                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--clr-text-primary)' }}>
                          {dateStr}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{log.STU_NM || log.student_name || log.name || 'Student'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)' }}>ID: {log.STU_STU_ID || log.ATT_STU_REF_ID || log.student_id || '—'}</div>
                      </td>
                      <td>
                        <span className="badge badge-secondary">
                          {log.class_name || log.className || (classes.find(c => String(c.id) === String(log.class_id))?.name) || 'Class'}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          fontWeight: 'bold',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: color.bg,
                          color: color.color,
                          display: 'inline-block'
                        }}>
                          {status}
                        </span>
                      </td>
                      <td>
                        <span className="text-muted" style={{ fontSize: '0.82rem' }}>
                          {log.ATT_REMARKS || log.remarks || '—'}
                        </span>
                      </td>
                    </tr>
                  )
                }) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--clr-text-muted)' }}>
                      {loadingHistory ? 'Loading attendance history...' : 'No historical attendance records found matching filters.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Regular Roll-Call / Period Table */
        <div className="glass-panel page-card mt-md">
          {!selectedClass && !isReadOnlyRole ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--clr-text-muted)' }}>
              <FaLayerGroup style={{ fontSize: '2.5rem', marginBottom: '16px', opacity: 0.4, color: 'var(--clr-primary)' }} />
              <h3 style={{ margin: '0 0 8px 0', color: 'var(--clr-text-primary)' }}>Select a Class & Section</h3>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>Choose your class above to view student roster and record attendance.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: '50px' }}>S.No</th>
                    <th scope="col">Student Info</th>
                    <th scope="col" style={{ width: '300px' }}>Attendance Status</th>
                    <th scope="col">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length > 0 ? filteredStudents.map((s, idx) => {
                    const draft = draftAttendance[s.id] || { status: 'Present', remarks: '' }
                    const colors = STATUS_COLORS[draft.status] || STATUS_COLORS.Present
                    return (
                      <tr key={s.id}>
                        <td>{idx + 1}</td>
                        <td>
                          <div className="font-bold">{s.name}</div>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>ID / Roll: {s.rollNumber}</div>
                        </td>
                        <td>
                          {isReadOnlyRole ? (
                            <span style={{ fontWeight: 'bold', padding: '4px 10px', borderRadius: '6px', background: colors.bg, color: colors.color }}>
                              {draft.status}
                            </span>
                          ) : (
                            <div className="flex gap-sm">
                              {['Present', 'Absent', 'Late'].map(status => (
                                <label key={status} className="flex items-center gap-sm" style={{ cursor: 'pointer', marginLeft: status !== 'Present' ? '12px' : 0 }}>
                                <input
                                  type="radio"
                                  name={`status-${s.id}`}
                                  checked={draft.status === status}
                                  onChange={() => handleStatusChange(s.id, status)}
                                />
                                <span style={{
                                  color: draft.status === status ? STATUS_COLORS[status].color : 'inherit',
                                  fontWeight: draft.status === status ? 'bold' : 'normal'
                                }}>
                                  {status}
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>
                        {isReadOnlyRole ? (
                          <span className="text-muted">{draft.remarks || 'No remarks'}</span>
                        ) : (
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Optional remarks..."
                            value={draft.remarks}
                            onChange={(e) => handleRemarksChange(s.id, e.target.value)}
                            style={{ padding: '6px 10px', height: 'auto', minHeight: '32px' }}
                          />
                        )}
                      </td>
                    </tr>
                  )
                }) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '36px', color: 'var(--clr-text-muted)' }}>
                      {loading ? 'Loading class students...' : 'No students found enrolled in this class.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}
    </motion.div>
  )
}
