import axios from '../../lib/axios'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FaPlus, FaTrash, FaEdit, FaExchangeAlt } from 'react-icons/fa'
import { createPortal } from 'react-dom'
import { toast } from 'react-toastify'

export default function SubjectMapping() {
  const [mappings, setMappings] = useState([])
  const [teachers, setTeachers] = useState([])
  const [subjects, setSubjects] = useState([])
  const [branches, setBranches] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMapping, setEditingMapping] = useState(null)
  const [errors, setErrors] = useState({})

  const [formData, setFormData] = useState({
    TCHR_SUB_MAP_ID: '',
    TCHR_ID: '',
    TCHR_SUB_ID: '',
    classId: '',
    branchId: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const user = JSON.parse(sessionStorage.getItem('e_school_user') || '{}')
      const isSchoolAdmin = (user.user_role || user.role_id) === 'R_SCHOOLADMIN' || user.role === 'R_SCHOOLADMIN'
      const isBranchAdmin = (user.user_role || user.role_id) === 'R_BRANCHADMIN' || user.role === 'R_BRANCHADMIN'

      const [mapRes, tchrRes, subRes, brRes, clsRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/staff/mappings`).catch(() => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/staff/teachers`).catch(() => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/subjects`).catch(() => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/branches?limit=1000`).catch(() => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/classes?limit=1000`).catch(() => ({ data: [] }))
      ])
      
      let mappingList = Array.isArray(mapRes.data) ? mapRes.data : mapRes.data?.data || []
      let teacherList = Array.isArray(tchrRes.data) ? tchrRes.data : tchrRes.data?.data || []
      let subjectList = Array.isArray(subRes.data) ? subRes.data : subRes.data?.data || []
      let branchList = Array.isArray(brRes.data) ? brRes.data : brRes.data?.data || []
      let classList = Array.isArray(clsRes.data) ? clsRes.data : clsRes.data?.data || []

      const centerId = String(user.user_id || user.id || user.userId || '')
      if (isSchoolAdmin && centerId) {
          const filtered = branchList.filter(b => String(b.SCHL_BR_CENTER_ID || b.schl_br_center_id) === centerId)
          if (filtered.length > 0) branchList = filtered
      } else if (isBranchAdmin && centerId) {
          const filtered = branchList.filter(b => String(b.SCHL_BR_ID || b.schl_br_id) === centerId)
          if (filtered.length > 0) branchList = filtered
      }

      if (isSchoolAdmin || isBranchAdmin) {
          const validBranchIds = branchList.map(b => String(b.SCHL_BR_ID || b.schl_br_id))
          classList = classList.filter(c => validBranchIds.includes(String(c.SCHL_BR_CENT_ID || c.schl_br_cent_id || c.branchId)))
          teacherList = teacherList.filter(t => validBranchIds.includes(String(t.BR_TCHR_BR_ID || t.br_tchr_br_id)))
          const validTeacherIds = teacherList.map(t => String(t.BR_TCHR_ID || t.br_tchr_id || t.TCHR_ID || t.tchr_id || t.id))
          mappingList = mappingList.filter(m => validTeacherIds.includes(String(m.TCHR_ID || m.tchr_id)))
      }

      setMappings(mappingList)
      setTeachers(teacherList)
      setSubjects(subjectList)
      setBranches(branchList)
      setClasses(classList)
    } catch (err) {
      toast.error('Failed to load mapping data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function openModal(mapping = null) {
    setErrors({})
    const defaultBranchId = branches.length === 1 ? (branches[0].SCHL_BR_ID || branches[0].schl_br_id || '') : ''

    if (mapping) {
      setEditingMapping(mapping)
      const t = teachers.find(t => String(t.BR_TCHR_ID || t.br_tchr_id || t.TCHR_ID || t.tchr_id || t.id) === String(mapping.TCHR_ID || mapping.tchr_id))
      const sub = subjects.find(s => String(s.BR_CLS_SUB_ID || s.br_cls_sub_id || s.id) === String(mapping.TCHR_SUB_ID || mapping.tchr_sub_id))
      const autoClassId = sub ? (sub.BR_CLS_ID || sub.br_cls_id || sub.classId) : (mapping.class_id || '')
      const bId = mapping.branch_id || (t ? (t.BR_TCHR_BR_ID || t.br_tchr_br_id) : '') || defaultBranchId
      setFormData({
        TCHR_SUB_MAP_ID: mapping.TCHR_SUB_MAP_ID || mapping.tchr_sub_map_id || '',
        TCHR_ID: mapping.TCHR_ID || mapping.tchr_id || '',
        TCHR_SUB_ID: mapping.TCHR_SUB_ID || mapping.tchr_sub_id || '',
        classId: autoClassId || '',
        branchId: bId || ''
      })
    } else {
      setEditingMapping(null)
      setFormData({
        TCHR_SUB_MAP_ID: '', TCHR_ID: '', TCHR_SUB_ID: '', classId: '', branchId: defaultBranchId
      })
    }
    setIsModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = {}
    if (branches.length > 0 && !formData.branchId) errs.branchId = 'Please select a branch.'
    if (!formData.TCHR_ID) errs.TCHR_ID = 'Please select a teacher.'
    if (!formData.TCHR_SUB_ID) errs.TCHR_SUB_ID = 'Please select a subject.'
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    try {
      if (editingMapping) {
        const id = editingMapping.TCHR_SUB_MAP_ID || editingMapping.tchr_sub_map_id
        await axios.put(`${import.meta.env.VITE_API_BASE_URL}/staff/mappings/${id}`, formData)
        toast.success('Mapping updated successfully')
      } else {
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/staff/mappings`, formData)
        toast.success('Mapping created successfully')
      }
      setIsModalOpen(false)
      loadData()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save mapping')
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this mapping?')) return
    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/staff/mappings/${id}`)
      toast.success('Mapping deleted successfully')
      loadData()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete mapping')
    }
  }

  // Helpers to get names from IDs or row data
  const getTeacherName = (id, m = null) => {
    if (m?.teacher_name) return m.teacher_name
    const t = teachers.find(t => String(t.BR_TCHR_ID || t.br_tchr_id || t.TCHR_ID || t.tchr_id || t.id) === String(id))
    return t ? (t.BR_TCHR_NM || t.br_tchr_nm || t.TCHR_NM || t.tchr_nm || t.name) : id
  }

  const getSubjectName = (id, m = null) => {
    if (m?.subject_name) return m.subject_name
    const s = subjects.find(s => String(s.BR_CLS_SUB_ID || s.br_cls_sub_id || s.SUB_ID || s.sub_id || s.id) === String(id))
    return s ? (s.BR_CLS_SUB_NAME || s.br_cls_sub_name || s.SUB_NM || s.sub_nm || s.name) : id
  }

  const getClassName = (subId, m = null) => {
    if (m?.class_name) return m.class_name
    const s = subjects.find(s => String(s.BR_CLS_SUB_ID || s.br_cls_sub_id || s.SUB_ID || s.sub_id || s.id) === String(subId))
    const cId = s ? (s.BR_CLS_ID || s.br_cls_id || s.classId) : (m?.class_id || '')
    const c = classes.find(c => String(c.SCHL_BR_CLS_ID || c.schl_br_cls_id || c.id) === String(cId))
    return c ? (c.SCHL_BR_CLASS_NM || c.schl_br_class_nm || c.name) : (s?.class_name || '-')
  }

  const getBranchName = (m = null) => {
    if (m?.branch_name) return m.branch_name
    const bId = m?.branch_id || (teachers.find(t => String(t.BR_TCHR_ID || t.id) === String(m?.TCHR_ID || m?.tchr_id))?.BR_TCHR_BR_ID)
    const b = branches.find(b => String(b.SCHL_BR_ID || b.schl_br_id) === String(bId))
    return b ? (b.SCHL_BR_NM || b.schl_br_nm) : '-'
  }

  return (
    <motion.div className="animate-fade-in" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Teacher Assignment</h1>
          <p className="page-subtitle">Assign teachers to classes & subjects</p>
        </div>
        <button className="btn-primary" onClick={() => openModal()}>
          <FaPlus /> Add Assignment
        </button>
      </div>

      <div className="glass-panel page-card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mapping ID</th>
                <th>Teacher</th>
                <th>Class</th>
                <th>Subject</th>
                <th>Branch</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center">Loading...</td>
                </tr>
              ) : mappings.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-muted">No assignments found</td>
                </tr>
              ) : (
                mappings.map((m, idx) => {
                  const id = m.TCHR_SUB_MAP_ID || m.tchr_sub_map_id
                  const tchrId = m.TCHR_ID || m.tchr_id
                  const subId = m.TCHR_SUB_ID || m.tchr_sub_id

                  return (
                    <tr key={id || idx}>
                      <td>
                        <div className="flex items-center gap-sm">
                          <FaExchangeAlt className="text-muted" size={16} />
                          <span className="badge badge-info">{id}</span>
                        </div>
                      </td>
                      <td className="font-bold">{getTeacherName(tchrId, m)}</td>
                      <td>
                        <span className="badge badge-info">{getClassName(subId, m)}</span>
                      </td>
                      <td className="font-medium">{getSubjectName(subId, m)}</td>
                      <td className="text-muted text-small">{getBranchName(m)}</td>
                      <td>
                        <div className="flex gap-sm">
                          <button className="btn-icon" onClick={() => openModal(m)} title="Edit"><FaEdit /></button>
                          <button className="btn-icon text-danger" onClick={() => handleDelete(id)} title="Delete"><FaTrash /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && createPortal(
        <div className="modal-overlay">
          <motion.div
            className="glass-panel modal-container"
            style={{ maxWidth: '500px' }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="modal-header">
              <h2 className="modal-title">{editingMapping ? 'Edit Assignment' : 'New Assignment'}</h2>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {branches.length > 0 && (
                  <div className="form-group">
                    <label className="form-label">Branch <span className="form-required">*</span></label>
                    <select
                      className={`form-control${errors.branchId ? ' form-input-error' : ''}`}
                      value={formData.branchId}
                      onChange={e => setFormData({ ...formData, branchId: e.target.value, TCHR_ID: '', classId: '', TCHR_SUB_ID: '' })}
                      required
                    >
                      <option value="">Select Branch</option>
                      {branches.map(b => (
                        <option key={b.SCHL_BR_ID || b.schl_br_id} value={b.SCHL_BR_ID || b.schl_br_id}>
                          {b.SCHL_BR_NM || b.schl_br_nm}
                        </option>
                      ))}
                    </select>
                    {errors.branchId && <span className="form-error-msg">{errors.branchId}</span>}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Select Teacher <span className="form-required">*</span></label>
                  <select
                    className={`form-control${errors.TCHR_ID ? ' form-input-error' : ''}`}
                    value={formData.TCHR_ID}
                    onChange={e => setFormData({...formData, TCHR_ID: e.target.value})}
                    required
                    disabled={branches.length > 0 && !formData.branchId}
                  >
                    <option value="">-- Choose Teacher --</option>
                    {teachers.filter(t => !formData.branchId || String(t.BR_TCHR_BR_ID || t.br_tchr_br_id) === String(formData.branchId)).map(t => {
                      const tId = t.BR_TCHR_ID || t.br_tchr_id || t.TCHR_ID || t.tchr_id || t.id;
                      const tName = t.BR_TCHR_NM || t.br_tchr_nm || t.TCHR_NM || t.tchr_nm || t.name;
                      return <option key={tId} value={tId}>{tName}</option>
                    })}
                  </select>
                  {errors.TCHR_ID && <span className="form-error-msg">{errors.TCHR_ID}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Class (Optional Filter)</label>
                  <select 
                    className="form-control" 
                    value={formData.classId || ''} 
                    onChange={e => setFormData({ ...formData, classId: e.target.value, TCHR_SUB_ID: '' })}
                  >
                    <option value="">-- All Classes / Filter by Class --</option>
                    {classes.filter(c => !formData.branchId || String(c.SCHL_BR_CENT_ID || c.schl_br_cent_id || c.branchId) === String(formData.branchId)).map(c => {
                      const cid = c.SCHL_BR_CLS_ID || c.schl_br_cls_id || c.id;
                      const cname = c.SCHL_BR_CLASS_NM || c.schl_br_class_nm || c.name;
                      return <option key={cid} value={cid}>{cname}</option>;
                    })}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Select Subject <span className="form-required">*</span></label>
                  <select 
                    className={`form-control${errors.TCHR_SUB_ID ? ' form-input-error' : ''}`} 
                    value={formData.TCHR_SUB_ID} 
                    onChange={e => {
                      const selSubId = e.target.value;
                      const subObj = subjects.find(s => String(s.BR_CLS_SUB_ID || s.br_cls_sub_id || s.id) === String(selSubId));
                      const autoClassId = subObj ? (subObj.BR_CLS_ID || subObj.br_cls_id || subObj.classId) : '';
                      setFormData(prev => ({
                        ...prev,
                        TCHR_SUB_ID: selSubId,
                        classId: prev.classId || autoClassId || ''
                      }));
                    }} 
                    required
                  >
                    <option value="">-- Choose Subject --</option>
                    {subjects.filter(s => {
                      if (formData.classId) {
                        return String(s.BR_CLS_ID || s.br_cls_id || s.classId) === String(formData.classId);
                      }
                      if (formData.branchId) {
                        return String(s.branch_id || s.branchId || '') === String(formData.branchId) || !s.branch_id;
                      }
                      return true;
                    }).map(s => {
                      const sId = s.BR_CLS_SUB_ID || s.br_cls_sub_id || s.SUB_ID || s.sub_id || s.id;
                      const sName = s.BR_CLS_SUB_NAME || s.br_cls_sub_name || s.SUB_NM || s.sub_nm || s.name;
                      const cName = s.class_name || s.className || '';
                      return <option key={sId} value={sId}>{sName}{cName ? ` — (${cName})` : ''}</option>;
                    })}
                  </select>
                  {errors.TCHR_SUB_ID && <span className="form-error-msg">{errors.TCHR_SUB_ID}</span>}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Assignment</button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}
    </motion.div>
  )
}

