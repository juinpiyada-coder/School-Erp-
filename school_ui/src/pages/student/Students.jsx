import axios from '../../lib/axios'
import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { FaSearch, FaCog, FaEdit, FaTrash, FaPlus, FaGraduationCap, FaExclamationTriangle, FaExclamationCircle, FaEye, FaEyeSlash, FaUpload, FaVenus, FaMars, FaCamera, FaTimes, FaUserCircle, FaIdCard, FaPrint, FaDownload } from 'react-icons/fa'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import usePagination from '../../hooks/usePagination'
import useSortableData from '../../hooks/useSortableData'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import ConfirmModal from '../../components/common/ConfirmModal'
import { ApiErrorState } from '../../components/common/ErrorBoundary'
import { scrollToFirstError } from '../../lib/formValidation'

const AVATAR_CLRS = ['avatar-blue', 'avatar-green', 'avatar-orange', 'avatar-purple', 'avatar-teal']

function initials(name) {
  if (!name) return 'UN'
  const parts = name.split(' ')
  return parts.slice(-2).map((w) => (w[0] || '')).join('').toUpperCase() || 'UN'
}

function normaliseStudent(s) {
  const totalDays = Number(s.total_days || 0)
  const presentDays = Number(s.present_days || 0)
  const attendancePct = totalDays > 0 
    ? Math.round((presentDays / totalDays) * 100) 
    : (s.attendance !== undefined && s.attendance !== null && s.attendance !== '' ? Number(s.attendance) : null)

  const classSessionId = s.STU_BR_CLASS_ID || s.class_session_id || s.session_id || ''
  const branchId = s.branch_id || s.branchId || s.SCHL_BR_CLASS_SEC_SESS_BR_ID || ''
  const gradeLabel = s.className 
    ? (s.sectionName ? `${s.className} - Sec ${s.sectionName}` : s.className)
    : (classSessionId || 'N/A')

  return {
    id: s.STU_ID || s.stu_id || s.id,
    name: s.STU_NM || s.stu_nm || s.name || 'Unknown',
    aadhar: s.STU_AADHAR || s.stu_aadhar || s.aadhar || '',
    rollNumber: s.STU_AADHAR || s.STU_ROLL_NO || s.stu_roll_no || s.rollNumber || 'N/A',
    dob: s.STU_DOB || s.stu_dob || s.dob || '',
    grade: gradeLabel,
    classId: s.class_id || '',
    classSessionId,
    branch_id: branchId,
    branchName: s.branchName || '',
    gender: s.STU_GENDER || s.gender || 'M',
    guardian: s.guardianName || s.PRNT_NM || (parentList.find(p => String(p.PRNT_ID || p.id) === String(s.STU_PRNT_ID))?.PRNT_NM) || s.STU_PRNT_ID || 'N/A',
    guardianName: s.guardianName || s.PRNT_NM || '',
    guardianPhone: s.guardianPhone || s.PRNT_CONTACTNO || '',
    guardianEmail: s.guardianEmail || s.PRNT_EMAILID || '',
    guardianRelation: s.STU_RELATION_WITH_GUARDIAN || s.relationWithGuardian || s.PRNT_RELATION || '',
    email: s.STU_EMAILID || s.stu_emailid || s.email || '',
    attendance: attendancePct,
    totalDays,
    presentDays,
    status: s.status || 'Active',
    userId: s.USER_ID || s.user_id || s.userId || '',
    user_img: s.user_img || s.USER_IMG || '',
    raw: s,
  }
}

function AttendanceBar({ pct, totalDays, presentDays }) {
  if (pct === null || pct === undefined || totalDays === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="badge" style={{ background: 'rgba(0, 90, 158, 0.08)', color: 'var(--clr-text-muted)', fontSize: '0.72rem' }}>
          No records yet
        </span>
      </div>
    )
  }

  const color = pct >= 90 ? '#107C10' : pct >= 75 ? '#C19C00' : '#A80000'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 110 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 6, background: 'rgba(0,0,0,0.08)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.5s ease' }} />
        </div>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color, minWidth: 32 }}>{pct}%</span>
      </div>
      {totalDays > 0 && (
        <span style={{ fontSize: '0.70rem', color: 'var(--clr-text-muted)' }}>
          {presentDays}/{totalDays} days attended
        </span>
      )}
    </div>
  )
}

const EMPTY_FORM = {
  name: '', aadhar: '', email: '', selectedClassId: '', classSessionId: '', branch_id: '',
  parentLinked: '', gender: 'M', dob: '', guardianRelation: '',
  status: 'Active', userId: '', password: '', user_img: ''
}

const STUDENT_FIELD_ORDER = [
  'name', 'aadhar', 'email', 'phone', 'state', 'district', 'pincode',
  'schoolId', 'branch_id', 'classSessionId', 'parentLinked', 'gender',
  'dob', 'userId', 'password'
]

export default function Students() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [branches, setBranches] = useState([])
  const [rawClasses, setRawClasses] = useState([])
  const [sessions, setSessions] = useState([])
  const [parents, setParents] = useState([])
  const [error, setError] = useState('')
  const [idCardStudent, setIdCardStudent] = useState(null)

  const printIdCardRef = useRef(null)

  const handleDownloadIdCard = () => {
    if (!printIdCardRef.current) return
    const content = printIdCardRef.current.innerHTML
    const printWindow = window.open('', '_blank', 'width=800,height=900')
    if (!printWindow) {
      alert('Please allow pop-ups to print or download the Student ID Card.')
      return
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Student ID Card - ${idCardStudent?.name || 'Student'}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            }
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 40px 20px;
              background: #f8fafc;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .id-card-wrapper {
              display: flex;
              gap: 30px;
              justify-content: center;
              flex-wrap: wrap;
            }
            @media print {
              body {
                background: white;
                padding: 0;
              }
              .no-print {
                display: none !important;
              }
            }
          </style>
        </head>
        <body>
          <div style="margin-bottom: 20px; text-align: center;" class="no-print">
            <h2 style="color: #005a9e; margin-bottom: 8px;">Official Student Identity Card</h2>
            <p style="color: #64748b; font-size: 14px;">Print directly or choose "Save as PDF" to download</p>
          </div>
          <div class="id-card-wrapper">
            ${content}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const currentUser = JSON.parse(sessionStorage.getItem('e_school_user') || '{}')
  const userRole = (currentUser.user_role || currentUser.role_id || currentUser.role || '').toLowerCase()
  const isBranchAdmin = userRole.includes('branch') && !userRole.includes('super')
  const defaultBranchId = isBranchAdmin ? (currentUser.branch_id || currentUser.userId || '') : ''

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const isSchoolAdmin = userRole.includes('school') && !userRole.includes('super')

      const [brRes, classRes, sessRes, stuRes, prntRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/branches`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/classes`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/sessions`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/student/students?limit=1000`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/student/parents?limit=1000`)
      ])
      
      let branchList = Array.isArray(brRes.data) ? brRes.data : brRes.data?.data || []
      let classList = Array.isArray(classRes.data) ? classRes.data : classRes.data?.data || []
      let sessList = Array.isArray(sessRes.data) ? sessRes.data : sessRes.data?.data || []
      let studentList = Array.isArray(stuRes.data) ? stuRes.data : stuRes.data?.data || []
      let parentList = Array.isArray(prntRes.data) ? prntRes.data : prntRes.data?.data || []
      
      if (isSchoolAdmin) {
          const centerId = String((currentUser.user_id || currentUser.id || ''))
          const filteredBranches = branchList.filter(b => String(b.SCHL_BR_CENTER_ID || b.schl_br_center_id) === centerId)
          if (filteredBranches.length > 0) {
              branchList = filteredBranches
              const validBranchIds = branchList.map(b => String(b.SCHL_BR_ID || b.schl_br_id || b.id))
              classList = classList.filter(c => validBranchIds.includes(String(c.SCHL_BR_CENT_ID || c.schl_br_cent_id || c.branchId)))
              sessList = sessList.filter(c => validBranchIds.includes(String(c.SCHL_BR_CLASS_SEC_SESS_BR_ID || c.schl_br_class_sec_sess_br_id || c.branchId)))
              const validSessIds = sessList.map(c => String(c.SCHL_BR_CLASS_SEC_SESS_ID || c.schl_br_class_sec_sess_id || c.id))
              studentList = studentList.filter(s => validSessIds.includes(String(s.STU_BR_CLASS_ID || s.stu_br_class_id || s.classId)))
          }
      } else if (isBranchAdmin) {
          const branchId = String((currentUser.user_id || currentUser.id || ''))
          const filteredBranches = branchList.filter(b => String(b.SCHL_BR_ID || b.schl_br_id || b.id) === branchId)
          if (filteredBranches.length > 0) {
              branchList = filteredBranches
              classList = classList.filter(c => String(c.SCHL_BR_CENT_ID || c.schl_br_cent_id || c.branchId) === branchId)
              sessList = sessList.filter(c => String(c.SCHL_BR_CLASS_SEC_SESS_BR_ID || c.schl_br_class_sec_sess_br_id || c.branchId) === branchId)
              const validSessIds = sessList.map(c => String(c.SCHL_BR_CLASS_SEC_SESS_ID || c.schl_br_class_sec_sess_id || c.id))
              studentList = studentList.filter(s => validSessIds.includes(String(s.STU_BR_CLASS_ID || s.stu_br_class_id || s.classId)))
          }
      }
      
      setBranches(branchList.map(b => ({
        id: b.SCHL_BR_ID || b.id,
        name: b.SCHL_BR_NM || b.name || 'Unknown'
      })))
      setRawClasses(classList.map(c => ({
        id: c.SCHL_BR_CLS_ID || c.schl_br_cls_id || c.id,
        name: c.SCHL_BR_CLASS_NM || c.schl_br_class_nm || c.name,
        branchId: c.SCHL_BR_CENT_ID || c.schl_br_cent_id || c.branchId
      })))
      setSessions(sessList.map(c => ({ 
        id: c.SCHL_BR_CLASS_SEC_SESS_ID || c.id, 
        classId: c.SCHL_BR_CLASS_SEC_SESS_CLASS || c.class_id || '',
        name: `${c.class_name || 'Class'} - Sec ${c.SCHL_BR_CLASS_SEC_SESS_SECT || 'A'} (${c.SCHL_BR_CLASS_SEC_SESS_SESS || 'Current'})`,
        branchId: c.SCHL_BR_CLASS_SEC_SESS_BR_ID || c.branch_id || c.branchId || '',
        section: c.SCHL_BR_CLASS_SEC_SESS_SECT || 'A',
        academicSession: c.SCHL_BR_CLASS_SEC_SESS_SESS || '2025-2026',
        className: c.class_name || ''
      })))
      setParents(parentList.map(p => ({
        id: p.PRNT_ID || p.prnt_id || p.id,
        name: p.PRNT_NM || p.prnt_nm || p.name || 'Unknown',
        phone: p.PRNT_CONTACTNO || p.PRNT_CONTACT_NO || p.phone || '',
        email: p.PRNT_EMAILID || p.PRNT_EMAIL || p.email || '',
        relation: p.PRNT_RELATION || p.relation || ''
      })))
      setStudents(studentList.map(s => {
        const matchedParent = parentList.find(p => String(p.PRNT_ID || p.id) === String(s.STU_PRNT_ID || s.guardianId))
        const enriched = {
          ...s,
          guardianName: s.guardianName || s.PRNT_NM || matchedParent?.name || matchedParent?.PRNT_NM || '',
          guardianPhone: s.guardianPhone || s.PRNT_CONTACTNO || matchedParent?.phone || matchedParent?.PRNT_CONTACTNO || '',
          guardianEmail: s.guardianEmail || s.PRNT_EMAILID || matchedParent?.email || matchedParent?.PRNT_EMAILID || '',
          guardianRelation: s.STU_RELATION_WITH_GUARDIAN || matchedParent?.relation || matchedParent?.PRNT_RELATION || ''
        }
        return normaliseStudent(enriched)
      }))
    } catch (err) {
      console.error(err)
      setError('Couldn\u2019t load the student roster. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [currentUser.id, currentUser.user_id, isBranchAdmin, userRole])

  useEffect(() => {
    loadData()
  }, [loadData])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({ ...EMPTY_FORM })
  const [showPassword, setShowPassword] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [errors, setErrors] = useState({})
  const fieldRefs = useRef({})
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const photoInputRef = useRef(null)

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, WebP, etc.)')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Image size must be less than 2MB')
      return
    }
    const reader = new FileReader()
    reader.onload = (event) => {
      setFormData(prev => ({ ...prev, user_img: event.target.result }))
    }
    reader.readAsDataURL(file)
  }

  const openModal = (s = null) => {
    if (s) {
      const parentMatch = parents.find(p => String(p.id) === String(s.raw?.STU_PRNT_ID || s.guardian))
      const sessionMatch = sessions.find(sess => String(sess.id) === String(s.classSessionId))

      setFormData({
        name: s.name || '',
        aadhar: s.aadhar || '',
        email: s.email || s.STU_EMAILID || '',
        selectedClassId: sessionMatch ? sessionMatch.classId : (s.classId || ''),
        classSessionId: s.classSessionId || '',
        branch_id: s.branch_id || defaultBranchId,
        parentLinked: parentMatch ? parentMatch.id : (s.raw?.STU_PRNT_ID || ''),
        gender: s.gender || 'M',
        dob: s.dob && s.dob !== 'Unknown' ? s.dob : '',
        guardianRelation: s.guardianRelation || (parentMatch ? parentMatch.relation : 'Guardian'),
        status: s.status || 'Active',
        userId: s.userId || s.raw?.USER_ID || s.raw?.user_id || '',
        password: '',
        user_img: s.user_img || s.raw?.USER_IMG || ''
      })
      setEditingId(s.id)
    } else {
      const defaultBranch = defaultBranchId || (branches.length > 0 ? (branches[0].id || branches[0].SCHL_BR_ID) : '')
      setFormData({
        ...EMPTY_FORM,
        branch_id: defaultBranch
      })
      setEditingId(null)
    }
    setErrors({})
    setShowPassword(false)
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {}
    if (!formData.name.trim()) errs.name = 'Full name is required.'
    else if (!/^[a-zA-Z\s]+$/.test(formData.name.trim())) errs.name = 'Name can only contain letters and spaces.'
    if (!formData.aadhar.trim()) errs.aadhar = 'Aadhar Number is required.'
    else if (!/^\d{12}$/.test(formData.aadhar.trim())) errs.aadhar = 'Aadhar number must be exactly 12 digits.'
    if (!isBranchAdmin && !formData.branch_id) errs.branch_id = 'Please select a branch.'
    if (!formData.classSessionId) errs.classSessionId = 'Please select a class session & section.'
    if (!formData.parentLinked) errs.parentLinked = 'Please select a guardian from the dropdown.'
    if (!formData.gender) errs.gender = 'Please select a gender.'
    if (!formData.dob) errs.dob = 'Date of birth is required.'
    else if (new Date(formData.dob) > new Date()) errs.dob = 'Date of birth cannot be in the future.'
    if (formData.userId && formData.userId.trim() && !editingId && !formData.password) {
      errs.password = 'Password is required when providing a Login ID.'
    }
    if (formData.password && formData.password.length < 6) {
      errs.password = 'Password must be at least 6 characters long'
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      scrollToFirstError(errs, fieldRefs.current, STUDENT_FIELD_ORDER)
      return
    }
    setErrors({})
    try {
      const payload = {
        STU_NM: formData.name.trim(),
        STU_AADHAR: formData.aadhar.trim(),
        STU_EMAILID: formData.email ? formData.email.trim().toLowerCase() : '',
        STU_DOB: formData.dob,
        STU_BR_CLASS_ID: formData.classSessionId,
        gender: formData.gender,
        relationWithGuardian: formData.guardianRelation,
        STU_PRNT_ID: formData.parentLinked,
        status: formData.status || 'Active',
        USER_ID: formData.userId ? formData.userId.trim() : '',
        PASSWORD: formData.password,
        user_img: formData.user_img || ''
      };

      if (editingId) {
        await axios.put(`${import.meta.env.VITE_API_BASE_URL}/student/students/${editingId}`, payload);
      } else {
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/student/students`, payload);
      }
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ ...EMPTY_FORM });
      await loadData();
    } catch (err) {
      console.error('Save failed:', err);
      alert('Save failed: ' + (err.response?.data?.message || err.message));
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/student/students/${deleteTarget.id}`);
      setStudents(students.filter(s => s.id !== deleteTarget.id));
      setDeleteTarget(null)
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Delete failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setDeleting(false)
    }
  }

  const debouncedSearch = useDebouncedValue(search, 300)
  const filtered = students.filter((s) =>
    `${s.name} ${s.aadhar || ''} ${s.grade || s.class_id} ${s.guardian || ''} ${s.userId || ''}`.toLowerCase().includes(debouncedSearch.toLowerCase())
  )

  const { sortedItems: sortedStudents, sortConfig, requestSort } = useSortableData(filtered)

  const pagination = usePagination(sortedStudents, 10)

  const columns = [
    {
      label: 'Student',
      sortKey: 'name',
      exportKey: 'name',
      render: (s, i) => (
        <div className="filter-row">
          {s.user_img ? (
            <div className="avatar avatar-md" style={{ overflow: 'hidden', padding: 0, border: '2px solid var(--clr-primary)' }}>
              <img src={s.user_img} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ) : (
            <div className={`avatar avatar-md ${AVATAR_CLRS[i % AVATAR_CLRS.length]}`}>
              {initials(s.name)}
            </div>
          )}
          <div>
            <div className="font-bold" style={{ fontSize: '0.875rem' }}>{s.name}</div>
            <div className="text-muted">DOB: {s.dob}</div>
            {s.aadhar && <div className="text-muted" style={{ fontSize: '0.78rem' }}>Aadhar: {s.aadhar}</div>}
            {s.userId && (
              <div style={{ fontSize: '0.72rem', color: 'var(--clr-accent)', fontFamily: 'monospace', marginTop: 2 }}>
                Login: <strong>{s.userId}</strong>
              </div>
            )}
          </div>
        </div>
      ),
    },
    { label: 'Class & Section', sortKey: 'grade', exportKey: 'grade', style: { minWidth: 140 } },
    {
      label: 'Gender',
      sortKey: 'gender',
      exportKey: 'gender',
      render: (s) => (
        <span className={`badge ${s.gender === 'F' ? 'badge-info' : 'badge-success'}`}>
          {s.gender === 'F' ? <><FaVenus /> Female</> : <><FaMars /> Male</>}
        </span>
      ),
    },
    { 
      label: 'Guardian', 
      sortKey: 'guardian', 
      exportKey: 'guardian',
      render: (s) => (
        <div>
          <div className="font-bold">{s.guardianName || s.guardian || 'N/A'}</div>
          {s.guardianPhone && <div className="text-muted" style={{ fontSize: '0.78rem' }}>📞 {s.guardianPhone}</div>}
          {s.guardianRelation && <div className="text-muted" style={{ fontSize: '0.75rem', color: 'var(--clr-accent)' }}>({s.guardianRelation})</div>}
        </div>
      )
    },
    {
      label: 'Attendance',
      sortKey: 'attendance',
      exportKey: 'attendance',
      render: (s) => (
        <AttendanceBar 
          pct={s.attendance} 
          totalDays={s.totalDays} 
          presentDays={s.presentDays} 
        />
      ),
    },
    {
      label: 'Status',
      sortKey: 'status',
      exportKey: 'status',
      render: (s) => (
        <span className={`badge ${s.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>
          {s.status || 'Active'}
        </span>
      ),
    },
  ]

  const actions = [
    { label: 'ID Card', icon: <FaIdCard />, ariaLabel: (s) => `Generate ID Card for ${s.name}`, onClick: (s) => setIdCardStudent(s) },
    { label: 'Edit', icon: <FaEdit />, ariaLabel: (s) => `Edit ${s.name}`, onClick: (s) => openModal(s) },
    { label: 'Delete', icon: <FaTrash />, ariaLabel: (s) => `Delete ${s.name}`, onClick: (s) => setDeleteTarget(s) },
  ]

  if (error && students.length === 0) {
    return <ApiErrorState message={error} onRetry={loadData} />
  }

  return (
    <motion.div className="animate-fade-in" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-subtitle">{loading ? 'Loading...' : `${students.length} students enrolled across grades`}</p>
        </div>
        <div className="flex gap-md">
          <button id="import-students-btn" className="btn-secondary"><FaUpload /> Import</button>
          <button id="add-student-btn" className="btn-primary" onClick={() => openModal()}><FaPlus /> Enrol Student</button>
        </div>
      </div>

      {/* Metric Row */}
      <div className="metrics-grid">
        <div className="glass-panel metric-card animate-fade-in-up">
          <div className="metric-icon-wrap metric-icon-blue"><FaGraduationCap /></div>
          <div className="metric-label">Total Enrolled</div>
          <div className="metric-value">{loading ? '-' : students.length}</div>
        </div>
        <div className="glass-panel metric-card animate-fade-in-up">
          <div className="metric-icon-wrap metric-icon-green"><FaVenus /></div>
          <div className="metric-label">Female</div>
          <div className="metric-value">{loading ? '-' : students.filter(s => s.gender === 'F').length}</div>
        </div>
        <div className="glass-panel metric-card animate-fade-in-up">
          <div className="metric-icon-wrap metric-icon-blue"><FaMars /></div>
          <div className="metric-label">Male</div>
          <div className="metric-value">{loading ? '-' : students.filter(s => s.gender === 'M').length}</div>
        </div>
        <div className="glass-panel metric-card animate-fade-in-up">
          <div className="metric-icon-wrap metric-icon-red"><FaExclamationTriangle /></div>
          <div className="metric-label">Attendance Below 75%</div>
          <div className="metric-value">{loading ? '-' : students.filter(s => (s.attendance || 100) < 75).length}</div>
          <span className="metric-delta metric-delta-down">Needs follow-up</span>
        </div>
      </div>

      {/* Search */}
      <div className="glass-panel page-card">
        <div className="flex items-center gap-md" style={{ marginBottom: 0 }}>
          <div className="header-search">
            <span className="header-search-icon"><FaSearch /></span>
            <input
              id="students-search"
              className="header-search-input"
              type="search"
              placeholder="Search by student name, Aadhar, grade, or guardian…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search students"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        rows={pagination.pageItems}
        loading={loading}
        search={search}
        onClearSearch={() => setSearch('')}
        emptyTitle="No students found"
        emptySubtitle="Get started by enrolling your first student."
        emptyCtaLabel="Enrol Student"
        onEmptyCta={() => openModal()}
        emptyIcon={FaGraduationCap}
        exportFilename="students.csv"
        exportColumnMap={{ Name: 'name', Aadhar: 'aadhar', 'Roll No': 'rollNumber', Grade: 'grade', Gender: 'gender', Guardian: 'guardian', Attendance: 'attendance', Status: 'status' }}
        itemLabel="students"
        actions={actions}
        pagination={pagination}
        sortConfig={sortConfig}
        requestSort={requestSort}
      />

      {/* Add/Edit Student Modal */}
      <Modal
        isOpen={isModalOpen}
        title={editingId ? 'Edit Student' : 'Enrol New Student'}
        subtitle={editingId ? 'Update student and guardian information' : 'Fill in all details below'}
        onClose={() => { setIsModalOpen(false); setEditingId(null); }}
        size="lg"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => { setIsModalOpen(false); setEditingId(null); }}>Cancel</button>
            <button type="submit" form="student-form" className="btn-primary">{editingId ? 'Update Student' : 'Enrol Student'}</button>
          </>
        }
      >
        <form id="student-form" onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-md)' }}>

            {/* ── Student Details ── */}
            <div style={{ borderBottom: '1px solid rgba(0,90,158,0.1)', paddingBottom: 6 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--clr-accent)' }}>Student Details</span>
            </div>

            {/* Photo Upload Section */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', background: 'rgba(0, 90, 158, 0.04)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0, 90, 158, 0.1)' }}>
              <div style={{ position: 'relative' }}>
                {formData.user_img ? (
                  <img
                    src={formData.user_img}
                    alt="Student Preview"
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid var(--clr-primary)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'rgba(0, 90, 158, 0.08)',
                    color: 'var(--clr-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.8rem',
                    border: '2px solid rgba(0, 90, 158, 0.2)'
                  }}>
                    <FaUserCircle />
                  </div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '2px' }}>
                  Student Photo
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--clr-text-muted)', marginBottom: '8px' }}>
                  Photo saved in user login master (Max 2MB: PNG, JPG, WebP)
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="file"
                    ref={photoInputRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handlePhotoUpload}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                    onClick={() => photoInputRef.current?.click()}
                  >
                    <FaCamera style={{ marginRight: '5px' }} /> {formData.user_img ? 'Change Photo' : 'Upload Photo'}
                  </button>
                  {formData.user_img && (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.78rem', color: 'var(--clr-danger)' }}
                      onClick={() => setFormData(prev => ({ ...prev, user_img: '' }))}
                    >
                      <FaTimes style={{ marginRight: '4px' }} /> Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="form-row-2col">
              <div className="form-group">
                <label className="form-label">Full Name <span className="form-required">*</span></label>
                <input type="text" ref={(el) => (fieldRefs.current.name = el)} className={`form-input${errors.name ? ' form-input-error' : ''}`} placeholder="e.g. Rohan Sharma" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value.replace(/[^a-zA-Z\s]/g, '') })} required />
                {errors.name && <span className="form-error-msg"><FaExclamationCircle /> {errors.name}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Aadhar Card Number (12 Digits) <span className="form-required">*</span></label>
                <input 
                  type="text" 
                  inputMode="numeric"
                  maxLength={12}
                  ref={(el) => (fieldRefs.current.aadhar = el)} 
                  className={`form-input${errors.aadhar ? ' form-input-error' : ''}`} 
                  placeholder="e.g. 123456789012" 
                  value={formData.aadhar} 
                  onChange={(e) => setFormData({ ...formData, aadhar: e.target.value.replace(/[^0-9]/g, '').slice(0, 12) })} 
                  required 
                />
                {errors.aadhar && <span className="form-error-msg"><FaExclamationCircle /> {errors.aadhar}</span>}
              </div>
            </div>

            {!isBranchAdmin && (
              <div className="form-group">
                <label className="form-label">Branch <span className="form-required">*</span></label>
                <select
                  ref={(el) => (fieldRefs.current.branch_id = el)}
                  className={`form-input${errors.branch_id ? ' form-input-error' : ''}`}
                  value={formData.branch_id}
                  onChange={(e) => {
                    const bId = e.target.value
                    setFormData(prev => ({ ...prev, branch_id: bId, selectedClassId: '', classSessionId: '' }))
                  }}
                  required
                >
                  <option value="" disabled>Select Branch</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                {errors.branch_id && <span className="form-error-msg"><FaExclamationCircle /> {errors.branch_id}</span>}
              </div>
            )}

            {/* ── Cascading Class -> Section & Session ── */}
            <div className="form-row-2col">
              <div className="form-group">
                <label className="form-label">Select Class <span className="form-required">*</span></label>
                <select
                  className="form-input"
                  value={formData.selectedClassId}
                  onChange={(e) => {
                    const clsId = e.target.value
                    setFormData(prev => ({ ...prev, selectedClassId: clsId, classSessionId: '' }))
                  }}
                  required
                >
                  <option value="">-- Choose Class --</option>
                  {rawClasses
                    .filter(c => !formData.branch_id || String(c.branchId) === String(formData.branch_id))
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Assign Section &amp; Academic Session <span className="form-required">*</span></label>
                <select
                  ref={(el) => (fieldRefs.current.classSessionId = el)}
                  className={`form-input${errors.classSessionId ? ' form-input-error' : ''}`}
                  value={formData.classSessionId}
                  onChange={(e) => setFormData({ ...formData, classSessionId: e.target.value })}
                  required
                >
                  <option value="">-- Choose Section &amp; Session --</option>
                  {sessions
                    .filter(sess => !formData.selectedClassId || String(sess.classId) === String(formData.selectedClassId))
                    .map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
                {errors.classSessionId && <span className="form-error-msg"><FaExclamationCircle /> {errors.classSessionId}</span>}
              </div>
            </div>

            <div className="form-row-2col">
              <div className="form-group">
                <label className="form-label">Gender <span className="form-required">*</span></label>
                <select ref={(el) => (fieldRefs.current.gender = el)} className={`form-input${errors.gender ? ' form-input-error' : ''}`} value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} required>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="Other">Other</option>
                </select>
                {errors.gender && <span className="form-error-msg"><FaExclamationCircle /> {errors.gender}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Date of Birth <span className="form-required">*</span></label>
                <input type="date" ref={(el) => (fieldRefs.current.dob = el)} className={`form-input${errors.dob ? ' form-input-error' : ''}`} value={formData.dob} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} required />
                {errors.dob && <span className="form-error-msg"><FaExclamationCircle /> {errors.dob}</span>}
              </div>
            </div>

            <div className="form-row-2col">
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="e.g. student@example.com"
                  value={formData.email}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      email: val,
                      userId: (!editingId || prev.userId === prev.email?.trim().toLowerCase() || !prev.userId) ? val.trim().toLowerCase() : prev.userId
                    }));
                  }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">User ID (Login)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. student@example.com"
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row-2col">
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                {editingId ? 'Password (leave blank to keep unchanged)' : 'Password'}
                {!editingId && <span className="form-hint" style={{ marginLeft: 6, fontSize: '0.75rem', color: 'var(--clr-text-muted)' }}>(min 6 chars)</span>}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  ref={(el) => (fieldRefs.current.password = el)}
                  className={`form-input${errors.password ? ' form-input-error' : ''}`}
                  placeholder={editingId ? '•••••••• (leave blank to keep current)' : 'Enter login password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--clr-text-muted)',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex="-1"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {errors.password && <span className="form-error-msg"><FaExclamationCircle /> {errors.password}</span>}
            </div>

            {/* ── Guardian Link Selection (No Duplicate Entry) ── */}
            <div style={{ borderBottom: '1px solid rgba(0,90,158,0.1)', paddingBottom: 6, marginTop: 8 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--clr-accent)' }}>Guardian Association</span>
            </div>

            <div className="form-row-2col">
              <div className="form-group">
                <label className="form-label">Select Guardian <span className="form-required">*</span></label>
                <select
                  ref={(el) => (fieldRefs.current.parentLinked = el)}
                  className={`form-input${errors.parentLinked ? ' form-input-error' : ''}`}
                  value={formData.parentLinked || ''}
                  onChange={(e) => {
                    const pId = e.target.value
                    const found = parents.find(p => String(p.id) === String(pId))
                    setFormData(prev => ({
                      ...prev,
                      parentLinked: pId,
                      guardianRelation: prev.guardianRelation || (found ? found.relation : '')
                    }))
                  }}
                  required
                >
                  <option value="">-- Select Registered Guardian --</option>
                  {parents.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.phone ? `(${p.phone})` : ''}
                    </option>
                  ))}
                </select>
                {errors.parentLinked && <span className="form-error-msg"><FaExclamationCircle /> {errors.parentLinked}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Relationship to Student <span className="form-required">*</span></label>
                <select
                  className="form-input"
                  value={formData.guardianRelation}
                  onChange={(e) => setFormData({ ...formData, guardianRelation: e.target.value })}
                  required
                >
                  <option value="">Select Relation</option>
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Brother">Brother</option>
                  <option value="Sister">Sister</option>
                  <option value="Grandfather">Grandfather</option>
                  <option value="Grandmother">Grandmother</option>
                  <option value="Uncle">Uncle</option>
                  <option value="Aunt">Aunt</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete student?"
        message={deleteTarget ? `Remove ${deleteTarget.name} from the roster? This cannot be undone.` : ''}
        confirmLabel="Delete"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* ── Student ID Card Modal ── */}
      {idCardStudent && (() => {
        const studentBranch = branches.find(b => String(b.id) === String(idCardStudent.branch_id || idCardStudent.raw?.branch_id || idCardStudent.raw?.SCHL_BR_CLASS_SEC_SESS_BR_ID))
        const branchName = studentBranch ? studentBranch.name : (idCardStudent.branchName || 'Main Campus')

        const studentSession = sessions.find(sess => String(sess.id) === String(idCardStudent.classSessionId || idCardStudent.raw?.STU_BR_CLASS_ID))
        const sessionYear = studentSession?.academicSession || idCardStudent.raw?.session_name || '2025-2026'
        const sectionName = studentSession?.section || idCardStudent.raw?.sectionName || 'A'
        const fullClassName = idCardStudent.grade || (studentSession?.className ? `${studentSession.className} - Sec ${sectionName}` : 'Standard Class')

        return (
          <Modal
            isOpen={!!idCardStudent}
            title="Student Identity Card"
            subtitle={`Official identity credential for ${idCardStudent.name}`}
            onClose={() => setIdCardStudent(null)}
            size="md"
            footer={
              <>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIdCardStudent(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleDownloadIdCard}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <FaDownload /> Download / Print ID Card
                </button>
              </>
            }
          >
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '16px' }}>
              <p style={{ fontSize: '0.82rem', color: 'var(--clr-text-muted)', textAlign: 'center', margin: 0 }}>
                This card auto-fetches the student&apos;s assigned <strong>Branch</strong>, <strong>Academic Session</strong>, photo, and roll details. Click below to print or download as PDF.
              </p>

              {/* ID Card Printable Canvas */}
              <div ref={printIdCardRef} style={{ width: '100%', maxWidth: '340px' }}>
                <div
                  style={{
                    width: '320px',
                    margin: '0 auto',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    background: '#ffffff',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    border: '1px solid #e2e8f0',
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
                  }}
                >
                  {/* Card Header */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #005a9e 0%, #0078d4 100%)',
                      color: '#ffffff',
                      padding: '16px 14px 12px',
                      textAlign: 'center',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '2px' }}>
                      <span style={{ fontSize: '18px' }}>🎓</span>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        E-SCHOOL ACADEMY
                      </h3>
                    </div>
                    <div style={{ fontSize: '11px', opacity: 0.95, fontWeight: 600, letterSpacing: '0.02em', color: '#e0f2fe' }}>
                      {branchName}
                    </div>
                    <div
                      style={{
                        display: 'inline-block',
                        marginTop: '6px',
                        padding: '2px 10px',
                        borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.22)',
                        fontSize: '10px',
                        fontWeight: 700,
                        letterSpacing: '0.05em'
                      }}
                    >
                      SESSION: {sessionYear}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div style={{ padding: '16px 20px', textAlign: 'center' }}>
                    {/* Student Photo */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                      {idCardStudent.user_img ? (
                        <img
                          src={idCardStudent.user_img}
                          alt={idCardStudent.name}
                          style={{
                            width: '84px',
                            height: '84px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '3px solid #005a9e',
                            boxShadow: '0 4px 10px rgba(0,90,158,0.2)'
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '84px',
                            height: '84px',
                            borderRadius: '50%',
                            background: '#eff6ff',
                            color: '#005a9e',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '44px',
                            border: '3px solid #005a9e'
                          }}
                        >
                          👤
                        </div>
                      )}
                    </div>

                    {/* Student Name & Roll */}
                    <h4 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                      {idCardStudent.name}
                    </h4>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#005a9e', textTransform: 'uppercase', marginBottom: '14px', letterSpacing: '0.05em' }}>
                      STUDENT ID: {String(idCardStudent.id).startsWith('STU_') ? idCardStudent.id : `STU-${idCardStudent.id}`}
                    </div>

                    {/* Metadata Table */}
                    <div
                      style={{
                        background: '#f8fafc',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        border: '1px solid #e2e8f0',
                        fontSize: '11px',
                        textAlign: 'left',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b', fontWeight: 600 }}>Class & Sec:</span>
                        <span style={{ fontWeight: 700, color: '#1e293b' }}>{fullClassName}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b', fontWeight: 600 }}>Roll Number:</span>
                        <span style={{ fontWeight: 700, color: '#1e293b' }}>{idCardStudent.rollNumber || 'N/A'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b', fontWeight: 600 }}>Date of Birth:</span>
                        <span style={{ fontWeight: 700, color: '#1e293b' }}>{idCardStudent.dob || 'N/A'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b', fontWeight: 600 }}>Guardian:</span>
                        <span style={{ fontWeight: 700, color: '#1e293b' }}>{idCardStudent.guardian || 'N/A'}</span>
                      </div>
                      {idCardStudent.guardianPhone && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b', fontWeight: 600 }}>Emergency Contact:</span>
                          <span style={{ fontWeight: 700, color: '#1e293b' }}>{idCardStudent.guardianPhone}</span>
                        </div>
                      )}
                    </div>

                    {/* Barcode representation */}
                    <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1', textAlign: 'center' }}>
                      <div style={{ letterSpacing: '4px', fontFamily: 'monospace', fontWeight: 700, fontSize: '11px', color: '#334155' }}>
                        ||||| |||| |||||| ||||| ||||
                      </div>
                      <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px' }}>
                        AUTHORIZED STUDENT IDENTITY CARD
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Modal>
        )
      })()}
    </motion.div>
  )
}
