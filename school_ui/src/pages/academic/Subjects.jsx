import axios from '../../lib/axios'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FaPlus, FaTrash, FaEdit, FaBook } from 'react-icons/fa'
import { createPortal } from 'react-dom'
import { toast } from 'react-toastify'
import { LANGUAGES } from '../../lib/indiaData'

function normaliseSubject(s, classList = [], branchList = []) {
  const subId = s.BR_CLS_SUB_ID || s.br_cls_sub_id || s.id
  const subName = s.BR_CLS_SUB_NAME || s.br_cls_sub_name || s.name
  const subDesc = s.BR_CLS_SUB_DESC || s.br_cls_sub_desc || s.desc || ''
  const subLang = s.BR_CLS_SUB_LANG || s.br_cls_sub_lang || 'English'
  const classId = s.BR_CLS_ID || s.br_cls_id || s.classId || s.class_id

  let className = s.class_name || s.SCHL_BR_CLASS_NM || s.schl_br_class_nm
  let branchId = s.branch_id || s.branchId || s.SCHL_BR_CENT_ID || s.schl_br_cent_id
  let branchName = s.branch_name || s.SCHL_BR_NM || s.schl_br_nm

  if (classId && Array.isArray(classList)) {
    const cls = classList.find(c => String(c.SCHL_BR_CLS_ID || c.schl_br_cls_id || c.id) === String(classId))
    if (cls) {
      if (!className) className = cls.SCHL_BR_CLASS_NM || cls.schl_br_class_nm || cls.name
      if (!branchId) branchId = cls.SCHL_BR_CENT_ID || cls.schl_br_cent_id || cls.branchId
    }
  }

  if (branchId && Array.isArray(branchList)) {
    const br = branchList.find(b => String(b.SCHL_BR_ID || b.schl_br_id || b.id) === String(branchId))
    if (br && !branchName) {
      branchName = br.SCHL_BR_NM || br.schl_br_nm || br.name
    }
  }

  return {
    ...s,
    BR_CLS_SUB_ID: subId,
    BR_CLS_SUB_NAME: subName,
    BR_CLS_SUB_DESC: subDesc,
    BR_CLS_SUB_LANG: subLang,
    BR_CLS_ID: classId,
    id: subId,
    name: subName,
    desc: subDesc,
    language: subLang,
    classId: classId,
    className: className || 'Unknown Class',
    branchId: branchId || '',
    branchName: branchName || '-'
  }
}

export default function Subjects() {
  const [subjects, setSubjects] = useState([])
  const [classes, setClasses] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState(null)
  const [errors, setErrors] = useState({})

  const currentUser = JSON.parse(sessionStorage.getItem('e_school_user') || '{}')
  const userRole = (currentUser.user_role || currentUser.role_id || currentUser.role || '').toLowerCase()
  const isBranchAdmin = userRole.includes('branch') && !userRole.includes('super')

  const [formData, setFormData] = useState({
    BR_CLS_SUB_ID: '',
    BR_CLS_ID: '',
    BR_CLS_SUB_NAME: '',
    BR_CLS_SUB_DESC: '',
    BR_CLS_SUB_LANG: 'English',
    branchId: currentUser.branch_id || currentUser.userId || ''
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const user = JSON.parse(sessionStorage.getItem('e_school_user') || '{}')
      const isSchoolAdmin = (user.user_role || user.role_id) === 'R_SCHOOLADMIN' || user.role === 'R_SCHOOLADMIN'
      const isBranchAdminRole = (user.user_role || user.role_id) === 'R_BRANCHADMIN' || user.role === 'R_BRANCHADMIN'

      const [subRes, clsRes, brRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/subjects`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/classes`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/branches?limit=1000`).catch(() => ({ data: [] }))
      ])
      
      let subjectList = Array.isArray(subRes.data) ? subRes.data : subRes.data?.data || []
      let classList = Array.isArray(clsRes.data) ? clsRes.data : clsRes.data?.data || []
      let branchList = Array.isArray(brRes.data) ? brRes.data : brRes.data?.data || []
      
      const centerId = String(user.user_id || user.id || user.userId || '')
      if (isSchoolAdmin && centerId) {
          const filteredBranches = branchList.filter(b => String(b.SCHL_BR_CENTER_ID || b.schl_br_center_id) === centerId)
          if (filteredBranches.length > 0) branchList = filteredBranches

          const validBranchIds = branchList.map(b => String(b.SCHL_BR_ID || b.schl_br_id))
          classList = classList.filter(c => validBranchIds.includes(String(c.SCHL_BR_CENT_ID || c.schl_br_cent_id || c.branchId)))
          const validClassIds = classList.map(c => String(c.SCHL_BR_CLS_ID || c.schl_br_cls_id || c.id))
          subjectList = subjectList.filter(s => validClassIds.includes(String(s.BR_CLS_ID || s.br_cls_id || s.classId)))
      } else if (isBranchAdminRole && centerId) {
          const filteredBranches = branchList.filter(b => String(b.SCHL_BR_ID || b.schl_br_id) === centerId)
          if (filteredBranches.length > 0) branchList = filteredBranches

          const validBranchIds = branchList.map(b => String(b.SCHL_BR_ID || b.schl_br_id))
          classList = classList.filter(c => validBranchIds.includes(String(c.SCHL_BR_CENT_ID || c.schl_br_cent_id || c.branchId)))
          const validClassIds = classList.map(c => String(c.SCHL_BR_CLS_ID || c.schl_br_cls_id || c.id))
          subjectList = subjectList.filter(s => validClassIds.includes(String(s.BR_CLS_ID || s.br_cls_id || s.classId)))
      }

      const normalizedSubjects = subjectList.map(s => normaliseSubject(s, classList, branchList))
      setSubjects(normalizedSubjects)
      setClasses(classList)
      setBranches(branchList)
    } catch (err) {
      toast.error('Failed to load data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function classNameFor(id) {
    const cls = classes.find(c => (c.SCHL_BR_CLS_ID || c.schl_br_cls_id || c.id) === id)
    return cls ? (cls.SCHL_BR_CLASS_NM || cls.schl_br_class_nm || cls.name) : id
  }

  function openModal(subject = null) {
    setErrors({})
    const defaultBranchId = isBranchAdmin
      ? (currentUser.branch_id || currentUser.userId || '')
      : ((branches.length === 1 ? (branches[0].SCHL_BR_ID || branches[0].schl_br_id) : '') || '')

    if (subject) {
      setEditingSubject(subject)
      const cls = classes.find(c => String(c.SCHL_BR_CLS_ID || c.schl_br_cls_id || c.id) === String(subject.BR_CLS_ID || subject.br_cls_id || subject.classId))
      const resolvedBranchId = subject.branchId || subject.branch_id || subject.SCHL_BR_CENT_ID || subject.schl_br_cent_id || (cls ? (cls.SCHL_BR_CENT_ID || cls.schl_br_cent_id || cls.branchId) : '') || defaultBranchId
      setFormData({
        BR_CLS_SUB_ID: subject.BR_CLS_SUB_ID || subject.br_cls_sub_id || subject.id || '',
        BR_CLS_ID: subject.BR_CLS_ID || subject.br_cls_id || subject.classId || '',
        BR_CLS_SUB_NAME: subject.BR_CLS_SUB_NAME || subject.br_cls_sub_name || subject.name || '',
        BR_CLS_SUB_DESC: subject.BR_CLS_SUB_DESC || subject.br_cls_sub_desc || subject.desc || '',
        BR_CLS_SUB_LANG: subject.language || 'English',
        branchId: resolvedBranchId || defaultBranchId
      })
    } else {
      setEditingSubject(null)
      setFormData({
        BR_CLS_SUB_ID: '',
        BR_CLS_ID: '',
        BR_CLS_SUB_NAME: '',
        BR_CLS_SUB_DESC: '',
        BR_CLS_SUB_LANG: 'English',
        branchId: defaultBranchId || ''
      })
    }
    setIsModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = {}
    // Subject name: Roman/English letters and single spaces only (no digits, no special characters).
    if (!formData.BR_CLS_SUB_NAME || !formData.BR_CLS_SUB_NAME.trim()) errs.BR_CLS_SUB_NAME = 'Subject name is required (blank spaces are not allowed).'
    else if (!/^[A-Za-z]+( [A-Za-z]+)*$/.test(formData.BR_CLS_SUB_NAME.trim())) errs.BR_CLS_SUB_NAME = 'Subject name can contain only letters and spaces.'
    if (!isBranchAdmin && branches.length > 0 && !formData.branchId) errs.branchId = 'Please select a branch.'
    if (!formData.BR_CLS_ID) errs.BR_CLS_ID = 'Please select a class.'
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    try {
      if (editingSubject) {
        const id = editingSubject.BR_CLS_SUB_ID || editingSubject.br_cls_sub_id || editingSubject.id
        await axios.put(`${import.meta.env.VITE_API_BASE_URL}/academic/subjects/${id}`, { ...formData, BR_CLS_SUB_NAME: formData.BR_CLS_SUB_NAME.trim() })
        toast.success('Subject updated successfully')
      } else {
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/academic/subjects`, { ...formData, BR_CLS_SUB_NAME: formData.BR_CLS_SUB_NAME.trim() })
        toast.success('Subject created successfully')
      }
      setIsModalOpen(false)
      loadData()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save subject')
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this subject?')) return
    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/academic/subjects/${id}`)
      toast.success('Subject deleted successfully')
      loadData()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete subject')
    }
  }

  return (
    <motion.div className="animate-fade-in" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Subjects</h1>
          <p className="page-subtitle">Manage curriculum subjects assigned to classes</p>
        </div>
        <button className="btn-primary" onClick={() => openModal()}>
          <FaPlus /> Add Subject
        </button>
      </div>

      <div className="glass-panel page-card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Subject Code</th>
                <th>Subject Name</th>
                <th>Language</th>
                {!isBranchAdmin && <th>Branch</th>}
                <th>Class</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isBranchAdmin ? 6 : 7} className="text-center">Loading...</td>
                </tr>
              ) : subjects.length === 0 ? (
                <tr>
                  <td colSpan={isBranchAdmin ? 6 : 7} className="text-center text-muted">No subjects found</td>
                </tr>
              ) : (
                subjects.map((s, idx) => {
                  const id = s.BR_CLS_SUB_ID || s.br_cls_sub_id || s.id
                  const name = s.BR_CLS_SUB_NAME || s.br_cls_sub_name || s.name
                  const lang = s.language || s.BR_CLS_SUB_LANG || 'English'
                  const classId = s.BR_CLS_ID || s.br_cls_id || s.classId
                  const desc = s.BR_CLS_SUB_DESC || s.br_cls_sub_desc || s.desc
                  const bName = s.branchName || '-'

                  return (
                    <tr key={id || idx}>
                      <td>
                        <div className="flex items-center gap-sm">
                          <FaBook className="text-muted" size={16} />
                          <span className="badge badge-info">{id}</span>
                        </div>
                      </td>
                      <td className="font-bold">{name}</td>
                      <td><span className="badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--clr-primary)' }}>{lang}</span></td>
                      {!isBranchAdmin && (
                        <td>
                          <div className="font-medium">{bName}</div>
                        </td>
                      )}
                      <td>{s.className || classNameFor(classId)}</td>
                      <td className="text-small text-muted">{desc || '-'}</td>
                      <td>
                        <div className="flex gap-sm">
                          <button className="btn-icon" onClick={() => openModal(s)} title="Edit"><FaEdit /></button>
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
            style={{ maxWidth: '600px' }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="modal-header">
              <h2 className="modal-title">{editingSubject ? 'Edit Subject' : 'New Subject'}</h2>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Subject Name <span className="form-required">*</span></label>
                  <input type="text" className={`form-control${errors.BR_CLS_SUB_NAME ? ' form-input-error' : ''}`} placeholder="e.g. Mathematics, Bengali" maxLength={50} value={formData.BR_CLS_SUB_NAME} onChange={e => setFormData({...formData, BR_CLS_SUB_NAME: e.target.value.replace(/[^A-Za-z ]/g, '').replace(/^\s+/, '').replace(/\s{2,}/g, ' ')})} required />
                  {errors.BR_CLS_SUB_NAME && <span className="form-error-msg">{errors.BR_CLS_SUB_NAME}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Subject Language / Medium <span className="form-required">*</span></label>
                  <select
                    className="form-control"
                    value={formData.BR_CLS_SUB_LANG}
                    onChange={e => setFormData({ ...formData, BR_CLS_SUB_LANG: e.target.value })}
                    required
                  >
                    {LANGUAGES.map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>

                {!isBranchAdmin && (
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Branch <span className="form-required">*</span></label>
                    <select
                      className={`form-control${errors.branchId ? ' form-input-error' : ''}`}
                      value={formData.branchId}
                      onChange={e => {
                        const newBranchId = e.target.value
                        const currCls = classes.find(c => String(c.SCHL_BR_CLS_ID || c.schl_br_cls_id || c.id) === String(formData.BR_CLS_ID))
                        const matches = currCls && String(currCls.SCHL_BR_CENT_ID || currCls.schl_br_cent_id || currCls.branchId) === String(newBranchId)
                        setFormData(prev => ({ 
                          ...prev, 
                          branchId: newBranchId, 
                          BR_CLS_ID: matches ? prev.BR_CLS_ID : '' 
                        }))
                      }}
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
                  <label className="form-label">Class <span className="form-required">*</span></label>
                  <select 
                    className={`form-control${errors.BR_CLS_ID ? ' form-input-error' : ''}`} 
                    value={formData.BR_CLS_ID} 
                    onChange={e => {
                      const selectedClassId = e.target.value
                      const cls = classes.find(c => String(c.SCHL_BR_CLS_ID || c.schl_br_cls_id || c.id) === String(selectedClassId))
                      const autoBranchId = cls ? (cls.SCHL_BR_CENT_ID || cls.schl_br_cent_id || cls.branchId) : ''
                      setFormData(prev => ({
                        ...prev,
                        BR_CLS_ID: selectedClassId,
                        branchId: prev.branchId || autoBranchId || ''
                      }))
                    }} 
                    required 
                    disabled={!isBranchAdmin && !formData.branchId && branches.length > 1}
                  >
                    <option value="">Select a class</option>
                    {classes.filter(c => !formData.branchId || String(c.SCHL_BR_CENT_ID || c.schl_br_cent_id || c.branchId) === String(formData.branchId)).map(c => {
                      const cid = c.SCHL_BR_CLS_ID || c.schl_br_cls_id || c.id
                      const cname = c.SCHL_BR_CLASS_NM || c.schl_br_class_nm || c.name
                      return <option key={cid} value={cid}>{cname}</option>
                    })}
                  </select>
                  {errors.BR_CLS_ID && <span className="form-error-msg">{errors.BR_CLS_ID}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input type="text" className="form-control" placeholder="Optional notes or details" value={formData.BR_CLS_SUB_DESC} onChange={e => setFormData({...formData, BR_CLS_SUB_DESC: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Subject</button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}
    </motion.div>
  )
}