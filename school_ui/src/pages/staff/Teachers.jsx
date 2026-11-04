import axios from '../../lib/axios'
import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'react-toastify'

import { motion } from 'framer-motion'
import { FaSearch, FaEdit, FaTrash, FaPlus, FaSchool, FaCheckCircle, FaTimesCircle, FaCircle, FaEnvelope, FaEye, FaExclamationCircle, FaCamera, FaTimes, FaUserCircle } from 'react-icons/fa'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import usePagination from '../../hooks/usePagination'
import useSortableData from '../../hooks/useSortableData'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import ConfirmModal from '../../components/common/ConfirmModal'
import { ApiErrorState } from '../../components/common/ErrorBoundary'
import { scrollToFirstError } from '../../lib/formValidation'


// DEPARTMENTS will now be fetched from the API

const AVATAR_CLRS = ['avatar-blue', 'avatar-green', 'avatar-orange', 'avatar-purple', 'avatar-teal']

function initials(name) {
  if (!name) return 'UN'
  const parts = name.split(' ')
  return parts.slice(-2).map((w) => (w[0] || '')).join('').toUpperCase() || 'UN'
}

// Backend (SCHL_BR_TCHR) only stores TCHR_ID/TCHR_NM/TCHR_EMAIL/TCHR_CONTACT_NO/TCHR_JOIN_DT —
// department, subjects, status, and classes aren't tracked yet, so we fall back to sensible defaults
function normaliseTeacher(t) {
  if (!t || typeof t !== 'object') return t
  return {
    id: t.id ?? t.TCHR_ID,
    name: t.name ?? t.TCHR_NM ?? 'Unnamed Teacher',
    aadhar: t.aadhar ?? t.TCHR_AADHAR ?? '',
    pan: t.pan ?? t.panCard ?? t.BR_TCHR_PAN ?? '',
    email: t.email ?? t.TCHR_EMAIL ?? '',
    phone: t.phone ?? t.TCHR_CONTACT_NO ?? '',
    branchId: t.branchId ?? t.branch_id ?? t.BR_TCHR_BR_ID ?? '',
    branchName: t.branchName ?? t.branch_name ?? 'Main Campus',
    subjects: t.subjects ?? '',
    subjectId: t.subject_id ?? t.subjectId ?? t.TCHR_SUB_ID ?? '',
    classId: t.classId ?? t.class_id ?? t.TCHR_CLASS_ID ?? t.assignedClassId ?? t.BR_TCHR_ASSIGNED_CLASS_ID ?? '',
    className: t.className ?? t.class_name ?? '',
    classes: Number(t.classes ?? (t.TCHR_CLASS_ID ? 1 : 0)),
    classNames: t.class_names ?? t.classNames ?? t.className ?? t.class_name ?? '',
    status: t.TCHR_STATUS ?? t.status ?? 'Active',
    joined: t.joined ?? t.TCHR_JOIN_DT ?? '',
  }
}

const EMPTY_FORM = { name: '', aadhar: '', pan: '', email: '', phone: '', branchId: '', subjectId: '', classId: '', status: 'Active', userId: '', password: '', user_img: '' }

// ─── Teacher Form Modal ────────────────────────────────────────────────────────
function TeacherFormModal({ onClose, onSaved, branches = [], subjects = [], classes = [], editingTeacher = null, isBranchAdmin = false, defaultBranchId = '' }) {
  const [form, setForm] = useState(editingTeacher ? {
    name: editingTeacher.name || '',
    aadhar: editingTeacher.aadhar || editingTeacher.TCHR_AADHAR || '',
    pan: editingTeacher.pan || editingTeacher.panCard || editingTeacher.BR_TCHR_PAN || '',
    email: editingTeacher.email || '',
    phone: editingTeacher.phone || '',
    branchId: editingTeacher.branchId || defaultBranchId,
    subjectId: editingTeacher.subjectId || editingTeacher.subject_id || '',
    classId: editingTeacher.classId || editingTeacher.class_id || '',
    status: editingTeacher.status || 'Active',
    userId: '',
    password: '',
    user_img: editingTeacher.user_img || editingTeacher.photo || ''
  } : { ...EMPTY_FORM, branchId: defaultBranchId })
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const fieldRefs = useRef({})
  const photoInputRef = useRef(null)

  const STEP1_FIELD_ORDER = ['name', 'aadhar', 'pan', 'email', 'phone', 'userId', 'password']
  const STEP2_FIELD_ORDER = ['branchId', 'classId', 'subjectId']

  const validateStep1 = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Full name is required.'
    else if (!/^[a-zA-Z\s]+$/.test(form.name.trim())) e.name = 'Name can only contain letters and spaces.'
    if (form.aadhar && form.aadhar.trim() && !/^\d{12}$/.test(form.aadhar.trim())) e.aadhar = 'Aadhar number must be exactly 12 digits.'
    if (form.pan && form.pan.trim() && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.pan.trim().toUpperCase())) {
      e.pan = 'Enter a valid Indian PAN (e.g. ABCDE1234F - 5 letters, 4 digits, 1 letter).'
    }
    if (!form.email.trim()) e.email = 'Email is required.'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email address.'
    if (form.phone && form.phone.trim() && !/^[6-9]\d{9}$/.test(form.phone.replace(/[^0-9]/g, '').slice(0, 10))) e.phone = 'Enter a valid 10-digit Indian number (starts with 6-9).'
    if (!editingTeacher && !form.userId.trim()) e.userId = 'User ID is required.'
    if (!editingTeacher && !form.password) e.password = 'Password is required.'
    else if (!editingTeacher && form.password.length < 6) e.password = 'Password must be at least 6 characters long.'
    return e
  }

  const validateStep2 = () => {
    const e = {}
    if (!isBranchAdmin && !form.branchId) e.branchId = 'Please select a branch.'
    if (!form.classId) e.classId = 'Please assign a specific class to the teacher.'
    if (!form.subjectId) e.subjectId = 'Please select an assigned subject.'
    return e
  }

  const handleNext = () => {
    const errs = validateStep1()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      scrollToFirstError(errs, fieldRefs.current, STEP1_FIELD_ORDER)
      return
    }
    setErrors({})
    setStep(2)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    let processedValue = value
    if (name === 'phone') {
      processedValue = value.replace(/[^0-9]/g, '').slice(0, 10)
    } else if (name === 'aadhar') {
      processedValue = value.replace(/[^0-9]/g, '').slice(0, 12)
    } else if (name === 'pan') {
      processedValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)
    } else if (name === 'name') {
      processedValue = value.replace(/[^a-zA-Z\s]/g, '')
    }

    setForm((prev) => {
      const next = { ...prev, [name]: processedValue }
      // Auto-fill User ID when Email Address is typed (if adding new teacher or if userId tracked email)
      if (name === 'email' && !editingTeacher) {
        next.userId = processedValue.trim().toLowerCase()
      }
      // Branch drives the Class/Subject option lists. Changing it invalidates any
      // previously chosen class/subject, so reset them instead of leaving stale
      // IDs that render the selects blank while still passing validation.
      if (name === 'branchId') {
        next.classId = ''
        next.subjectId = ''
      }
      return next
    })
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
    if (name === 'email' && errors.userId) setErrors((prev) => ({ ...prev, userId: '' }))
    if (name === 'branchId') {
      setErrors((prev) => ({ ...prev, classId: '', subjectId: '' }))
    }
  }

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, WebP, etc.)')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB')
      return
    }
    const reader = new FileReader()
    reader.onload = (event) => {
      setForm(prev => ({ ...prev, user_img: event.target.result }))
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    // Only Step 2 is submittable. Pressing Enter inside a Step-1 text input can
    // trigger an implicit form submission — without this guard it would run
    // validateStep2() and paint red alerts on the Branch/Class/Subject selects
    // before the user has even reached them.
    if (step !== 2) return
    const errs = validateStep2()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      scrollToFirstError(errs, fieldRefs.current, STEP2_FIELD_ORDER)
      return
    }

    setSaving(true)
    try {
      const selBranch = branches.find(b => String(b.id) === String(form.branchId))
      const selSubject = subjects.find(s => String(s.id) === String(form.subjectId))
      const selClass = classes.find(c => String(c.id || c.SCHL_BR_CLS_ID) === String(form.classId))

      const payload = {
        TCHR_NM: form.name.trim(),
        TCHR_AADHAR: form.aadhar.trim(),
        BR_TCHR_PAN: form.pan.trim().toUpperCase(),
        TCHR_EMAIL: form.email.trim().toLowerCase(),
        TCHR_CONTACT_NO: form.phone.trim(),
        USER_ID: form.userId.trim(),
        PASSWORD: form.password,
        BR_TCHR_BR_ID: form.branchId || defaultBranchId,
        TCHR_SUB_ID: form.subjectId,
        TCHR_CLASS_ID: form.classId,
        TCHR_STATUS: form.status,
        user_img: form.user_img || ''
      }
      
      let data;
      if (editingTeacher) {
        if (!payload.PASSWORD) delete payload.PASSWORD;
        if (!payload.USER_ID) delete payload.USER_ID;
        const res = await axios.put(`${import.meta.env.VITE_API_BASE_URL}/staff/teachers/${editingTeacher.id}`, payload)
        data = res.data;
      } else {
        const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/staff/teachers`, payload)
        data = res.data;
      }
      const saved = normaliseTeacher({ 
        ...(data?.data ?? data), 
        subjects: selSubject ? selSubject.name : '',
        class_names: selClass ? (selClass.name || selClass.SCHL_BR_CLASS_NM) : (selSubject ? (selSubject.className || selSubject.class_name || '') : ''),
        classes: 1,
        branchName: selBranch ? selBranch.name : 'Main Campus',
        branch_id: form.branchId || defaultBranchId
      })
      toast.success(`${form.name} has been ${editingTeacher ? 'updated' : 'added to faculty'}.`)
      setStep(1)
      onSaved(saved)
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${editingTeacher ? 'update' : 'add'} teacher. Please try again.`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen
      title={editingTeacher ? 'Edit Faculty' : 'Add New Faculty'}
      subtitle={editingTeacher ? 'Update teacher details in the system' : 'Register a new teacher to the E-School system'}
      onClose={onClose}
      size="md"
      footer={
        step === 1 ? (
          <>
            <button type="button" id="cancel-add-teacher" className="btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="button" id="next-add-teacher" className="btn-primary" onClick={handleNext}>
              Next
            </button>
          </>
        ) : (
          <>
            <button type="button" id="back-add-teacher" className="btn-secondary" onClick={() => { setStep(1); setErrors({}) }} disabled={saving}>
              Back
            </button>
            <button type="submit" form="add-teacher-form" className="btn-primary" disabled={saving}>
              {saving ? (
                <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} aria-hidden="true" /> {editingTeacher ? 'Updating…' : 'Adding…'}</>
              ) : (
                <>{editingTeacher ? 'Update Teacher' : 'Enrol Teacher'}</>
              )}
            </button>
          </>
        )
      }
    >
      <form id="add-teacher-form" onSubmit={handleSubmit} noValidate>
        <div className="modal-body">
          <div className="form-step-indicator">
            <span className={`form-step-dot${step === 1 ? ' active' : ' done'}`}>1</span>
            <span className="form-step-label">Contact Info</span>
            <span className="form-step-line" />
            <span className={`form-step-dot${step === 2 ? ' active' : ''}`}>2</span>
            <span className="form-step-label">Role & Subjects</span>
          </div>

          {step === 1 && (
            <>
              {/* Photo Upload Section */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', background: 'rgba(0, 90, 158, 0.04)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0, 90, 158, 0.1)', marginBottom: '16px' }}>
                <div style={{ position: 'relative' }}>
                  {form.user_img ? (
                    <img
                      src={form.user_img}
                      alt="Teacher Preview"
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
                    Profile Photo
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
                      <FaCamera style={{ marginRight: '5px' }} /> {form.user_img ? 'Change Photo' : 'Upload Photo'}
                    </button>
                    {form.user_img && (
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '0.78rem', color: 'var(--clr-danger)' }}
                        onClick={() => setForm(prev => ({ ...prev, user_img: '' }))}
                      >
                        <FaTimes style={{ marginRight: '4px' }} /> Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="form-row-2col">
                <div className="form-group">
                  <label htmlFor="teacher-name" className="form-label">Full Name <span className="form-required">*</span></label>
                  <input
                    id="teacher-name"
                    name="name"
                    type="text"
                    ref={(el) => (fieldRefs.current.name = el)}
                    className={`form-input${errors.name ? ' form-input-error' : ''}`}
                    placeholder="e.g. Ananya Sharma"
                    value={form.name}
                    onChange={handleChange}
                    autoFocus
                  />
                  {errors.name && <span className="form-error-msg"><FaExclamationCircle /> {errors.name}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="teacher-aadhar" className="form-label">Aadhar Number (12 Digits)</label>
                  <input
                    id="teacher-aadhar"
                    name="aadhar"
                    type="text"
                    inputMode="numeric"
                    maxLength={12}
                    ref={(el) => (fieldRefs.current.aadhar = el)}
                    className={`form-input${errors.aadhar ? ' form-input-error' : ''}`}
                    placeholder="e.g. 123456789012"
                    value={form.aadhar}
                    onChange={handleChange}
                  />
                  {errors.aadhar && <span className="form-error-msg"><FaExclamationCircle /> {errors.aadhar}</span>}
                </div>
              </div>

              <div className="form-row-2col">
                <div className="form-group">
                  <label htmlFor="teacher-pan" className="form-label">PAN Card Number <span className="form-hint">(e.g. ABCDE1234F)</span></label>
                  <input
                    id="teacher-pan"
                    name="pan"
                    type="text"
                    maxLength={10}
                    style={{ textTransform: 'uppercase' }}
                    ref={(el) => (fieldRefs.current.pan = el)}
                    className={`form-input${errors.pan ? ' form-input-error' : ''}`}
                    placeholder="e.g. ABCDE1234F"
                    value={form.pan}
                    onChange={handleChange}
                  />
                  {errors.pan && <span className="form-error-msg"><FaExclamationCircle /> {errors.pan}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="teacher-email" className="form-label">Email Address <span className="form-required">*</span></label>
                  <input
                    id="teacher-email"
                    name="email"
                    type="email"
                    ref={(el) => (fieldRefs.current.email = el)}
                    className={`form-input${errors.email ? ' form-input-error' : ''}`}
                    placeholder="teacher@eschool.com"
                    value={form.email}
                    onChange={handleChange}
                  />
                  {errors.email && <span className="form-error-msg"><FaExclamationCircle /> {errors.email}</span>}
                </div>
              </div>

              <div className="form-row-2col">
                <div className="form-group">
                  <label htmlFor="teacher-phone" className="form-label">Phone Number <span className="form-hint">(10-digit number)</span></label>
                  <input
                    id="teacher-phone"
                    name="phone"
                    type="tel"
                    maxLength={10}
                    ref={(el) => (fieldRefs.current.phone = el)}
                    className={`form-input${errors.phone ? ' form-input-error' : ''}`}
                    placeholder="e.g. 9876543210"
                    value={form.phone}
                    onChange={handleChange}
                    onKeyPress={(e) => { if (!/[0-9]/.test(e.key)) e.preventDefault(); }}
                  />
                  {errors.phone && <span className="form-error-msg"><FaExclamationCircle /> {errors.phone}</span>}
                </div>
              </div>

              <div className="form-row-2col">
                <div className="form-group">
                  <label htmlFor="teacher-userid" className="form-label">User ID (Login) {!editingTeacher && <span className="form-required">*</span>}</label>
                  <input
                    id="teacher-userid"
                    name="userId"
                    type="text"
                    ref={(el) => (fieldRefs.current.userId = el)}
                    className={`form-input${errors.userId ? ' form-input-error' : ''}`}
                    placeholder="e.g. ananya.sharma"
                    value={form.userId}
                    onChange={handleChange}
                    disabled={!!editingTeacher}
                    required={!editingTeacher}
                  />
                  {errors.userId && <span className="form-error-msg"><FaExclamationCircle /> {errors.userId}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="teacher-password" className="form-label">Password {!editingTeacher && <span className="form-required">*</span>}</label>
                  <input
                    id="teacher-password"
                    name="password"
                    type="password"
                    ref={(el) => (fieldRefs.current.password = el)}
                    className={`form-input${errors.password ? ' form-input-error' : ''}`}
                    placeholder={editingTeacher ? "Leave blank to keep unchanged" : "Enter a secure password"}
                    value={form.password}
                    onChange={handleChange}
                    required={!editingTeacher}
                  />
                  {errors.password && <span className="form-error-msg"><FaExclamationCircle /> {errors.password}</span>}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              {!isBranchAdmin && (
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label" htmlFor="tchr-branch">Branch <span className="form-required">*</span></label>
                  <select
                    id="tchr-branch"
                    name="branchId"
                    ref={(el) => (fieldRefs.current.branchId = el)}
                    className={`form-control${errors.branchId ? ' form-input-error' : ''}`}
                    value={form.branchId}
                    onChange={handleChange}
                  >
                    <option value="">Select Branch</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  {errors.branchId && <span className="form-error-msg"><FaExclamationCircle /> {errors.branchId}</span>}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="teacher-class" className="form-label">Assigned Class <span className="form-required">*</span></label>
                <select
                  id="teacher-class"
                  name="classId"
                  ref={(el) => (fieldRefs.current.classId = el)}
                  className={`form-input${errors.classId ? ' form-input-error' : ''}`}
                  value={form.classId}
                  onChange={handleChange}
                  required
                >
                  <option value="">— Select Class —</option>
                  {classes.filter(c => !form.branchId || String(c.branchId || c.SCHL_BR_CENT_ID || '') === String(form.branchId) || !c.branchId).map((c) => (
                    <option key={c.id || c.SCHL_BR_CLS_ID} value={c.id || c.SCHL_BR_CLS_ID}>
                      {c.name || c.SCHL_BR_CLASS_NM}
                    </option>
                  ))}
                </select>
                <span className="form-hint">Each teacher is assigned primarily to 1 specific class.</span>
                {errors.classId && <span className="form-error-msg"><FaExclamationCircle /> {errors.classId}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="teacher-subject" className="form-label">Assigned Subject <span className="form-required">*</span></label>
                <select
                  id="teacher-subject"
                  name="subjectId"
                  ref={(el) => (fieldRefs.current.subjectId = el)}
                  className={`form-input${errors.subjectId ? ' form-input-error' : ''}`}
                  value={form.subjectId}
                  onChange={handleChange}
                  required
                >
                  <option value="">— Select Subject —</option>
                  {subjects.filter(s => !form.branchId || String(s.branchId || '') === String(form.branchId) || !s.branchId).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.className ? `— (${s.className})` : (s.code ? `(${s.code})` : '')}
                    </option>
                  ))}
                </select>
                <span className="form-hint">Select the primary subject taught by this faculty member.</span>
                {errors.subjectId && <span className="form-error-msg"><FaExclamationCircle /> {errors.subjectId}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="teacher-status" className="form-label">Employment Status</label>
                <div className="status-radio-group" role="group" aria-label="Employment status">
                  {['Active', 'On Leave', 'Inactive'].map((s) => (
                    <label key={s} className={`status-radio-option${form.status === s ? ' selected' : ''}`}>
                      <input
                        type="radio"
                        name="status"
                        value={s}
                        checked={form.status === s}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <span className={`badge ${s === 'Active' ? 'badge-success' : s === 'On Leave' ? 'badge-warning' : 'badge-danger'}`}>
                        {s}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </form>
    </Modal>
  )
}

// ─── Main Teachers Page ───────────────────────────────────────────────────────
export default function Teachers() {
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [branchFilter, setBranchFilter] = useState('All')
  const [branches, setBranches] = useState([])
  const [subjects, setSubjects] = useState([])
  const [classes, setClasses] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [editingTeacher, setEditingTeacher] = useState(null)
  const [error, setError] = useState('')

  const currentUser = JSON.parse(sessionStorage.getItem('e_school_user') || '{}')
  const userRole = (currentUser.user_role || currentUser.role_id || currentUser.role || '').toLowerCase()
  const isBranchAdmin = userRole.includes('branch') && !userRole.includes('super')
  const defaultBranchId = isBranchAdmin ? (currentUser.branch_id || currentUser.userId || '') : ''

  // ── Fetch teachers from API ──
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      setError('')
      const user = JSON.parse(sessionStorage.getItem('e_school_user') || '{}')
      const isSchoolAdmin = (user.user_role || user.role_id) === 'R_SCHOOLADMIN' || user.role === 'R_SCHOOLADMIN'
      const isBranchAdminRole = (user.user_role || user.role_id) === 'R_BRANCHADMIN' || user.role === 'R_BRANCHADMIN'

      const params = {}
      if (statusFilter !== 'All') params.status = statusFilter
      params.limit = 1000

      const [brRes, subRes, clsRes, tRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/branches?limit=1000`).catch(() => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/subjects?limit=1000`).catch(() => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/classes?limit=1000`).catch(() => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/staff/teachers`, { params }).catch(() => ({ data: [] }))
      ])

      let rawBr = Array.isArray(brRes.data) ? brRes.data : brRes.data?.data ?? []
      if (isSchoolAdmin) {
         const centerId = String((user.user_id || user.id))
         rawBr = rawBr.filter(b => String(b.SCHL_BR_CENTER_ID || b.schl_br_center_id) === centerId)
      } else if (isBranchAdminRole) {
         const branchId = String((user.user_id || user.id))
         rawBr = rawBr.filter(b => String(b.SCHL_BR_ID || b.schl_br_id) === branchId)
      }
      setBranches(rawBr.map(b => ({ id: b.SCHL_BR_ID || b.id, name: b.SCHL_BR_NM || b.name || 'Branch' })))

      let rawCls = Array.isArray(clsRes.data) ? clsRes.data : clsRes.data?.data ?? []
      if (isSchoolAdmin || isBranchAdminRole) {
         const validBranchIds = rawBr.map(b => String(b.SCHL_BR_ID || b.id))
         rawCls = rawCls.filter(c => validBranchIds.includes(String(c.SCHL_BR_CENT_ID || c.schl_br_cent_id || c.branchId)))
      }
      setClasses(rawCls.map(c => ({
        id: c.SCHL_BR_CLS_ID || c.schl_br_cls_id || c.id,
        name: c.SCHL_BR_CLASS_NM || c.schl_br_class_nm || c.name,
        branchId: c.SCHL_BR_CENT_ID || c.schl_br_cent_id || c.branchId
      })))

      const rawSub = Array.isArray(subRes.data) ? subRes.data : subRes.data?.data ?? []
      setSubjects(rawSub.map(s => ({
        id: s.BR_CLS_SUB_ID || s.br_cls_sub_id || s.id,
        name: s.BR_CLS_SUB_NAME || s.br_cls_sub_name || s.name || 'Subject',
        code: s.BR_CLS_SUB_DESC || s.br_cls_sub_desc || s.code || '',
        className: s.class_name || s.className || '',
        classId: s.BR_CLS_ID || s.br_cls_id || s.class_id || '',
        branchId: s.branch_id || s.branchId || ''
      })))

      let raw = Array.isArray(tRes.data) ? tRes.data : tRes.data?.data ?? []
      if (isSchoolAdmin || isBranchAdminRole) {
          const validBranchIds = rawBr.map(b => String(b.SCHL_BR_ID || b.id))
          raw = raw.filter(t => validBranchIds.includes(String(t.BR_TCHR_BR_ID || t.br_tchr_br_id || t.branchId || t.branch_id)))
      }
      setTeachers(raw.map(normaliseTeacher))
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('Couldn\u2019t load the faculty list. Please try again.')
      setTeachers([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { 
    loadData() 
  }, [loadData])

  // ── Client-side search filter (debounced to avoid re-filtering on every keystroke) ──
  const debouncedSearch = useDebouncedValue(search, 300)
  const filtered = teachers.filter((t) => {
    const matchBranch = branchFilter === 'All' || String(t.branchId) === String(branchFilter) || t.branchName === branchFilter
    const haystack = `${t.name} ${t.aadhar ?? ''} ${t.pan ?? ''} ${t.email} ${t.subjects ?? ''} ${t.branchName ?? ''}`.toLowerCase()
    const matchSearch = !debouncedSearch || haystack.includes(debouncedSearch.toLowerCase())
    return matchBranch && matchSearch
  })

  const { sortedItems: sortedTeachers, sortConfig, requestSort } = useSortableData(filtered)

  const pagination = usePagination(sortedTeachers, 10)

  // ── Stats derived from full list ──
  const counts = {
    total: teachers.length,
    active: teachers.filter((t) => t.status === 'Active').length,
    onLeave: teachers.filter((t) => t.status === 'On Leave').length,
    inactive: teachers.filter((t) => t.status === 'Inactive').length,
  }

  // ── Handlers ──
  const handleTeacherAdded = (updatedTeacher) => {
    if (editingTeacher) {
      setTeachers((prev) => prev.map(t => t.id === updatedTeacher.id ? updatedTeacher : t))
    } else {
      setTeachers((prev) => [updatedTeacher, ...prev])
    }
    setShowModal(false)
    setEditingTeacher(null)
  }
  
  const handleEdit = (teacher) => {
    setEditingTeacher(teacher)
    setShowModal(true)
  }

  const requestDelete = (teacher) => setDeleteTarget(teacher)

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const teacher = deleteTarget
    setDeletingId(teacher.id)
    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/staff/teachers/${teacher.id}`)
      setTeachers((prev) => prev.filter((t) => t.id !== teacher.id))
      toast.success(`${teacher.name} has been removed.`)
      setDeleteTarget(null)
    } catch {
      toast.error('Failed to remove teacher.')
    } finally {
      setDeletingId(null)
    }
  }

  const columns = [
    {
      label: 'Teacher',
      sortKey: 'name',
      exportKey: 'name',
      render: (t, i) => (
        <div className="filter-row">
          <div className={`avatar avatar-md ${AVATAR_CLRS[i % AVATAR_CLRS.length]}`}>
            {initials(t.name)}
          </div>
          <div>
            <div className="font-bold" style={{ fontSize: '0.875rem' }}>{t.name}</div>
            <div className="text-muted">ID: TCH-{String(t.id).padStart(3, '0')}</div>
            <div className="flex gap-sm items-center flex-wrap" style={{ fontSize: '0.78rem' }}>
              {t.aadhar && <span className="text-muted">Aadhar: {t.aadhar}</span>}
              {t.pan && <span className="badge" style={{ fontSize: '0.72rem', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', padding: '2px 6px' }}>PAN: {t.pan}</span>}
            </div>
          </div>
        </div>
      ),
    },
    ...(!isBranchAdmin ? [{
      label: 'Branch',
      sortKey: 'branchName',
      exportKey: 'branchName',
      render: (t) => (
        <span className="badge badge-info" style={{ background: 'rgba(0, 90, 158, 0.08)', color: 'var(--clr-primary, #005a9e)', border: '1px solid rgba(0, 90, 158, 0.2)' }}>
          {t.branchName || 'Main Campus'}
        </span>
      ),
    }] : []),
    {
      label: 'Subject Mapping',
      sortKey: 'subjects',
      exportKey: 'subjects',
      render: (t) => (
        <div style={{ fontSize: '0.82rem', color: 'var(--clr-text-secondary)', maxWidth: '200px' }}>
          {t.subjects ?? '—'}
        </div>
      ),
    },
    {
      label: 'Contact',
      sortKey: 'email',
      exportKey: 'email',
      render: (t) => (
        <div style={{ fontSize: '0.82rem' }}>
          <div>{t.email}</div>
          <div className="text-muted">{t.phone ?? '—'}</div>
        </div>
      ),
    },
    {
      label: 'Class',
      sortKey: 'classes',
      exportKey: 'classes',
      render: (t) => (
        <span 
          className="badge badge-info" 
          title={t.classNames || undefined}
        >
          {t.classNames ? t.classNames : '1 Class'}
        </span>
      ),
    },
    {
      label: 'Status',
      sortKey: 'status',
      exportKey: 'status',
      render: (t) => (
        <span className={`badge ${t.status === 'Active' ? 'badge-success' :
            t.status === 'On Leave' ? 'badge-warning' : 'badge-danger'
          }`}>
          {t.status}
        </span>
      ),
    },
  ]

  const actions = [
    { label: 'View', icon: <FaEye />, ariaLabel: (t) => `View ${t.name}` },
    { label: 'Edit', icon: <FaEdit />, ariaLabel: (t) => `Edit ${t.name}`, onClick: (t) => handleEdit(t) },
    {
      label: 'Delete',
      icon: <FaTrash />,
      ariaLabel: (t) => `Delete ${t.name}`,
      onClick: (t) => requestDelete(t),
      disabled: (t) => deletingId === t.id,
    },
  ]

  if (error && teachers.length === 0) {
    return <ApiErrorState message={error} onRetry={loadData} />
  }

  return (
    <motion.div className="animate-fade-in" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Teachers</h1>
          <p className="page-subtitle">{counts.total} faculty members registered</p>
        </div>
        <div className="flex gap-md">
          <button id="invite-teacher-btn" className="btn-secondary"><FaEnvelope /> Invite</button>
          <button id="add-teacher-btn" className="btn-primary" onClick={() => { setEditingTeacher(null); setShowModal(true); }}>
            <FaPlus /> Add Teacher
          </button>
        </div>
      </div>

      {/* ── Quick Stats ── */}
      <div className="metrics-grid">
        <div className="glass-panel metric-card animate-fade-in-up">
          <div className="metric-icon-wrap metric-icon-blue"><FaSchool /></div>
          <div className="metric-label">Total Faculty</div>
          <div className="metric-value">{counts.total}</div>
        </div>
        <div className="glass-panel metric-card animate-fade-in-up">
          <div className="metric-icon-wrap metric-icon-green"><FaCheckCircle /></div>
          <div className="metric-label">Active</div>
          <div className="metric-value">{counts.active}</div>
        </div>
        <div className="glass-panel metric-card animate-fade-in-up">
          <div className="metric-icon-wrap metric-icon-orange"><FaCircle style={{ color: "orange" }} /></div>
          <div className="metric-label">On Leave</div>
          <div className="metric-value">{counts.onLeave}</div>
        </div>
        <div className="glass-panel metric-card animate-fade-in-up">
          <div className="metric-icon-wrap metric-icon-red"><FaTimesCircle /></div>
          <div className="metric-label">Inactive</div>
          <div className="metric-value">{counts.inactive}</div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="glass-panel page-card">
        <div className="flex items-center gap-md" style={{ flexWrap: 'wrap' }}>
          <div className="header-search">
            <span className="header-search-icon"><FaSearch /></span>
            <input
              id="teachers-search"
              className="header-search-input"
              type="search"
              placeholder="Search by name, Aadhar, subject, email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search teachers"
            />
          </div>

          {!isBranchAdmin && (
            <select
              id="teachers-branch-filter"
              className="form-input"
              style={{ width: 'auto', minWidth: '160px' }}
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              aria-label="Filter by branch"
            >
              <option value="All">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}

          <select
            id="teachers-status-filter"
            className="form-input"
            style={{ width: 'auto', minWidth: '140px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="On Leave">On Leave</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* ── Data Table ── */}
      <DataTable
        columns={columns}
        rows={pagination.pageItems}
        loading={loading}
        search={search}
        onClearSearch={() => setSearch('')}
        emptyTitle="No teachers registered yet"
        emptySubtitle="Add your first teacher to start building your faculty roster."
        emptyCtaLabel="Add Teacher"
        onEmptyCta={() => { setEditingTeacher(null); setShowModal(true); }}
        emptyIcon={FaSchool}
        exportFilename="teachers.csv"
        exportColumnMap={{ Name: 'name', Aadhar: 'aadhar', PAN: 'pan', Email: 'email', Phone: 'phone', Branch: 'branchName', Subjects: 'subjects', Classes: 'classes', Status: 'status' }}
        itemLabel="teachers"
        actions={actions}
        pagination={pagination}
        sortConfig={sortConfig}
        requestSort={requestSort}
      />

      {/* ── Modal ── */}
      {showModal && (
        <TeacherFormModal
          onClose={() => { setShowModal(false); setEditingTeacher(null); }}
          onSaved={handleTeacherAdded}
          branches={branches}
          subjects={subjects}
          classes={classes}
          editingTeacher={editingTeacher}
          isBranchAdmin={isBranchAdmin}
          defaultBranchId={defaultBranchId}
        />
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Remove teacher?"
        message={deleteTarget ? `Remove ${deleteTarget.name} from faculty? This cannot be undone.` : ''}
        confirmLabel="Remove"
        busy={deletingId === deleteTarget?.id}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </motion.div>
  )
}
