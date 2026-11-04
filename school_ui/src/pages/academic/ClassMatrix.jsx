import axios from '../../lib/axios'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FaSearch, FaPlus, FaEdit, FaTrash, FaTable, FaClock } from 'react-icons/fa'
import { toast } from 'react-toastify'

function normaliseMatrix(m) {
  return {
    id: m.SCHL_MAT_ID || m.schl_mat_id || m.id,
    uniqueName: m.SCHL_UNIQ_MATRIX_NM || m.schl_uniq_matrix_nm || 'Matrix',
    type: m.SCHL_MAT_NM || m.schl_mat_nm || 'Regular Class',
    noOfClass: m.SCHL_NO_OF_CLASS || m.schl_no_of_class || 0,
    duration: m.SCHL_CLASS_DURATION || m.schl_class_duration || 45,
    fromTime: m.SCHL_CLASS_FRM || m.schl_class_frm || '',
    toTime: m.SCHL_CLASS_TO || m.schl_class_to || '',
    weekOfDay: m.SCHL_WEEKOFDAY || m.schl_weekofday || 'Monday-Friday',
    schoolId: m.SCHL_MAT_SCHOOL_ID || m.schl_mat_school_id || '',
    branchId: m.SCHL_MAT_BRANCH_ID || m.schl_mat_branch_id || '',
    raw: m
  }
}

export default function ClassMatrix() {
  const [matrices, setMatrices] = useState([])
  const [schools, setSchools] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMatrix, setEditingMatrix] = useState(null)
  const [errors, setErrors] = useState({})

  const currentUser = JSON.parse(sessionStorage.getItem('e_school_user') || '{}')
  const userRole = (currentUser.user_role || currentUser.role_id || currentUser.role || '').toLowerCase()
  const isSuperAdmin = userRole.includes('super')
  const isSchoolAdmin = userRole.includes('school') && !isSuperAdmin
  const isBranchAdmin = userRole.includes('branch') && !isSuperAdmin

  const defaultSchoolId = currentUser.school_id || currentUser.SCHL_ID || (isSchoolAdmin ? (currentUser.user_id || currentUser.id) : '')
  const defaultBranchId = currentUser.branch_id || currentUser.SCHL_BR_ID || (isBranchAdmin ? (currentUser.user_id || currentUser.id) : '')

  const [formData, setFormData] = useState({
    SCHL_MAT_ID: '',
    SCHL_MAT_SCHOOL_ID: defaultSchoolId || '',
    SCHL_MAT_BRANCH_ID: defaultBranchId || '',
    SCHL_UNIQ_MATRIX_NM: '',
    SCHL_MAT_NM: 'Regular Class',
    SCHL_NO_OF_CLASS: 6,
    SCHL_CLASS_DURATION: 45,
    SCHL_CLASS_FRM: '08:00',
    SCHL_CLASS_TO: '14:30',
    SCHL_WEEKOFDAY: 'Monday,Tuesday,Wednesday,Thursday,Friday'
  })

  async function loadSchoolsAndBranches() {
    try {
      const branchReq = axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/branches?limit=1000`)
        .catch(() => ({ data: [] }))
      const schoolReq = (isSuperAdmin || isSchoolAdmin)
        ? axios.get(`${import.meta.env.VITE_API_BASE_URL}/auth/school`).catch(() => ({ data: [] }))
        : Promise.resolve(null)

      const [branchRes, schoolRes] = await Promise.all([branchReq, schoolReq])

      let branchItems = Array.isArray(branchRes.data) ? branchRes.data : branchRes.data?.data || []
      let schoolItems = schoolRes ? (Array.isArray(schoolRes.data) ? schoolRes.data : schoolRes.data?.data || []) : []

      if (isSchoolAdmin) {
        const centerId = String(currentUser.user_id || currentUser.id || currentUser.school_id || '')
        schoolItems = schoolItems.filter(s => String(s.schl_mn_id || s.SCHL_MN_ID) === centerId)
        branchItems = branchItems.filter(b => String(b.SCHL_BR_CENTER_ID || b.schl_br_center_id) === centerId)
      } else if (isBranchAdmin) {
        const branchId = String(currentUser.user_id || currentUser.id || currentUser.branch_id || '')
        branchItems = branchItems.filter(b => String(b.SCHL_BR_ID || b.schl_br_id) === branchId)
      }

      setBranches(branchItems)
      setSchools(schoolItems)
    } catch (err) {
      console.error('Error loading school/branch lookups', err)
    }
  }

  async function fetchMatrices() {
    try {
      setLoading(true)
      const { data } = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/matrices?page=${page}&limit=20`)
      const items = Array.isArray(data) ? data : data?.data || []
      setMatrices(items.map(normaliseMatrix))
      if (data.pagination) setTotalPages(data.pagination.totalPages)
    } catch (err) {
      toast.error('Failed to load schedule matrices')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMatrices()
    loadSchoolsAndBranches()
  }, [page])

  function openModal(mat = null) {
    setErrors({})
    if (mat) {
      setEditingMatrix(mat)
      const matSchoolId = mat.schoolId || (branches.find(b => (b.SCHL_BR_ID || b.schl_br_id) === mat.branchId)?.SCHL_BR_CENTER_ID) || defaultSchoolId || ''
      setFormData({
        SCHL_MAT_ID: mat.id || '',
        SCHL_MAT_SCHOOL_ID: matSchoolId,
        SCHL_MAT_BRANCH_ID: mat.branchId || defaultBranchId || '',
        SCHL_UNIQ_MATRIX_NM: mat.uniqueName || '',
        SCHL_MAT_NM: mat.type || 'Regular Class',
        SCHL_NO_OF_CLASS: mat.noOfClass || 6,
        SCHL_CLASS_DURATION: mat.duration || 45,
        SCHL_CLASS_FRM: mat.fromTime || '08:00',
        SCHL_CLASS_TO: mat.toTime || '14:30',
        SCHL_WEEKOFDAY: mat.weekOfDay || 'Monday,Tuesday,Wednesday,Thursday,Friday'
      })
    } else {
      setEditingMatrix(null)
      const initialSchool = isSchoolAdmin ? defaultSchoolId : (schools.length > 0 ? (schools[0].schl_mn_id || schools[0].SCHL_MN_ID) : '')
      const applicableBranches = branches.filter(b => !initialSchool || String(b.SCHL_BR_CENTER_ID || b.schl_br_center_id) === String(initialSchool))
      const initialBranch = isBranchAdmin ? defaultBranchId : (applicableBranches.length > 0 ? (applicableBranches[0].SCHL_BR_ID || applicableBranches[0].schl_br_id) : '')

      setFormData({
        SCHL_MAT_ID: '',
        SCHL_MAT_SCHOOL_ID: initialSchool || '',
        SCHL_MAT_BRANCH_ID: initialBranch || '',
        SCHL_UNIQ_MATRIX_NM: '',
        SCHL_MAT_NM: 'Regular Class',
        SCHL_NO_OF_CLASS: 6,
        SCHL_CLASS_DURATION: 45,
        SCHL_CLASS_FRM: '08:00',
        SCHL_CLASS_TO: '14:30',
        SCHL_WEEKOFDAY: 'Monday,Tuesday,Wednesday,Thursday,Friday'
      })
    }
    setIsModalOpen(true)
  }

  // Filter branches based on selected school in form
  const availableBranches = branches.filter((b) => {
    if (!formData.SCHL_MAT_SCHOOL_ID) return true
    return String(b.SCHL_BR_CENTER_ID || b.schl_br_center_id) === String(formData.SCHL_MAT_SCHOOL_ID)
  })

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = {}
    // Same Unique Matrix Name may be reused with a different Matrix Type (e.g. "Daily Class" + "Exam / Assessment").
    // Time must flow forward: End Time has to be later than Start Time (e.g. 08:00 -> 14:00, 10:00 -> 17:00).
    if (!formData.SCHL_UNIQ_MATRIX_NM.trim()) errs.SCHL_UNIQ_MATRIX_NM = 'Unique Matrix Name is required.'
    if (!formData.SCHL_NO_OF_CLASS || Number(formData.SCHL_NO_OF_CLASS) <= 0) errs.SCHL_NO_OF_CLASS = 'Number of classes must be greater than 0.'
    if (!formData.SCHL_CLASS_DURATION || Number(formData.SCHL_CLASS_DURATION) <= 0) errs.SCHL_CLASS_DURATION = 'Duration must be greater than 0.'
    if (!formData.SCHL_CLASS_FRM) errs.SCHL_CLASS_FRM = 'Start time is required.'
    if (!formData.SCHL_CLASS_TO) errs.SCHL_CLASS_TO = 'End time is required.'
    if (formData.SCHL_CLASS_FRM && formData.SCHL_CLASS_TO && formData.SCHL_CLASS_TO <= formData.SCHL_CLASS_FRM) {
      errs.SCHL_CLASS_TO = 'End time must be later than start time (e.g. 08:00 AM to 02:00 PM).'
    }
    
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    try {
      if (editingMatrix) {
        await axios.put(`${import.meta.env.VITE_API_BASE_URL}/academic/matrix/${editingMatrix.id}`, formData)
        toast.success('Matrix template updated successfully')
      } else {
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/academic/matrix`, formData)
        toast.success('Matrix template created successfully')
      }
      setIsModalOpen(false)
      fetchMatrices()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save matrix')
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this schedule matrix?')) return
    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/academic/matrix/${id}`)
      toast.success('Matrix template deleted successfully')
      fetchMatrices()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete matrix')
    }
  }

  const filtered = matrices.filter(
    (m) =>
      `${m.uniqueName || ''} ${m.type || ''} ${m.weekOfDay || ''}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <motion.div className="animate-fade-in" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Class Schedule Matrices</h1>
          <p className="page-subtitle">{loading ? 'Loading...' : `${matrices.length} schedule matrix templates configured`}</p>
        </div>
        <button id="add-matrix-btn" className="btn-primary" onClick={() => openModal()}><FaPlus /> Add Schedule Matrix</button>
      </div>

      <div className="glass-panel page-card">
        <div className="filter-row" style={{ marginBottom: '16px' }}>
          <div className="header-search">
            <span className="header-search-icon"><FaSearch /></span>
            <input
              id="matrix-search"
              className="header-search-input"
              type="search"
              placeholder="Search by matrix name, type, or days…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search schedule matrices"
            />
          </div>
        </div>

        <div className="table-container">
          <table className="data-table" aria-label="Matrices table">
            <thead>
              <tr>
                <th scope="col">Matrix Name & ID</th>
                <th scope="col">Branch / School</th>
                <th scope="col">Type</th>
                <th scope="col">No. of Classes</th>
                <th scope="col">Duration (Mins)</th>
                <th scope="col">Time Range</th>
                <th scope="col">Week Schedule</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((mat) => {
                const branchObj = branches.find(b => String(b.SCHL_BR_ID || b.schl_br_id) === String(mat.branchId))
                const schoolObj = schools.find(s => String(s.schl_mn_id || s.SCHL_MN_ID) === String(mat.schoolId || branchObj?.SCHL_BR_CENTER_ID))
                return (
                  <tr key={mat.id}>
                    <td>
                      <div className="filter-row">
                        <div className="avatar avatar-sm avatar-purple">
                          <FaTable />
                        </div>
                        <div>
                          <div className="font-bold" style={{ fontSize: '0.875rem' }}>
                            {mat.uniqueName}
                          </div>
                          <div className="text-muted">ID: {mat.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <span className="badge badge-teal" style={{ display: 'inline-block', marginBottom: '2px' }}>
                          {branchObj?.SCHL_BR_NM || branchObj?.schl_br_nm || (mat.branchId ? `Branch: ${mat.branchId}` : 'All Branches')}
                        </span>
                        {schoolObj && (
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                            {schoolObj.schl_mn_nm || schoolObj.SCHL_MN_NM}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-info">{mat.type}</span>
                    </td>
                    <td>
                      <div className="font-bold">{mat.noOfClass} periods / day</div>
                    </td>
                    <td>
                      <div className="flex items-center gap-xs">
                        <FaClock className="text-muted" />
                        <span>{mat.duration} mins</span>
                      </div>
                    </td>
                    <td>
                      <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                        {mat.fromTime || '08:00'} - {mat.toTime || '14:30'}
                      </div>
                    </td>
                    <td>
                      <div style={{ maxWidth: '180px', fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={mat.weekOfDay}>
                        {mat.weekOfDay}
                      </div>
                    </td>
                    <td>
                      <div className="flex gap-sm">
                        <button className="btn-icon" aria-label={`Edit ${mat.uniqueName}`} title="Edit" onClick={() => openModal(mat)}><FaEdit /></button>
                        <button className="btn-icon text-danger" aria-label={`Delete ${mat.uniqueName}`} title="Delete" onClick={() => handleDelete(mat.id)}><FaTrash /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--clr-text-muted)' }}>
                    {loading ? 'Loading matrices...' : 'No schedule matrices found. Click "Add Schedule Matrix" to create one.'}
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
              <h2 className="modal-title">{editingMatrix ? 'Edit Schedule Matrix' : 'Add New Schedule Matrix'}</h2>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* School & Branch Selector Grid */}
                <div className="form-row-2col">
                  <div className="form-group">
                    <label className="form-label">School Organization</label>
                    <select
                      className="form-control"
                      value={formData.SCHL_MAT_SCHOOL_ID}
                      onChange={(e) => {
                        const newSchoolId = e.target.value
                        // Find matching branches for new school
                        const matching = branches.filter(b => !newSchoolId || String(b.SCHL_BR_CENTER_ID || b.schl_br_center_id) === String(newSchoolId))
                        const firstBranch = matching.length > 0 ? (matching[0].SCHL_BR_ID || matching[0].schl_br_id) : ''
                        setFormData({
                          ...formData,
                          SCHL_MAT_SCHOOL_ID: newSchoolId,
                          SCHL_MAT_BRANCH_ID: isBranchAdmin ? defaultBranchId : firstBranch
                        })
                      }}
                      disabled={isBranchAdmin || isSchoolAdmin}
                    >
                      <option value="">-- All / Default School --</option>
                      {schools.map((s) => (
                        <option key={s.schl_mn_id || s.SCHL_MN_ID} value={s.schl_mn_id || s.SCHL_MN_ID}>
                          {s.schl_mn_nm || s.SCHL_MN_NM}
                        </option>
                      ))}
                    </select>
                    <small className="text-muted">Selecting school auto-updates applicable branches</small>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Branch Target</label>
                    <select
                      className="form-control"
                      value={formData.SCHL_MAT_BRANCH_ID}
                      onChange={(e) => setFormData({ ...formData, SCHL_MAT_BRANCH_ID: e.target.value })}
                      disabled={isBranchAdmin}
                    >
                      <option value="">-- All Branches --</option>
                      {availableBranches.map((b) => (
                        <option key={b.SCHL_BR_ID || b.schl_br_id} value={b.SCHL_BR_ID || b.schl_br_id}>
                          {b.SCHL_BR_NM || b.schl_br_nm} ({b.SCHL_BR_CITY || b.schl_br_city || 'Main'})
                        </option>
                      ))}
                    </select>
                    <small className="text-muted">
                      {availableBranches.length} branch(es) available for selected school
                    </small>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Unique Matrix Name <span className="form-required">*</span></label>
                  <input
                    type="text"
                    className={`form-control${errors.SCHL_UNIQ_MATRIX_NM ? ' form-input-error' : ''}`}
                    placeholder="e.g. Primary Routine 6-Period, HighSchool-Lab-Matrix"
                    value={formData.SCHL_UNIQ_MATRIX_NM}
                    onChange={(e) => setFormData({ ...formData, SCHL_UNIQ_MATRIX_NM: e.target.value })}
                    required
                  />
                  {errors.SCHL_UNIQ_MATRIX_NM && <span className="form-error-msg">{errors.SCHL_UNIQ_MATRIX_NM}</span>}
                </div>

                <div className="form-row-2col">
                  <div className="form-group">
                    <label className="form-label">Matrix Category / Type</label>
                    <select
                      className="form-control"
                      value={formData.SCHL_MAT_NM}
                      onChange={(e) => setFormData({ ...formData, SCHL_MAT_NM: e.target.value })}
                    >
                      <option value="Regular Class">Regular Class</option>
                      <option value="Lab & Practical">Lab & Practical</option>
                      <option value="Exam / Assessment">Exam / Assessment</option>
                      <option value="Special / Remedial">Special / Remedial</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">No. of Classes (Periods)</label>
                    <input
                      type="number"
                      min="1"
                      max="15"
                      className="form-control"
                      value={formData.SCHL_NO_OF_CLASS}
                      onChange={(e) => setFormData({ ...formData, SCHL_NO_OF_CLASS: parseInt(e.target.value, 10) || 1 })}
                      required
                    />
                  </div>
                </div>

                <div className="grid-3">
                  <div className="form-group">
                    <label className="form-label">Duration (Minutes)</label>
                    <input
                      type="number"
                      min="10"
                      max="180"
                      className="form-control"
                      value={formData.SCHL_CLASS_DURATION}
                      onChange={(e) => setFormData({ ...formData, SCHL_CLASS_DURATION: parseInt(e.target.value, 10) || 45 })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Start Time</label>
                    <input
                      type="time"
                      className={`form-control${errors.SCHL_CLASS_FRM ? ' form-input-error' : ''}`}
                      value={formData.SCHL_CLASS_FRM}
                      onChange={(e) => setFormData({ ...formData, SCHL_CLASS_FRM: e.target.value })}
                    />
                    {errors.SCHL_CLASS_FRM && <span className="form-error-msg">{errors.SCHL_CLASS_FRM}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">End Time</label>
                    <input
                      type="time"
                      className={`form-control${errors.SCHL_CLASS_TO ? ' form-input-error' : ''}`}
                      value={formData.SCHL_CLASS_TO}
                      onChange={(e) => setFormData({ ...formData, SCHL_CLASS_TO: e.target.value })}
                    />
                    {errors.SCHL_CLASS_TO && <span className="form-error-msg">{errors.SCHL_CLASS_TO}</span>}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Week Days</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Monday,Tuesday,Wednesday,Thursday,Friday"
                    value={formData.SCHL_WEEKOFDAY}
                    onChange={(e) => setFormData({ ...formData, SCHL_WEEKOFDAY: e.target.value })}
                  />
                  <small className="text-muted">Comma-separated days active for this matrix template</small>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">{editingMatrix ? 'Save Changes' : 'Create Matrix'}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  )
}