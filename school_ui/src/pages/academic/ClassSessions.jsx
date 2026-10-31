import axios from '../../lib/axios'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FaSearch, FaCog, FaEdit, FaTrash, FaPlus } from 'react-icons/fa'
import { toast } from 'react-toastify'
import { ACADEMIC_SESSIONS } from '../../lib/indiaData'

function normaliseSession(s, classList = [], branchList = []) {
  const cId = s.SCHL_BR_CLASS_SEC_SESS_CLASS || s.schl_br_class_sec_sess_class || s.classId || s.class_id;
  const bId = s.SCHL_BR_CLASS_SEC_SESS_BR_ID || s.schl_br_class_sec_sess_br_id || s.branchId || s.branch_id;

  let cName = s.class_name || s.SCHL_BR_CLASS_NM || s.schl_br_class_nm;
  if (!cName && cId && Array.isArray(classList)) {
    const cls = classList.find(c => String(c.SCHL_BR_CLS_ID || c.schl_br_cls_id) === String(cId));
    if (cls) cName = cls.SCHL_BR_CLASS_NM || cls.schl_br_class_nm;
  }

  let bName = s.branch_name || s.SCHL_BR_NM || s.schl_br_nm;
  if (!bName && bId && Array.isArray(branchList)) {
    const br = branchList.find(b => String(b.SCHL_BR_ID || b.schl_br_id) === String(bId));
    if (br) bName = br.SCHL_BR_NM || br.schl_br_nm;
  }

  return {
    id: s.SCHL_BR_CLASS_SEC_SESS_ID || s.schl_br_class_sec_sess_id || s.id,
    classId: cId,
    className: cName || 'Unknown Class',
    section: s.SCHL_BR_CLASS_SEC_SESS_SECT || s.schl_br_class_sec_sess_sect || '',
    sessionYr: s.SCHL_BR_CLASS_SEC_SESS_SESS || s.schl_br_class_sec_sess_sess || '',
    branchId: bId,
    branchName: bName || 'Unknown Branch',
    raw: s
  }
}

export default function ClassSessions() {
  const [sessions, setSessions] = useState([])
  const [classes, setClasses] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSession, setEditingSession] = useState(null)
  const [errors, setErrors] = useState({})

  const currentUser = JSON.parse(sessionStorage.getItem('e_school_user') || '{}')
  const userRole = (currentUser.user_role || currentUser.role_id || currentUser.role || '').toLowerCase()
  const isBranchAdmin = userRole.includes('branch') && !userRole.includes('super')
  
  const [formData, setFormData] = useState({
    SCHL_BR_CLASS_SEC_SESS_ID: '',
    SCHL_BR_CLASS_SEC_SESS_CLASS: '',
    SCHL_BR_CLASS_SEC_SESS_SECT: '',
    SCHL_BR_CLASS_SEC_SESS_SESS: '2024-2025',
    SCHL_BR_CLASS_SEC_SESS_BR_ID: currentUser.branch_id || currentUser.userId || ''
  })

  useEffect(() => {
    fetchData()
  }, [page])

  async function fetchData() {
    setLoading(true)
    try {
      const [sessRes, classRes, branchRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/sessions?page=${page}&limit=1000`).catch(() => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/classes`).catch(() => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/branches`).catch(() => ({ data: [] }))
      ])
      
      let sessData = Array.isArray(sessRes.data) ? sessRes.data : sessRes.data?.data || []
      let classData = Array.isArray(classRes.data) ? classRes.data : classRes.data?.data || []
      let branchData = Array.isArray(branchRes.data) ? branchRes.data : branchRes.data?.data || []

      const user = JSON.parse(sessionStorage.getItem('e_school_user') || '{}')
      const isSchoolAdmin = (user.user_role || user.role_id) === 'R_SCHOOLADMIN' || user.role === 'R_SCHOOLADMIN'
      const isBranchAdminRole = (user.user_role || user.role_id) === 'R_BRANCHADMIN' || user.role === 'R_BRANCHADMIN'

      if (isSchoolAdmin) {
         const centerId = String(user.user_id || user.id || user.userId || '')
         branchData = branchData.filter(b => String(b.SCHL_BR_CENTER_ID || b.schl_br_center_id) === centerId)
         const validBranchIds = branchData.map(b => String(b.SCHL_BR_ID || b.schl_br_id))
         
         classData = classData.filter(c => validBranchIds.includes(String(c.SCHL_BR_CENT_ID || c.schl_br_cent_id || c.branchId)))
         sessData = sessData.filter(s => validBranchIds.includes(String(s.SCHL_BR_CLASS_SEC_SESS_BR_ID || s.schl_br_class_sec_sess_br_id || s.branchId)))
      } else if (isBranchAdminRole) {
         const branchId = String(user.user_id || user.id || user.userId || '')
         branchData = branchData.filter(b => String(b.SCHL_BR_ID || b.schl_br_id) === branchId)
         
         classData = classData.filter(c => String(c.SCHL_BR_CENT_ID || c.schl_br_cent_id || c.branchId) === branchId)
         sessData = sessData.filter(s => String(s.SCHL_BR_CLASS_SEC_SESS_BR_ID || s.schl_br_class_sec_sess_br_id || s.branchId) === branchId)
      }

      setSessions(sessData.map(s => normaliseSession(s, classData, branchData)))
      if (sessRes.data?.pagination) setTotalPages(sessRes.data.pagination.totalPages)
      
      setClasses(classData)
      setBranches(branchData)
    } catch (err) {
      toast.error('Failed to load data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function openModal(session = null) {
    setErrors({})
    const defaultBranchId = isBranchAdmin 
      ? (currentUser.branch_id || currentUser.userId || '')
      : (branches.length === 1 ? (branches[0].SCHL_BR_ID || branches[0].schl_br_id || '') : '')

    if (session) {
      setEditingSession(session)
      setFormData({
        SCHL_BR_CLASS_SEC_SESS_ID: session.id,
        SCHL_BR_CLASS_SEC_SESS_CLASS: session.classId,
        SCHL_BR_CLASS_SEC_SESS_SECT: session.section,
        SCHL_BR_CLASS_SEC_SESS_SESS: session.sessionYr || '2024-2025',
        SCHL_BR_CLASS_SEC_SESS_BR_ID: session.branchId || defaultBranchId
      })
    } else {
      setEditingSession(null)
      setFormData({
        SCHL_BR_CLASS_SEC_SESS_ID: '',
        SCHL_BR_CLASS_SEC_SESS_CLASS: '',
        SCHL_BR_CLASS_SEC_SESS_SECT: '',
        SCHL_BR_CLASS_SEC_SESS_SESS: '2024-2025',
        SCHL_BR_CLASS_SEC_SESS_BR_ID: defaultBranchId
      })
    }
    setIsModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = {}
    if (!isBranchAdmin && !formData.SCHL_BR_CLASS_SEC_SESS_BR_ID) errs.SCHL_BR_CLASS_SEC_SESS_BR_ID = 'Please select a branch.'
    if (!formData.SCHL_BR_CLASS_SEC_SESS_CLASS) errs.SCHL_BR_CLASS_SEC_SESS_CLASS = 'Please select a class.'
    if (!formData.SCHL_BR_CLASS_SEC_SESS_SECT.trim()) errs.SCHL_BR_CLASS_SEC_SESS_SECT = 'Section is required.'
    else if (!/^[A-Za-z0-9]$/.test(formData.SCHL_BR_CLASS_SEC_SESS_SECT.trim())) errs.SCHL_BR_CLASS_SEC_SESS_SECT = 'Section must be a single letter or a single digit (e.g. A, B, C or 1, 2, 3).'
    if (!formData.SCHL_BR_CLASS_SEC_SESS_SESS) errs.SCHL_BR_CLASS_SEC_SESS_SESS = 'Academic session is required.'
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    try {
      if (editingSession) {
        await axios.put(`${import.meta.env.VITE_API_BASE_URL}/academic/sessions/${editingSession.id}`, formData)
        toast.success('Session updated successfully')
      } else {
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/academic/sessions`, formData)
        toast.success('Session created successfully')
      }
      setIsModalOpen(false)
      fetchData()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save session')
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this session?')) return
    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/academic/sessions/${id}`)
      toast.success('Session deleted successfully')
      fetchData()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete session')
    }
  }

  const filtered = sessions.filter((s) =>
    `${s.className} ${s.section} ${s.branchName} ${s.sessionYr}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <motion.div className="animate-fade-in" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Class Sessions & Sections</h1>
          <p className="page-subtitle">{loading ? 'Loading...' : `${sessions.length} sections registered`}</p>
        </div>
        <button className="btn-primary" onClick={() => openModal()}><FaPlus /> Add Section</button>
      </div>

      <div className="glass-panel page-card">
        <div className="filter-row" style={{ marginBottom: '16px' }}>
          <div className="header-search">
            <span className="header-search-icon"><FaSearch /></span>
            <input
              className="header-search-input"
              type="search"
              placeholder="Search by class, section, or branch…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                {!isBranchAdmin && <th scope="col">Branch</th>}
                <th scope="col">Class</th>
                <th scope="col">Section</th>
                <th scope="col">Academic Session</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  {!isBranchAdmin && (
                    <td>
                      <div className="font-medium">{s.branchName}</div>
                      <div className="text-muted" style={{ fontSize: '0.8rem' }}>ID: {s.branchId}</div>
                    </td>
                  )}
                  <td><div className="font-bold">{s.className}</div></td>
                  <td>
                    <span className="badge badge-primary">{s.section}</span>
                  </td>
                  <td><span className="badge badge-info">{s.sessionYr}</span></td>
                  <td>
                    <div className="flex gap-sm">
                      <button className="btn-icon" title="Edit" onClick={() => openModal(s)}><FaEdit /></button>
                      <button className="btn-icon text-danger" title="Delete" onClick={() => handleDelete(s.id)}><FaTrash /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={isBranchAdmin ? 4 : 5} style={{ textAlign: 'center', padding: '32px', color: 'var(--clr-text-muted)' }}>
                    {loading ? 'Loading...' : 'No sections match your search.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between" style={{ padding: '16px', background: 'var(--clr-panel)', borderRadius: 'var(--radius-md)', marginTop: '16px' }}>
        <div>Page {page} of {totalPages}</div>
        <div className="flex gap-sm">
          <button className="btn-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <button className="btn-secondary" disabled={page === totalPages || totalPages === 0} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <motion.div
            className="glass-panel modal-container"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div className="modal-header">
              <h2 className="modal-title">{editingSession ? 'Edit Section' : 'Add New Section'}</h2>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {!isBranchAdmin && (
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Branch <span className="form-required">*</span></label>
                    <select
                      className={`form-control${errors.SCHL_BR_CLASS_SEC_SESS_BR_ID ? ' form-input-error' : ''}`}
                      value={formData.SCHL_BR_CLASS_SEC_SESS_BR_ID}
                      onChange={e => setFormData({ ...formData, SCHL_BR_CLASS_SEC_SESS_BR_ID: e.target.value, SCHL_BR_CLASS_SEC_SESS_CLASS: '' })}
                      required
                    >
                      <option value="">Select Branch</option>
                      {branches.map(b => (
                        <option key={b.SCHL_BR_ID || b.schl_br_id} value={b.SCHL_BR_ID || b.schl_br_id}>
                          {b.SCHL_BR_NM || b.schl_br_nm}
                        </option>
                      ))}
                    </select>
                    {errors.SCHL_BR_CLASS_SEC_SESS_BR_ID && <span className="form-error-msg">{errors.SCHL_BR_CLASS_SEC_SESS_BR_ID}</span>}
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Class <span className="form-required">*</span></label>
                  <select
                    className={`form-control${errors.SCHL_BR_CLASS_SEC_SESS_CLASS ? ' form-input-error' : ''}`}
                    value={formData.SCHL_BR_CLASS_SEC_SESS_CLASS}
                    onChange={(e) => setFormData({ ...formData, SCHL_BR_CLASS_SEC_SESS_CLASS: e.target.value })}
                    required
                  >
                    <option value="">Select a class</option>
                    {classes.filter(c => !formData.SCHL_BR_CLASS_SEC_SESS_BR_ID || String(c.SCHL_BR_CENT_ID || c.schl_br_cent_id || c.branchId) === String(formData.SCHL_BR_CLASS_SEC_SESS_BR_ID)).map(c => (
                      <option key={c.SCHL_BR_CLS_ID || c.schl_br_cls_id} value={c.SCHL_BR_CLS_ID || c.schl_br_cls_id}>{c.SCHL_BR_CLASS_NM || c.schl_br_class_nm}</option>
                    ))}
                  </select>
                  {errors.SCHL_BR_CLASS_SEC_SESS_CLASS && <span className="form-error-msg">{errors.SCHL_BR_CLASS_SEC_SESS_CLASS}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Section <span className="form-required">*</span></label>
                  <input
                    type="text"
                    className={`form-control${errors.SCHL_BR_CLASS_SEC_SESS_SECT ? ' form-input-error' : ''}`}
                    maxLength={1}
                    placeholder="e.g. A, B, C or 1, 2, 3"
                    value={formData.SCHL_BR_CLASS_SEC_SESS_SECT}
                    onChange={(e) => setFormData({ ...formData, SCHL_BR_CLASS_SEC_SESS_SECT: e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 1) })}
                    required
                  />
                  {errors.SCHL_BR_CLASS_SEC_SESS_SECT && <span className="form-error-msg">{errors.SCHL_BR_CLASS_SEC_SESS_SECT}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Academic Session <span className="form-required">*</span></label>
                  <select
                    className={`form-control${errors.SCHL_BR_CLASS_SEC_SESS_SESS ? ' form-input-error' : ''}`}
                    value={formData.SCHL_BR_CLASS_SEC_SESS_SESS}
                    onChange={(e) => setFormData({ ...formData, SCHL_BR_CLASS_SEC_SESS_SESS: e.target.value })}
                    required
                  >
                    {ACADEMIC_SESSIONS.map(sess => (
                      <option key={sess} value={sess}>{sess}</option>
                    ))}
                  </select>
                  {errors.SCHL_BR_CLASS_SEC_SESS_SESS && <span className="form-error-msg">{errors.SCHL_BR_CLASS_SEC_SESS_SESS}</span>}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">{editingSession ? 'Save Changes' : 'Create Section'}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  )
}