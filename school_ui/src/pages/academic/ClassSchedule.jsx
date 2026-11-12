import axios from '../../lib/axios'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FaCalendarAlt, FaEdit, FaClock, FaPrint, FaTrash, FaUserCheck, FaLayerGroup } from 'react-icons/fa'


import { toast } from 'react-toastify'
import { useRealtime, useRealtimeSubscription } from '../../contexts/RealtimeContext'
import { createPortal } from 'react-dom'

const DEFAULT_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const DEFAULT_PERIODS = [
  { id: 1, time: '08:00 - 08:50', label: 'Period 1' },
  { id: 2, time: '09:00 - 09:50', label: 'Period 2' },
  { id: 3, time: '10:00 - 10:50', label: 'Period 3' },
  { id: 4, time: '11:00 - 11:50', label: 'Period 4' },
  { id: 'break', time: '12:00 - 12:50', label: 'Lunch Break', isBreak: true },
  { id: 5, time: '13:00 - 13:50', label: 'Period 5' },
  { id: 6, time: '14:00 - 14:50', label: 'Period 6' },
]

function generatePeriodsFromMatrix(matrix) {
  if (!matrix || !matrix.SCHL_NO_OF_CLASS && !matrix.noOfClass) return DEFAULT_PERIODS
  const numClasses = parseInt(matrix.SCHL_NO_OF_CLASS || matrix.noOfClass || 6, 10)
  const duration = parseInt(matrix.SCHL_CLASS_DURATION || matrix.duration || 45, 10)
  const startTimeStr = (matrix.SCHL_CLASS_FRM || matrix.fromTime || '08:00').substring(0, 5)

  const [startH, startM] = startTimeStr.split(':').map(n => parseInt(n, 10) || 0)
  let currentMinutes = startH * 60 + startM

  const generated = []
  const breakIndex = Math.floor(numClasses / 2)

  for (let i = 1; i <= numClasses; i++) {
    if (i === breakIndex + 1) {
      const bStartH = String(Math.floor(currentMinutes / 60) % 24).padStart(2, '0')
      const bStartM = String(currentMinutes % 60).padStart(2, '0')
      currentMinutes += 30 // 30 min break
      const bEndH = String(Math.floor(currentMinutes / 60) % 24).padStart(2, '0')
      const bEndM = String(currentMinutes % 60).padStart(2, '0')

      generated.push({
        id: 'break',
        time: `${bStartH}:${bStartM} - ${bEndH}:${bEndM}`,
        label: 'Lunch Break',
        isBreak: true
      })
    }

    const sH = String(Math.floor(currentMinutes / 60) % 24).padStart(2, '0')
    const sM = String(currentMinutes % 60).padStart(2, '0')
    currentMinutes += duration
    const eH = String(Math.floor(currentMinutes / 60) % 24).padStart(2, '0')
    const eM = String(currentMinutes % 60).padStart(2, '0')

    generated.push({
      id: i,
      time: `${sH}:${sM} - ${eH}:${eM}`,
      label: `Period ${i}`,
      isBreak: false
    })

    currentMinutes += 5 // 5 min buffer between classes
  }

  return generated
}

export default function ClassSchedule() {
  const navigate = useNavigate()
  const [classes, setClasses] = useState([])
  const [branches, setBranches] = useState([])
  const [matrices, setMatrices] = useState([])
  const [teachers, setTeachers] = useState([])
  const [rooms, setRooms] = useState([])
  const [subjects, setSubjects] = useState([])
  const [mappings, setMappings] = useState([])
  
  const [selectedBranch, setSelectedBranch] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [schedule, setSchedule] = useState([]) // RAW data from backend
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const [teacherFilterOnlyMine, setTeacherFilterOnlyMine] = useState(false)

  useEffect(() => {
    try {
      const u = JSON.parse(sessionStorage.getItem('e_school_user') || '{}')
      setCurrentUser(u)
      setRole((u?.user_role || u?.role || '').toLowerCase())
    } catch (e) {}
  }, [])

  useEffect(() => {
    if (role && (role.includes('student') || role.includes('guardian') || role.includes('parent'))) {
      navigate('/student/routine', { replace: true })
    }
  }, [role, navigate])

  const isTeacher = role.includes('teacher') || (currentUser?.role_id && String(currentUser.role_id).toUpperCase() === 'R_TEACHER')
  const isStudentOrParent = role.includes('student') || role.includes('guardian') || role.includes('parent')
  const isEditingDisabled = isStudentOrParent || isTeacher
  const isReadOnlyRole = isEditingDisabled
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSlot, setEditingSlot] = useState(null)
  const { broadcastChange } = useRealtime()
  const [errors, setErrors] = useState({})
  const [formData, setFormData] = useState({ 
    SCHL_CLS_SCHLDL_ID: '',
    SCHL_CLS_SCHLDL_SUB_ID: '', 
    SCHL_BR_TCHR_ID: '', 
    SCHL_BR_RM_ID: '',
    SCHL_CLS_SCHDL_FRM_DT: '',
    SCHL_CLS_SCHDL_TO_DT: ''
  })

  const refreshCurrentSchedule = useCallback(() => {
    if (selectedClass) loadSchedule(selectedClass)
  }, [selectedClass])

  useRealtimeSubscription('routine', refreshCurrentSchedule)
  useRealtimeSubscription('timetable', refreshCurrentSchedule)
  useRealtimeSubscription('*', refreshCurrentSchedule)

  useEffect(() => {
    loadLookups()
  }, [])

  useEffect(() => {
    if (selectedClass) {
      loadSchedule(selectedClass)
    } else {
      setSchedule([])
    }
  }, [selectedClass])

  async function loadLookups() {
    try {
      const [clsRes, tchrRes, rmRes, subRes, branchRes, matRes, mapRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/classes?limit=1000`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/staff/teachers`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/rooms`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/subjects`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/branches`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/matrices?limit=1000`).catch(() => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/staff/mappings`).catch(() => ({ data: [] }))
      ])
      
      const clsList = Array.isArray(clsRes.data) ? clsRes.data : clsRes.data?.data || []
      const branchList = Array.isArray(branchRes.data) ? branchRes.data : branchRes.data?.data || []

      // Identify teacher's assigned branch if user is a teacher
      const u = JSON.parse(sessionStorage.getItem('e_school_user') || '{}')
      const teacherBranchId = u?.branch_id || u?.user_branch_id || u?.SCHL_BR_ID || ''

      const mappedClasses = clsList.map(c => ({
        ...c,
        branchId: c.SCHL_BR_CENT_ID || c.schl_br_cent_id || '',
        matrixId: c.SCHL_BR_MAT || c.schl_br_mat || ''
      }))
      setClasses(mappedClasses)
      
      const mappedBranches = branchList.map(b => ({
        id: b.SCHL_BR_ID || b.id,
        name: b.SCHL_BR_NM || b.name || 'Unknown'
      }))
      setBranches(mappedBranches)

      // Auto-select the teacher's branch if not yet set
      if (teacherBranchId && (!selectedBranch || selectedBranch === '')) {
        setSelectedBranch(String(teacherBranchId))
      } else if (mappedBranches.length === 1 && !selectedBranch) {
        setSelectedBranch(String(mappedBranches[0].id))
      }

      const matList = Array.isArray(matRes.data) ? matRes.data : matRes.data?.data || []
      setMatrices(matList)

      setTeachers(Array.isArray(tchrRes.data) ? tchrRes.data : tchrRes.data?.data || [])
      setRooms(Array.isArray(rmRes.data) ? rmRes.data : rmRes.data?.data || [])
      setSubjects(Array.isArray(subRes.data) ? subRes.data : subRes.data?.data || [])
      setMappings(Array.isArray(mapRes.data) ? mapRes.data : mapRes.data?.data || [])

      if (mappedClasses.length > 0) {
        const matchingClass = teacherBranchId 
          ? mappedClasses.find(c => String(c.branchId) === String(teacherBranchId)) 
          : mappedClasses[0]
        const fallbackClass = matchingClass || mappedClasses[0]
        setSelectedClass(fallbackClass.SCHL_BR_CLS_ID || fallbackClass.schl_br_cls_id || fallbackClass.id || '')
      }
    } catch (err) {
      toast.error('Failed to load lookup data')
    }
  }

  // Derive dynamic matrix, periods, and active week days based on selectedClass
  const currentClassObj = classes.find(c => String(c.SCHL_BR_CLS_ID || c.schl_br_cls_id || c.id) === String(selectedClass))
  const currentMatrix = matrices.find(m => String(m.SCHL_MAT_ID || m.schl_mat_id) === String(currentClassObj?.matrixId))
  
  const basePeriods = currentMatrix ? generatePeriodsFromMatrix(currentMatrix) : DEFAULT_PERIODS

  // Dynamically integrate any saved timetable slots into the periods so that EVERY class period has a row
  const activePeriods = useMemo(() => {
    const list = [...basePeriods]
    
    // Check all start times present in schedule
    schedule.forEach(s => {
      const sFrom = (s.SCHL_CLS_SCHDL_FRM_DT || s.schl_cls_schdl_frm_dt || '').substring(0, 5)
      const sTo = (s.SCHL_CLS_SCHDL_TO_DT || s.schl_cls_schdl_to_dt || '').substring(0, 5)
      if (!sFrom) return

      // See if this slot already matches any existing period exactly or by close overlap
      const matchesExisting = list.some(p => {
        const pFrom = p.time.split(' - ')[0]
        const pTo = p.time.split(' - ')[1]
        if (pFrom === sFrom) return true
        if (pFrom && pTo && sFrom >= pFrom && sFrom < pTo) return true
        return false
      })

      if (!matchesExisting) {
        list.push({
          id: `custom_${sFrom}`,
          time: sTo ? `${sFrom} - ${sTo}` : `${sFrom} - ${sFrom}`,
          label: `Period (${sFrom})`,
          isBreak: false
        })
      }
    })

    // Sort periods chronologically by start time
    list.sort((a, b) => {
      const aTime = a.time.split(' - ')[0] || '00:00'
      const bTime = b.time.split(' - ')[0] || '00:00'
      return aTime.localeCompare(bTime)
    })

    // Re-index non-break labels for clean display
    let pIdx = 1
    return list.map(p => {
      if (p.isBreak) return p
      return {
        ...p,
        label: String(p.id).startsWith('custom_') ? `Period ${pIdx++}` : (p.label || `Period ${pIdx++}`)
      }
    })
  }, [basePeriods, schedule])

  const activeDays = currentMatrix?.SCHL_WEEKOFDAY 
    ? currentMatrix.SCHL_WEEKOFDAY.split(',').map(d => d.trim()).filter(Boolean)
    : DEFAULT_DAYS

  async function loadSchedule(classId) {
    try {
      setLoading(true)
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/timetable/${classId}`)
      let data = Array.isArray(res.data) ? res.data : res.data?.data || []
      setSchedule(data)
    } catch (err) {
      toast.error('Failed to load schedule')
      setSchedule([])
    } finally {
      setLoading(false)
    }
  }

  function getSlotData(day, periodId) {
    const period = activePeriods.find(p => p.id === periodId)
    if (!period) return null
    const [pFrom, pTo] = period.time.split(' - ')
    
    // 1. Exact start-time match
    let found = schedule.find(s => {
      const sDay = s.SCHL_DAY_OF_WK || s.schl_day_of_wk
      const sFrom = (s.SCHL_CLS_SCHDL_FRM_DT || s.schl_cls_schdl_frm_dt || '').substring(0, 5)
      return sDay && sDay.toLowerCase() === day.toLowerCase() && sFrom === pFrom
    })

    // 2. Fallback: match by interval overlap if not found
    if (!found && pFrom && pTo) {
      found = schedule.find(s => {
        const sDay = s.SCHL_DAY_OF_WK || s.schl_day_of_wk
        const sFrom = (s.SCHL_CLS_SCHDL_FRM_DT || s.schl_cls_schdl_frm_dt || '').substring(0, 5)
        return sDay && sDay.toLowerCase() === day.toLowerCase() && sFrom >= pFrom && sFrom < pTo
      })
    }

    return found || null
  }

  function openEditModal(day, periodId) {
    if (isReadOnlyRole) return
    const period = activePeriods.find(p => p.id === periodId)
    const startTime = period.time.split(' - ')[0]
    const endTime = period.time.split(' - ')[1]
    
    const existing = getSlotData(day, periodId)
    
    setErrors({})
    setEditingSlot({ day, periodId, isNew: !existing })
    
    setFormData({
      SCHL_CLS_SCHLDL_ID: existing?.SCHL_CLS_SCHLDL_ID || existing?.schl_cls_schldl_id || '',
      SCHL_CLS_SCHLDL_SUB_ID: existing?.SCHL_CLS_SCHLDL_SUB_ID || existing?.schl_cls_schldl_sub_id || '',
      SCHL_BR_TCHR_ID: existing?.SCHL_BR_TCHR_ID || existing?.schl_br_tchr_id || '',
      SCHL_BR_RM_ID: existing?.SCHL_BR_RM_ID || existing?.schl_br_rm_id || '',
      SCHL_CLS_SCHDL_FRM_DT: startTime,
      SCHL_CLS_SCHDL_TO_DT: endTime,
      SCHL_DAY_OF_WK: day,
      SCHL_CLS_SCHLDL_SEC_SESS_ID: selectedClass
    })
    setIsModalOpen(true)
  }

  async function handleSaveSlot(e) {
    e.preventDefault()
    const errs = {}
    if (!formData.SCHL_CLS_SCHLDL_SUB_ID) errs.SCHL_CLS_SCHLDL_SUB_ID = 'Please select a subject.'
    if (!formData.SCHL_BR_TCHR_ID) errs.SCHL_BR_TCHR_ID = 'Please select a teacher.'
    if (!formData.SCHL_BR_RM_ID) errs.SCHL_BR_RM_ID = 'Please select a room.'
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    try {
      if (editingSlot.isNew) {
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/academic/timetable/entry`, formData)
        toast.success('Schedule entry created')
      } else {
        await axios.put(`${import.meta.env.VITE_API_BASE_URL}/academic/timetable/entry/${formData.SCHL_CLS_SCHLDL_ID}`, formData)
        toast.success('Schedule entry updated')
      }
      setIsModalOpen(false)
      loadSchedule(selectedClass)
      if (broadcastChange) {
        broadcastChange('routine', { classId: selectedClass })
        broadcastChange('timetable', { classId: selectedClass })
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update schedule')
    }
  }

  async function handleDeleteSlot() {
    if (!window.confirm('Are you sure you want to remove this slot?')) return
    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/academic/timetable/entry/${formData.SCHL_CLS_SCHLDL_ID}`)
      toast.success('Schedule entry deleted')
      setIsModalOpen(false)
      loadSchedule(selectedClass)
      if (broadcastChange) {
        broadcastChange('routine', { classId: selectedClass })
        broadcastChange('timetable', { classId: selectedClass })
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete schedule entry')
    }
  }

  const getTeacherName = (id) => {
    const t = teachers.find(t => String(t.BR_TCHR_ID || t.br_tchr_id || t.TCHR_ID || t.tchr_id || t.id) === String(id))
    return t ? (t.BR_TCHR_NM || t.br_tchr_nm || t.TCHR_NM || t.tchr_nm || t.name) : ''
  }

  // Teacher identification to filter or highlight assigned routines
  const currentTeacherId = useMemo(() => {
    if (!currentUser) return null
    const uid = String(currentUser.id || currentUser.user_id || '').toLowerCase()
    const uemail = String(currentUser.email || currentUser.user_email_id || '').toLowerCase()
    const uname = String(currentUser.name || currentUser.first_name || '').toLowerCase()
    
    // Find teacher record matching logged-in user
    const matched = teachers.find(t => {
      const tId = String(t.BR_TCHR_ID || t.br_tchr_id || t.TCHR_ID || t.tchr_id || t.id || '').toLowerCase()
      const tEmail = String(t.BR_TCHR_EMAI_ID || t.TCHR_EMAIL || t.email || '').toLowerCase()
      const tName = String(t.BR_TCHR_NM || t.br_tchr_nm || t.TCHR_NM || t.tchr_nm || t.name || '').toLowerCase()
      return (tId && tId === uid) || (tEmail && tEmail === uemail) || (uname && tName === uname)
    })
    return matched ? String(matched.BR_TCHR_ID || matched.br_tchr_id || matched.TCHR_ID || matched.tchr_id || matched.id) : null
  }, [currentUser, teachers])

  const isSlotAssignedToCurrentTeacher = useCallback((slot) => {
    if (!slot) return false
    const slotTchrId = String(slot.SCHL_BR_TCHR_ID || slot.schl_br_tchr_id || '')
    if (currentTeacherId && slotTchrId === String(currentTeacherId)) return true

    // Also match by teacher name / user name as fallback
    const tchrName = getTeacherName(slotTchrId).toLowerCase().trim()
    const curUserName = String(currentUser?.name || `${currentUser?.first_name || ''} ${currentUser?.last_name || ''}`).toLowerCase().trim()
    if (tchrName && curUserName && (tchrName === curUserName || curUserName.includes(tchrName) || tchrName.includes(curUserName))) {
      return true
    }
    return false
  }, [currentTeacherId, currentUser, teachers])

  const getSubjectName = (id) => {
    const s = subjects.find(s => String(s.BR_CLS_SUB_ID || s.br_cls_sub_id || s.SUB_ID || s.sub_id || s.id) === String(id))
    return s ? (s.BR_CLS_SUB_NAME || s.br_cls_sub_name || s.SUB_NM || s.sub_nm || s.name) : ''
  }
  
  const getRoomName = (id) => {
    const r = rooms.find(r => String(r.SCHL_BR_RM_ID || r.schl_br_rm_id || r.id) === String(id))
    return r ? (r.SCHL_BR_ROOM_DESC || r.schl_br_room_desc || r.name) : ''
  }

  return (
    <motion.div className="animate-fade-in" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Class Schedule</h1>
          <p className="page-subtitle">View and manage timetables</p>
        </div>
        <div className="flex gap-md items-center flex-wrap no-print">
          {isStudentOrParent ? (
            <div style={{ display: 'flex', gap: '16px', fontSize: '0.9rem' }}>
              <span style={{ padding: '6px 14px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', borderRadius: '20px', fontWeight: 600 }}>
                📍 Branch: {branches.find(b => String(b.id) === String(selectedBranch))?.name || 'Enrolled Campus'} (Locked)
              </span>
              <span style={{ padding: '6px 14px', background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', borderRadius: '20px', fontWeight: 600 }}>
                🎓 Class: {classes.find(c => String(c.SCHL_BR_CLS_ID || c.schl_br_cls_id || c.id) === String(selectedClass))?.SCHL_BR_CLASS_NM || 'Assigned Class'} (Locked)
              </span>
            </div>
          ) : (
            <>
              <label className="font-bold text-muted">Branch:</label>
              <select 
                className="form-control" 
                style={{ minWidth: '150px' }}
                value={selectedBranch} 
                onChange={(e) => { setSelectedBranch(e.target.value); setSelectedClass(''); }}
              >
                <option value="">-- All Branches --</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              
              <label className="font-bold text-muted ml-md">Class:</label>
              <select 
                className="form-control" 
                style={{ minWidth: '150px' }}
                value={selectedClass} 
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <option value="">-- Choose Class --</option>
                {classes.filter(c => selectedBranch ? String(c.branchId) === String(selectedBranch) : true).map(c => {
                  const cId = c.SCHL_BR_CLS_ID || c.schl_br_cls_id || c.id
                  const cName = c.SCHL_BR_CLASS_NM || c.schl_br_class_nm || c.name
                  return <option key={cId} value={cId}>{cName}</option>
                })}
              </select>
              {currentMatrix && (
                <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', padding: '6px 12px', fontSize: '0.85rem' }}>
                  ⚡ Matrix: {currentMatrix.SCHL_UNIQ_MATRIX_NM || currentMatrix.uniqueName} ({currentMatrix.SCHL_NO_OF_CLASS || currentMatrix.noOfClass || 6} periods @ {currentMatrix.SCHL_CLASS_DURATION || currentMatrix.duration || 45}m)
                </span>
              )}
              {isTeacher && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(0, 90, 158, 0.08)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(0, 90, 158, 0.2)' }}>
                  <button
                    type="button"
                    onClick={() => setTeacherFilterOnlyMine(prev => !prev)}
                    className={`btn btn-sm ${teacherFilterOnlyMine ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.82rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    title={teacherFilterOnlyMine ? 'Currently showing only your routine slots' : 'Currently showing entire class routine'}
                  >
                    {teacherFilterOnlyMine ? <FaUserCheck /> : <FaLayerGroup />}
                    {teacherFilterOnlyMine ? 'My Routine Only' : 'Show All Routine'}
                  </button>
                  <span style={{ fontSize: '0.78rem', color: '#005A9E', fontWeight: 600 }}>
                    {currentUser?.name || 'Teacher'}
                  </span>
                </div>
              )}
            </>
          )}

          <button type="button" className="btn-secondary" onClick={() => window.print()}>
            <FaPrint /> Print
          </button>
        </div>
      </div>

      {/* Print-only header with timetable metadata */}
      <div className="print-only print-report-title">Weekly Class Schedule</div>
      <div className="print-only print-report-subtitle">
        {classes.find(c => String(c.SCHL_BR_CLS_ID || c.schl_br_cls_id || c.id) === String(selectedClass))?.SCHL_BR_CLASS_NM || 'Class Schedule'}
      </div>
      <div className="print-only print-meta">
        <span><strong>Generated:</strong> {new Date().toLocaleString()}</span>
        <span><strong>Branch:</strong> {selectedBranch ? (branches.find(b => String(b.id) === String(selectedBranch))?.name || selectedBranch) : 'All Branches'}</span>
      </div>

      <div className="glass-panel page-card">
        {loading ? (
          <div className="text-center p-xl">Loading schedule...</div>
        ) : !selectedClass ? (
          <div className="text-center p-xl text-muted">Please select a class to view its schedule.</div>
        ) : (
          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table className="data-table timetable" style={{ minWidth: '800px' }}>
              <thead>
                <tr>
                  <th style={{ width: '130px' }}><FaClock className="inline-block mr-2" /> Time</th>
                  {activeDays.map(day => (
                    <th key={day} className="text-center">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activePeriods.map(period => (
                  <tr key={period.id} className={period.isBreak ? 'bg-muted/10' : ''}>
                    <td className="font-bold whitespace-nowrap">
                      <div>{period.label}</div>
                      <div className="text-small text-muted">{period.time}</div>
                    </td>
                    {activeDays.map(day => {
                      if (period.isBreak) {
                        return (
                          <td key={day} className="text-center text-muted font-bold tracking-widest bg-muted/5">
                            LUNCH BREAK
                          </td>
                        )
                      }
                      
                      const slot = getSlotData(day, period.id)
                      const isMine = slot ? isSlotAssignedToCurrentTeacher(slot) : false
                      
                      // If teacher has "My Routine Only" toggled ON, and slot is not theirs, hide it or show empty
                      const displaySlot = isTeacher && teacherFilterOnlyMine ? (isMine ? slot : null) : slot

                      const subName = displaySlot ? getSubjectName(displaySlot.SCHL_CLS_SCHLDL_SUB_ID || displaySlot.schl_cls_schldl_sub_id) : ''
                      const tchrName = displaySlot ? getTeacherName(displaySlot.SCHL_BR_TCHR_ID || displaySlot.schl_br_tchr_id) : ''
                      const rmName = displaySlot ? getRoomName(displaySlot.SCHL_BR_RM_ID || displaySlot.schl_br_rm_id) : ''
                      
                      return (
                        <td key={day} className={`relative group p-2 ${!isReadOnlyRole ? 'hover:bg-white/5 transition-colors cursor-pointer' : ''}`} onClick={() => !isReadOnlyRole && openEditModal(day, period.id)}>
                          <div className={`h-full w-full rounded p-2 flex flex-col justify-center items-center min-h-[80px] border transition-all ${
                            isMine
                              ? 'border-primary/50 bg-primary/10 shadow-sm' 
                              : !isReadOnlyRole ? 'border-transparent group-hover:border-primary/30' : 'border-transparent'
                          }`}>
                            {displaySlot ? (
                              <>
                                <div className="font-bold text-primary flex items-center gap-1">
                                  {isMine && <span title="Your Assigned Class" style={{ color: '#059669', fontSize: '0.8rem' }}>★</span>}
                                  {subName || 'Subject'}
                                </div>
                                {tchrName && <div className={`text-small ${isMine ? 'font-semibold text-primary' : ''}`}>{tchrName}</div>}
                                {rmName && <div className="text-small text-muted">{rmName}</div>}
                              </>
                            ) : (
                              <div className="text-muted text-small opacity-50">
                                {isReadOnlyRole ? '—' : '+ Assign'}
                              </div>
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && createPortal(
        <div className="modal-overlay">
          <motion.div
            className="glass-panel modal-container"
            style={{ maxWidth: '400px' }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="modal-header">
              <h2 className="modal-title">
                {editingSlot.isNew ? 'Assign Slot' : 'Edit Slot'} ({editingSlot?.day})
              </h2>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSaveSlot}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Teacher <span className="form-required">*</span></label>
                  <select
                    className={`form-control${errors.SCHL_BR_TCHR_ID ? ' form-input-error' : ''}`}
                    value={formData.SCHL_BR_TCHR_ID}
                    onChange={e => {
                      const newTchrId = e.target.value
                      setFormData(prev => {
                        // Check if current selected subject belongs to this new teacher's mappings
                        if (newTchrId) {
                          const teacherObj = teachers.find(t => String(t.BR_TCHR_ID || t.br_tchr_id || t.TCHR_ID || t.tchr_id || t.id) === String(newTchrId))
                          const teacherSubId = teacherObj?.subject_id || teacherObj?.subjectId || teacherObj?.TCHR_SUB_ID || ''
                          const tchrSubIds = (teacherObj?.subject_ids ? String(teacherObj.subject_ids).split(',') : []).map(s => s.trim())
                          const mappedSubIds = mappings
                            .filter(m => String(m.TCHR_ID || m.tchr_id) === String(newTchrId))
                            .map(m => String(m.TCHR_SUB_ID || m.tchr_sub_id || m.sub_id || m.id))
                          const allValidSubIds = new Set([...tchrSubIds, ...mappedSubIds, String(teacherSubId)].filter(Boolean))

                          // If currently selected subject is not mapped to this teacher, auto-select their first mapped subject or clear
                          const currentSubValid = prev.SCHL_CLS_SCHLDL_SUB_ID && allValidSubIds.has(String(prev.SCHL_CLS_SCHLDL_SUB_ID))
                          let nextSubId = prev.SCHL_CLS_SCHLDL_SUB_ID
                          if (!currentSubValid) {
                            // Find the first mapped subject for the current class
                            const firstMatch = subjects.find(s => {
                              const sId = String(s.BR_CLS_SUB_ID || s.br_cls_sub_id || s.SUB_ID || s.sub_id || s.id)
                              const clsId = s.BR_CLS_ID || s.br_cls_id || s.SCHL_BR_CLS_ID || s.schl_br_cls_id || s.class_id
                              const classMatches = !selectedClass || !clsId || String(clsId) === String(selectedClass)
                              return allValidSubIds.has(sId) && classMatches
                            })
                            nextSubId = firstMatch ? (firstMatch.BR_CLS_SUB_ID || firstMatch.br_cls_sub_id || firstMatch.SUB_ID || firstMatch.id) : (allValidSubIds.size === 1 ? Array.from(allValidSubIds)[0] : '')
                          }
                          return { ...prev, SCHL_BR_TCHR_ID: newTchrId, SCHL_CLS_SCHLDL_SUB_ID: nextSubId }
                        }
                        return { ...prev, SCHL_BR_TCHR_ID: newTchrId }
                      })
                    }}
                    required
                  >
                    <option value="">-- Select Teacher --</option>
                    {teachers.map(t => {
                      const tId = t.BR_TCHR_ID || t.br_tchr_id || t.TCHR_ID || t.tchr_id || t.id
                      const tName = t.BR_TCHR_NM || t.br_tchr_nm || t.TCHR_NM || t.tchr_nm || t.name
                      const cls = t.class_names || t.classNames || ''
                      const subs = t.subjects || ''
                      const mappedSubs = mappings
                        .filter(m => String(m.TCHR_ID || m.tchr_id) === String(tId))
                        .map(m => m.subject_name || m.BR_CLS_SUB_NAME)
                        .filter(Boolean)
                      const allSubNames = Array.from(new Set([...(subs ? subs.split(',').map(s => s.trim()) : []), ...mappedSubs])).join(', ')
                      const details = [cls ? `Class: ${cls}` : '', allSubNames ? `Sub: ${allSubNames}` : ''].filter(Boolean).join(' | ')

                      return <option key={tId} value={tId}>{tName}{details ? ` (${details})` : ''}</option>
                    })}
                  </select>
                  {errors.SCHL_BR_TCHR_ID && <span className="form-error-msg">{errors.SCHL_BR_TCHR_ID}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Subject <span className="form-required">*</span></label>
                  <select
                    className={`form-control${errors.SCHL_CLS_SCHLDL_SUB_ID ? ' form-input-error' : ''}`}
                    value={formData.SCHL_CLS_SCHLDL_SUB_ID}
                    onChange={e => {
                      const subId = e.target.value
                      setFormData(prev => ({
                        ...prev,
                        SCHL_CLS_SCHLDL_SUB_ID: subId
                      }))
                    }}
                    required
                  >
                    <option value="">-- Select Subject --</option>
                    {(() => {
                      // Filter subjects for the current selected class
                      const classSubjects = subjects.filter(s => {
                        if (!selectedClass) return true
                        const clsId = s.BR_CLS_ID || s.br_cls_id || s.SCHL_BR_CLS_ID || s.schl_br_cls_id || s.class_id
                        return !clsId || String(clsId) === String(selectedClass)
                      })
                      const baseList = classSubjects.length > 0 ? classSubjects : subjects

                      // When a teacher is selected, ONLY show subjects mapped to that teacher
                      if (formData.SCHL_BR_TCHR_ID) {
                        const selTchrId = String(formData.SCHL_BR_TCHR_ID)
                        const selTeacher = teachers.find(t => String(t.BR_TCHR_ID || t.br_tchr_id || t.TCHR_ID || t.tchr_id || t.id) === selTchrId)
                        const teacherSubId = selTeacher?.subject_id || selTeacher?.subjectId || selTeacher?.TCHR_SUB_ID || ''
                        const tchrSubIds = (selTeacher?.subject_ids ? String(selTeacher.subject_ids).split(',') : []).map(s => s.trim())
                        const mappedSubIds = mappings
                          .filter(m => String(m.TCHR_ID || m.tchr_id) === selTchrId)
                          .map(m => String(m.TCHR_SUB_ID || m.tchr_sub_id || m.sub_id || m.id))
                        const allowedSubIds = new Set([...tchrSubIds, ...mappedSubIds, String(teacherSubId)].filter(Boolean))

                        const teacherFiltered = baseList.filter(s => {
                          const sId = String(s.BR_CLS_SUB_ID || s.br_cls_sub_id || s.SUB_ID || s.sub_id || s.id)
                          return allowedSubIds.has(sId)
                        })

                        // If mapped subjects exist, display ONLY mapped subjects
                        const finalList = teacherFiltered.length > 0 ? teacherFiltered : baseList
                        return finalList.map(s => {
                          const sId = s.BR_CLS_SUB_ID || s.br_cls_sub_id || s.SUB_ID || s.sub_id || s.id
                          const sName = s.BR_CLS_SUB_NAME || s.br_cls_sub_name || s.SUB_NM || s.sub_nm || s.name
                          const cName = s.class_name || s.SCHL_BR_CLASS_NM || ''
                          return <option key={sId} value={sId}>{sName}{!selectedClass && cName ? ` (${cName})` : ''}</option>
                        })
                      }

                      return baseList.map(s => {
                        const sId = s.BR_CLS_SUB_ID || s.br_cls_sub_id || s.SUB_ID || s.sub_id || s.id
                        const sName = s.BR_CLS_SUB_NAME || s.br_cls_sub_name || s.SUB_NM || s.sub_nm || s.name
                        const cName = s.class_name || s.SCHL_BR_CLASS_NM || ''
                        return <option key={sId} value={sId}>{sName}{!selectedClass && cName ? ` (${cName})` : ''}</option>
                      })
                    })()}
                  </select>
                  {errors.SCHL_CLS_SCHLDL_SUB_ID && <span className="form-error-msg">{errors.SCHL_CLS_SCHLDL_SUB_ID}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Room <span className="form-required">*</span></label>
                  <select className={`form-control${errors.SCHL_BR_RM_ID ? ' form-input-error' : ''}`} value={formData.SCHL_BR_RM_ID} onChange={e => setFormData({...formData, SCHL_BR_RM_ID: e.target.value})} required>
                    <option value="">-- Select Room --</option>
                    {rooms.map(r => {
                      const rId = r.SCHL_BR_RM_ID || r.schl_br_rm_id || r.id;
                      const rName = r.SCHL_BR_ROOM_DESC || r.schl_br_room_desc || r.name;
                      return <option key={rId} value={rId}>{rName}</option>
                    })}
                  </select>
                  {errors.SCHL_BR_RM_ID && <span className="form-error-msg">{errors.SCHL_BR_RM_ID}</span>}
                </div>
              </div>
              <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                <div>
                  {!editingSlot.isNew && (
                    <button type="button" className="btn-secondary text-danger" onClick={handleDeleteSlot} style={{ color: 'var(--clr-danger)' }}>
                      <FaTrash style={{ marginRight: '6px' }}/> Remove Slot
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn-primary">Save Slot</button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}
    </motion.div>
  )
}
