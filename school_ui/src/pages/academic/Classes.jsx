import axios from '../../lib/axios'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FaSearch, FaCog, FaDownload, FaEdit, FaTrash, FaPlus } from 'react-icons/fa'
import { toast } from 'react-toastify'
import { LANGUAGES, BOARDS, STANDARD_CLASSES } from '../../lib/indiaData'

function initials(name) {
  if (!name) return 'UN'
  const parts = name.split(' ')
  return parts.slice(-2).map((w) => (w[0] || '')).join('').toUpperCase() || 'UN'
}

const AVATAR_CLRS = ['avatar-blue', 'avatar-green', 'avatar-orange', 'avatar-purple', 'avatar-teal']

function normaliseClass(c) {
  return {
    id: c.SCHL_BR_CLS_ID || c.schl_br_cls_id || c.id,
    branchId: c.SCHL_BR_CENT_ID || c.schl_br_cent_id || '',
    name: c.SCHL_BR_CLASS_NM || c.schl_br_class_nm || c.name || 'Unknown Class',
    language: c.SCHL_BR_CLASS_LANG || c.schl_br_class_lang || 'English',
    board: c.SCHL_BR_BRD || c.schl_br_brd || 'CBSE',
    matrixId: c.SCHL_BR_MAT || c.schl_br_mat || '',
    matrixName: c.matrix_name || c.SCHL_UNIQ_MATRIX_NM || '',
    sections: c.sections || 2,
    students: c.student_count || c.STUDENT_COUNT || c.students || 0,
    status: c.status || 'Active',
    raw: c
  }
}

export default function Classes() {
  const [classesList, setClassesList] = useState([])
  const [branches, setBranches] = useState([])
  const [matrices, setMatrices] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingClass, setEditingClass] = useState(null)
  const [errors, setErrors] = useState({})
  const [isCustomClass, setIsCustomClass] = useState(false)

  const currentUser = JSON.parse(sessionStorage.getItem('e_school_user') || '{}')
  const userRole = (currentUser.user_role || currentUser.role_id || currentUser.role || '').toLowerCase()
  const isBranchAdmin = userRole.includes('branch') && !userRole.includes('super')
  const isTeacher = userRole.includes('teacher')

  const [formData, setFormData] = useState({
    SCHL_BR_CLS_ID: '',
    SCHL_BR_CENT_ID: currentUser.branch_id || currentUser.userId || '',
    SCHL_BR_CLASS_NM: '',
    SCHL_BR_CLASS_LANG: 'English',
    SCHL_BR_BRD: 'CBSE',
    SCHL_BR_MAT: ''
  })

  async function fetchClasses(branchesList = branches) {
    try {
      setLoading(true)
      const { data } = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/classes?page=${page}&limit=1000`)
      let items = Array.isArray(data) ? data : data?.data || []
      
      const user = JSON.parse(sessionStorage.getItem('e_school_user') || '{}')
      const isSchoolAdmin = (user.user_role || user.role_id) === 'R_SCHOOLADMIN' || user.role === 'R_SCHOOLADMIN'
      const isBranchAdminRole = (user.user_role || user.role_id) === 'R_BRANCHADMIN' || user.role === 'R_BRANCHADMIN'
      
      if ((isSchoolAdmin || isBranchAdminRole) && branchesList && branchesList.length > 0) {
          const validIds = branchesList.map(b => String(b.SCHL_BR_ID || b.schl_br_id))
          items = items.filter(c => validIds.includes(String(c.SCHL_BR_CENT_ID || c.schl_br_cent_id)))
      }

      setClassesList(items.map(normaliseClass))
      if (data.pagination) setTotalPages(data.pagination.totalPages)
    } catch (err) {
      toast.error('Failed to load classes')
      console.error('Failed to load classes:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchBranches() {
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/branches`)
      let items = Array.isArray(data) ? data : data?.data || []
      
      const user = JSON.parse(sessionStorage.getItem('e_school_user') || '{}')
      const isSchoolAdmin = (user.user_role || user.role_id) === 'R_SCHOOLADMIN' || user.role === 'R_SCHOOLADMIN'
      const isBranchAdminRole = (user.user_role || user.role_id) === 'R_BRANCHADMIN' || user.role === 'R_BRANCHADMIN'
      
      if (isSchoolAdmin) {
         const centerId = String((user.user_id || user.id))
         items = items.filter(b => String(b.SCHL_BR_CENTER_ID || b.schl_br_center_id) === centerId)
      } else if (isBranchAdminRole) {
         const branchId = String((user.user_id || user.id))
         items = items.filter(b => String(b.SCHL_BR_ID || b.schl_br_id) === branchId)
      }
      
      setBranches(items)
      return items
    } catch (err) {
      console.error('Failed to load branches:', err)
      return []
    }
  }

  async function fetchMatrices() {
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/matrices?limit=100`)
      const items = Array.isArray(data) ? data : data?.data || []
      setMatrices(items)
      return items
    } catch (err) {
      console.error('Failed to load schedule matrices:', err)
      return []
    }
  }

  useEffect(() => {
    fetchBranches().then(branchesList => {
      fetchClasses(branchesList)
    })
    fetchMatrices()
  }, [page])

  function branchNameFor(id) {
    const b = branches.find(x => (x.SCHL_BR_ID || x.schl_br_id) === id)
    return b ? (b.SCHL_BR_NM || b.schl_br_nm) : id
  }

  function openModal(cls = null) {
    if (isTeacher) return
    setErrors({})
    setIsCustomClass(!!cls && !!cls.name && !STANDARD_CLASSES.includes(cls.name))
    const defaultBranchId = isBranchAdmin 
      ? (currentUser.branch_id || (branches.length > 0 ? (branches[0].SCHL_BR_ID || branches[0].schl_br_id) : (currentUser.userId || '')))
      : (branches.length === 1 ? (branches[0].SCHL_BR_ID || branches[0].schl_br_id || '') : '')

    if (cls) {
      setEditingClass(cls)
      setFormData({
        SCHL_BR_CLS_ID: cls.id || '',
        SCHL_BR_CENT_ID: cls.branchId || defaultBranchId,
        SCHL_BR_CLASS_NM: cls.name || '',
        SCHL_BR_CLASS_LANG: cls.language || 'English',
        SCHL_BR_BRD: cls.board || 'CBSE',
        SCHL_BR_MAT: cls.matrixId || ''
      })
    } else {
      setEditingClass(null)
      setFormData({
        SCHL_BR_CLS_ID: '',
        SCHL_BR_CENT_ID: defaultBranchId,
        SCHL_BR_CLASS_NM: '',
        SCHL_BR_CLASS_LANG: 'English',
        SCHL_BR_BRD: 'CBSE',
        SCHL_BR_MAT: ''
      })
    }
    setIsModalOpen(true)
  }

  // Custom class name: Roman/English alphabets and single spaces only (no digits, no special characters).
  const sanitizeClassName = (v) => v.replace(/[^A-Za-z ]/g, '').replace(/^\s+/, '').replace(/\s{2,}/g, ' ')

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = {}
    if (!formData.SCHL_BR_CLASS_NM.trim()) errs.SCHL_BR_CLASS_NM = 'Class name is required (blank spaces are not allowed).'
    else if (isCustomClass && !/^[A-Za-z]+( [A-Za-z]+)*$/.test(formData.SCHL_BR_CLASS_NM.trim())) errs.SCHL_BR_CLASS_NM = 'Class name can contain only Roman letters (A-Z) and spaces.'
    if (!isBranchAdmin && !formData.SCHL_BR_CENT_ID) errs.SCHL_BR_CENT_ID = 'Please select a branch.'
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    try {
      if (editingClass) {
        await axios.put(`${import.meta.env.VITE_API_BASE_URL}/academic/classes/${editingClass.id}`, { ...formData, SCHL_BR_CLASS_NM: formData.SCHL_BR_CLASS_NM.trim() })
        toast.success('Class updated successfully')
      } else {
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/academic/classes`, { ...formData, SCHL_BR_CLASS_NM: formData.SCHL_BR_CLASS_NM.trim() })
        toast.success('Class created successfully')
      }
      setIsModalOpen(false)
      fetchClasses()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save class')
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this class?')) return
    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/academic/classes/${id}`)
      toast.success('Class deleted successfully')
      fetchClasses()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete class')
    }
  }

  const filtered = classesList.filter(
    (c) =>
      `${c.name || ''} ${c.language || ''} ${c.board || ''} ${c.matrixName || ''}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <motion.div className="animate-fade-in" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isTeacher ? 'My Classes' : 'Classes'}</h1>
          <p className="page-subtitle">{loading ? 'Loading...' : `${classesList.length} ${isTeacher ? 'classes assigned' : 'classes configured'}`}</p>
        </div>
        {!isTeacher && (
          <button id="add-class-btn" className="btn-primary" onClick={() => openModal()}><FaPlus /> Add Class</button>
        )}
      </div>

      {/* Search + Table */}
      <div className="glass-panel page-card">
        <div className="filter-row" style={{ marginBottom: '16px' }}>
          <div className="header-search">
            <span className="header-search-icon"><FaSearch /></span>
            <input
              id="classes-search"
              className="header-search-input"
              type="search"
              placeholder="Search by class name, language, board, or matrix…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search classes"
            />
          </div>
        </div>

        <div className="table-container">
          <table className="data-table" aria-label="Classes table">
            <thead>
              <tr>
                <th scope="col">Class Name</th>
                <th scope="col">Language / Medium</th>
                <th scope="col">Board</th>
                <th scope="col">Schedule Matrix</th>
                {!isBranchAdmin && <th scope="col">Branch</th>}
                <th scope="col">Students</th>
                <th scope="col">Status</th>
                {!isTeacher && <th scope="col">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((cls, i) => {
                const char = cls.name ? cls.name.charAt(0).toUpperCase() : 'C';
                return (
                  <tr key={cls.id}>
                    <td>
                      <div className="filter-row">
                        <div className={`avatar avatar-sm ${AVATAR_CLRS[i % AVATAR_CLRS.length]}`}>
                          {char}
                        </div>
                        <div>
                          <div className="font-bold" style={{ fontSize: '0.875rem' }}>
                            {cls.name}
                          </div>
                          <div className="text-muted">ID: {cls.id}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge badge-info">{cls.language}</span></td>
                    <td><span className="badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--clr-primary)' }}>{cls.board}</span></td>
                    <td>
                      {cls.matrixName ? (
                        <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
                          {cls.matrixName}
                        </span>
                      ) : (
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>Default</span>
                      )}
                    </td>
                    {!isBranchAdmin && (
                      <td>
                        <div className="font-medium">
                          {branchNameFor(cls.branchId)}
                        </div>
                      </td>
                    )}
                    <td>
                      <div className="flex items-center gap-sm">
                        <span style={{ fontWeight: 700 }}>{cls.students}</span>
                        <span className="text-muted">enrolled</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${cls.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>
                        {cls.status}
                      </span>
                    </td>
                    {!isTeacher && (
                      <td>
                        <div className="flex gap-sm">
                          <button className="btn-icon" aria-label={`Edit ${cls.name}`} title="Edit" onClick={() => openModal(cls)}><FaEdit /></button>
                          <button className="btn-icon text-danger" aria-label={`Delete ${cls.name}`} title="Delete" onClick={() => handleDelete(cls.id)}><FaTrash /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={(isBranchAdmin ? 6 : 7) + (!isTeacher ? 1 : 0)} style={{ textAlign: 'center', padding: '32px', color: 'var(--clr-text-muted)' }}>
                    {loading ? 'Loading classes...' : 'No classes match your search.'}
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

      {/* Add/Edit Class Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <motion.div
            className="glass-panel modal-container"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div className="modal-header">
              <h2 className="modal-title">{editingClass ? 'Edit Class' : 'Add New Class'}</h2>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Class Name <span className="form-required">*</span></label>
                  <select
                    className={`form-control${errors.SCHL_BR_CLASS_NM ? ' form-input-error' : ''}`}
                    value={isCustomClass ? '__custom__' : (STANDARD_CLASSES.includes(formData.SCHL_BR_CLASS_NM) ? formData.SCHL_BR_CLASS_NM : '')}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === '__custom__') {
                        setIsCustomClass(true)
                        setFormData({ ...formData, SCHL_BR_CLASS_NM: '' })
                      } else {
                        setIsCustomClass(false)
                        setFormData({ ...formData, SCHL_BR_CLASS_NM: val })
                      }
                    }}
                    required={!isCustomClass}
                  >
                    <option value="">-- Select Class --</option>
                    <optgroup label="Pre-Primary / Kindergarten">
                      {STANDARD_CLASSES.filter(c => ['Playgroup', 'Nursery', 'LKG', 'UKG'].includes(c)).map(clsName => (
                        <option key={clsName} value={clsName}>{clsName}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Primary & Middle School (1 to 8)">
                      {STANDARD_CLASSES.filter(c => ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8'].includes(c)).map(clsName => (
                        <option key={clsName} value={clsName}>{clsName}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Secondary & Higher Secondary (9 to 12)">
                      {STANDARD_CLASSES.filter(c => ['Class 9', 'Class 10', 'Class 11', 'Class 12'].includes(c)).map(clsName => (
                        <option key={clsName} value={clsName}>{clsName}</option>
                      ))}
                    </optgroup>
                    <option value="__custom__">-- Other / Custom Class Name --</option>
                  </select>
                  {errors.SCHL_BR_CLASS_NM && <span className="form-error-msg">{errors.SCHL_BR_CLASS_NM}</span>}
                  
                  {isCustomClass && (
                    <div style={{ marginTop: '8px' }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Enter custom class name (letters only, e.g. Nursery A, Class X)..."
                        value={formData.SCHL_BR_CLASS_NM}
                        required
                        maxLength={50}
                        onChange={(e) => setFormData({ ...formData, SCHL_BR_CLASS_NM: sanitizeClassName(e.target.value) })}
                        autoFocus
                      />
                    </div>
                  )}
                </div>

                <div className="form-row-2col">
                  <div className="form-group">
                    <label className="form-label">Language / Medium</label>
                    <select
                      className="form-control"
                      value={formData.SCHL_BR_CLASS_LANG}
                      onChange={(e) => setFormData({ ...formData, SCHL_BR_CLASS_LANG: e.target.value })}
                    >
                      {LANGUAGES.map(lang => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Board</label>
                    <select
                      className="form-control"
                      value={formData.SCHL_BR_BRD}
                      onChange={(e) => setFormData({ ...formData, SCHL_BR_BRD: e.target.value })}
                    >
                      {BOARDS.map(brd => (
                        <option key={brd} value={brd}>{brd}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Schedule Matrix Template</label>
                  <select
                    className="form-control"
                    value={formData.SCHL_BR_MAT}
                    onChange={(e) => setFormData({ ...formData, SCHL_BR_MAT: e.target.value })}
                  >
                    <option value="">-- Select Matrix Template (Optional) --</option>
                    {matrices.map(m => (
                      <option key={m.SCHL_MAT_ID || m.schl_mat_id} value={m.SCHL_MAT_ID || m.schl_mat_id}>
                        {m.SCHL_UNIQ_MATRIX_NM || m.schl_uniq_matrix_nm} ({m.SCHL_NO_OF_CLASS || m.schl_no_of_class || 6} periods, {m.SCHL_CLASS_DURATION || m.schl_class_duration || 45} mins)
                      </option>
                    ))}
                  </select>
                  <small className="text-muted">Links this class to a predefined timetable period structure</small>
                </div>

                {!isBranchAdmin && (
                  <div className="form-group">
                    <label className="form-label">Branch <span className="form-required">*</span></label>
                    <select
                      className={`form-control${errors.SCHL_BR_CENT_ID ? ' form-input-error' : ''}`}
                      value={formData.SCHL_BR_CENT_ID}
                      onChange={e => setFormData({ ...formData, SCHL_BR_CENT_ID: e.target.value })}
                      required
                    >
                      <option value="">Select Branch</option>
                      {branches.map(b => (
                        <option key={b.SCHL_BR_ID || b.schl_br_id} value={b.SCHL_BR_ID || b.schl_br_id}>
                          {b.SCHL_BR_NM || b.schl_br_nm}
                        </option>
                      ))}
                    </select>
                    {errors.SCHL_BR_CENT_ID && <span className="form-error-msg">{errors.SCHL_BR_CENT_ID}</span>}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">{editingClass ? 'Save Changes' : 'Create Class'}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  )
}