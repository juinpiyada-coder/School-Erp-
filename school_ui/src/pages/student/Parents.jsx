import axios from '../../lib/axios'
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { FaSearch, FaCog, FaEdit, FaTrash, FaPlus, FaCheckCircle, FaCommentDots, FaUserFriends, FaExclamationCircle, FaEye, FaEyeSlash, FaCamera, FaTimes, FaUserCircle } from 'react-icons/fa'
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

function normaliseParent(p) {
  let stuList = []
  if (Array.isArray(p.students)) {
    stuList = p.students
  } else if (p.student_names) {
    stuList = String(p.student_names).split(',').map(s => s.trim()).filter(Boolean)
  }

  return {
    id: p.PRNT_ID || p.prnt_id || p.id,
    name: p.PRNT_NM || p.prnt_nm || p.name || 'Unknown',
    aadhar: p.PRNT_AADHAR || p.prnt_aadhar || p.aadhar || '',
    email: p.PRNT_EMAILID || p.PRNT_EMAIL || p.prnt_email || p.email || 'No Email',
    phone: p.PRNT_CONTACTNO || p.PRNT_CONTACT_NO || p.prnt_contact_no || p.phone || 'No Phone',
    relation: p.relation || p.PRNT_RELATION || 'Guardian',
    occupation: p.occupation || 'N/A',
    status: p.status || 'Active',
    userId: p.USER_ID || p.user_id || p.userId || '',
    user_img: p.user_img || p.USER_IMG || '',
    students: stuList,
    raw: p,
  }
}

const EMPTY_FORM = { name: '', aadhar: '', relation: '', phone: '', occupation: '', email: '', status: 'Active', userId: '', password: '', user_img: '' }

const PARENT_FIELD_ORDER = ['name', 'aadhar', 'relation', 'phone', 'occupation', 'email', 'userId', 'password']

export default function Parents() {
  const [parents, setParents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  const loadParents = async () => {
    try {
      setLoading(true)
      setError('')
      const { data } = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/student/parents?limit=1000`)
      const items = Array.isArray(data) ? data : data?.data || []
      setParents(items.map(normaliseParent))
    } catch (err) {
      console.error('Failed to fetch parents:', err)
      setError('Couldn\u2019t load guardians. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadParents()
  }, [])

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

  const openModal = (parent = null) => {
    if (parent) {
      setFormData({
        name: parent.name || '',
        aadhar: parent.aadhar || '',
        relation: parent.relation || '',
        phone: parent.phone || '',
        occupation: parent.occupation || '',
        email: parent.email === 'No Email' ? '' : (parent.email || ''),
        status: parent.status || 'Active',
        userId: parent.userId || parent.raw?.USER_ID || parent.raw?.user_id || '',
        password: '',
        user_img: parent.user_img || parent.raw?.USER_IMG || '',
      })
      setEditingId(parent.id)
    } else {
      setFormData({ ...EMPTY_FORM })
      setEditingId(null)
    }
    setErrors({})
    setShowPassword(false)
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {}
    if (!formData.name.trim()) errs.name = 'Guardian name is required.'
    else if (!/^[a-zA-Z\s]+$/.test(formData.name.trim())) errs.name = 'Name can only contain letters and spaces.'
    if (formData.aadhar && formData.aadhar.trim() && !/^\d{12}$/.test(formData.aadhar.trim())) errs.aadhar = 'Aadhar must be exactly 12 digits.'
    if (!formData.relation) errs.relation = 'Please select a relationship.'
    if (!/^[6-9]\d{9}$/.test(formData.phone.replace(/[^0-9]/g, '').slice(0, 10))) errs.phone = 'Enter a valid 10-digit Indian number (starts with 6-9)'
    if (!formData.occupation.trim()) errs.occupation = 'Occupation is required.'
    if (formData.email && formData.email.trim() && !/^\S+@\S+\.\S+$/.test(formData.email)) errs.email = 'Please enter a valid email address'
    if (formData.userId && formData.userId.trim() && !editingId && !formData.password) {
      errs.password = 'Password is required when providing a Login ID.'
    }
    if (formData.password && formData.password.length < 6) {
      errs.password = 'Password must be at least 6 characters long.'
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      scrollToFirstError(errs, fieldRefs.current, PARENT_FIELD_ORDER)
      return
    }
    setErrors({})
    try {
      const payload = {
        PRNT_NM: formData.name,
        PRNT_AADHAR: formData.aadhar.trim(),
        relation: formData.relation,
        PRNT_CONTACT_NO: formData.phone,
        occupation: formData.occupation,
        PRNT_EMAIL: formData.email || '',
        status: formData.status || 'Active',
        USER_ID: formData.userId ? formData.userId.trim() : '',
        PASSWORD: formData.password || '',
        user_img: formData.user_img || ''
      };

      if (editingId) {
        await axios.put(`${import.meta.env.VITE_API_BASE_URL}/student/parents/${editingId}`, payload);
      } else {
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/student/parents`, payload);
      }
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ ...EMPTY_FORM });
      await loadParents();
    } catch (err) {
      console.error('Save failed:', err);
      alert('Save failed: ' + (err.response?.data?.message || err.message));
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/student/parents/${deleteTarget.id}`);
      setParents(parents.filter(p => p.id !== deleteTarget.id));
      setDeleteTarget(null)
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Delete failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setDeleting(false)
    }
  }


  const debouncedSearch = useDebouncedValue(search, 300)
  const filtered = parents.filter((p) =>
    `${p.name} ${p.aadhar || ''} ${p.email} ${p.userId || ''} ${(p.students || []).join(' ')}`.toLowerCase().includes(debouncedSearch.toLowerCase())
  )

  const { sortedItems: sortedParents, sortConfig, requestSort } = useSortableData(filtered)

  const pagination = usePagination(sortedParents, 10)

  const columns = [
    {
      label: 'Guardian',
      sortKey: 'name',
      exportKey: 'name',
      render: (p, i) => (
        <div className="filter-row">
          <div className={`avatar avatar-md ${AVATAR_CLRS[i % AVATAR_CLRS.length]}`}>
            {initials(p.name)}
          </div>
          <div>
            <div className="font-bold" style={{ fontSize: '0.875rem' }}>{p.name}</div>
            <div className="text-muted">ID: {String(p.id).startsWith('PRNT_') ? p.id : `PAR-${p.id}`}</div>
            {p.aadhar && <div className="text-muted" style={{ fontSize: '0.78rem' }}>Aadhar: {p.aadhar}</div>}
            {p.userId && (
              <div style={{ fontSize: '0.72rem', color: 'var(--clr-accent)', fontFamily: 'monospace', marginTop: 2 }}>
                Login: <strong>{p.userId}</strong>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      label: 'Relation',
      sortKey: 'relation',
      exportKey: 'relation',
      render: (p) => <span className="badge badge-info">{p.relation}</span>,
    },
    {
      label: 'Contact',
      sortKey: 'email',
      exportKey: 'email',
      render: (p) => (
        <div style={{ fontSize: '0.82rem' }}>
          <div>{p.email}</div>
          <div className="text-muted">{p.phone}</div>
        </div>
      ),
    },
    {
      label: 'Linked Students',
      sortKey: 'studentCount',
      exportKey: 'students',
      accessor: (p) => (p.students || []).length,
      render: (p) => (
        (p.students || []).map((s) => (
          <span key={typeof s === 'object' ? s.id : s} className="badge badge-success" style={{ marginRight: 4 }}>
            {typeof s === 'object' ? s.name : s}
          </span>
        ))
      ),
    },
    {
      label: 'Occupation',
      sortKey: 'occupation',
      exportKey: 'occupation',
      className: 'text-muted',
    },
    {
      label: 'Status',
      sortKey: 'status',
      exportKey: 'status',
      render: (p) => (
        <span className={`badge ${p.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>
          {p.status}
        </span>
      ),
    },
  ]

  const actions = [
    {
      label: 'Message',
      icon: <FaCommentDots />,
      ariaLabel: (p) => `Message ${p.name}`,
    },
    {
      label: 'Edit',
      icon: <FaEdit />,
      ariaLabel: (p) => `Edit ${p.name}`,
      onClick: (p) => openModal(p),
    },
    {
      label: 'Delete',
      icon: <FaTrash />,
      ariaLabel: (p) => `Delete ${p.name}`,
      onClick: (p) => setDeleteTarget(p),
    },
  ]

  if (error && parents.length === 0) {
    return <ApiErrorState message={error} onRetry={loadParents} />
  }

  return (
    <motion.div className="animate-fade-in" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Parents &amp; Guardians</h1>
          <p className="page-subtitle">{loading ? 'Loading...' : `${parents.length} guardians linked to students`}</p>
        </div>
        <div className="flex gap-md">
          <button id="message-parents-btn" className="btn-secondary"><FaCommentDots /> Message All</button>
          <button id="add-parent-btn" className="btn-primary" onClick={() => openModal()}><FaPlus /> Add Guardian</button>
        </div>
      </div>

      {/* Stats */}
      <div className="metrics-grid metrics-grid-3">
        <div className="glass-panel metric-card animate-fade-in-up">
          <div className="metric-icon-wrap metric-icon-blue"><FaUserFriends /></div>
          <div className="metric-label">Total Guardians</div>
          <div className="metric-value">{loading ? '-' : parents.length}</div>
        </div>
        <div className="glass-panel metric-card animate-fade-in-up">
          <div className="metric-icon-wrap metric-icon-green"><FaCheckCircle /></div>
          <div className="metric-label">Active</div>
          <div className="metric-value">{loading ? '-' : parents.filter(p => p.status === 'Active').length}</div>
        </div>
        <div className="glass-panel metric-card animate-fade-in-up">
          <div className="metric-icon-wrap metric-icon-orange"><FaCommentDots /></div>
          <div className="metric-label">Unread Messages</div>
          <div className="metric-value">14</div>
          <span className="metric-delta metric-delta-down">▼ Needs attention</span>
        </div>
      </div>

      {/* Search */}
      <div className="glass-panel page-card">
        <div className="flex items-center gap-md" style={{ marginBottom: 0 }}>
          <div className="header-search">
            <span className="header-search-icon"><FaSearch /></span>
            <input
              id="parents-search"
              className="header-search-input"
              type="search"
              placeholder="Search by parent name, Aadhar, email, or student…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search parents"
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
        emptyTitle="No guardians found"
        emptySubtitle="Add a guardian to link them to their students."
        emptyCtaLabel="Add Guardian"
        onEmptyCta={() => openModal()}
        emptyIcon={FaUserFriends}
        exportFilename="guardians.csv"
        exportColumnMap={{ Guardian: 'name', Aadhar: 'aadhar', Relation: 'relation', Email: 'email', Phone: 'phone', Occupation: 'occupation', Status: 'status' }}
        itemLabel="guardians"
        actions={actions}
        pagination={pagination}
        sortConfig={sortConfig}
        requestSort={requestSort}
      />

      {/* Add/Edit Guardian Modal */}
      <Modal
        isOpen={isModalOpen}
        title={editingId ? 'Edit Guardian' : 'Add New Guardian'}
        subtitle={editingId ? 'Update guardian details' : 'Register a new guardian'}
        onClose={() => { setIsModalOpen(false); setEditingId(null); }}
        size="sm"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => { setIsModalOpen(false); setEditingId(null); }}>Cancel</button>
            <button type="submit" form="guardian-form" className="btn-primary">{editingId ? 'Update Guardian' : 'Add Guardian'}</button>
          </>
        }
      >
        <form id="guardian-form" onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Photo Upload Section */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', background: 'rgba(0, 90, 158, 0.04)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0, 90, 158, 0.1)', marginBottom: '16px' }}>
              <div style={{ position: 'relative' }}>
                {formData.user_img ? (
                  <img
                    src={formData.user_img}
                    alt="Guardian Preview"
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

            <div className="form-group">
              <label className="form-label">Guardian Name <span className="form-required">*</span></label>
              <input
                type="text"
                ref={(el) => (fieldRefs.current.name = el)}
                className={`form-control${errors.name ? ' form-input-error' : ''}`}
                placeholder="e.g. Rajesh Sharma"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value.replace(/[^a-zA-Z\s]/g, '') })}
                required
              />
              {errors.name && <span className="form-error-msg"><FaExclamationCircle /> {errors.name}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Aadhar Number (12 Digits)</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={12}
                ref={(el) => (fieldRefs.current.aadhar = el)}
                className={`form-control${errors.aadhar ? ' form-input-error' : ''}`}
                placeholder="e.g. 123456789012"
                value={formData.aadhar}
                onChange={(e) => setFormData({ ...formData, aadhar: e.target.value.replace(/[^0-9]/g, '').slice(0, 12) })}
              />
              {errors.aadhar && <span className="form-error-msg"><FaExclamationCircle /> {errors.aadhar}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Relationship to Student <span className="form-required">*</span></label>
              <select
                ref={(el) => (fieldRefs.current.relation = el)}
                className={`form-control${errors.relation ? ' form-input-error' : ''}`}
                value={formData.relation}
                onChange={(e) => setFormData({ ...formData, relation: e.target.value })}
                required
              >
                <option value="" disabled>Select Relationship</option>
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
              {errors.relation && <span className="form-error-msg"><FaExclamationCircle /> {errors.relation}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Contact Number <span className="form-required">*</span></label>
              <input
                type="tel"
                ref={(el) => (fieldRefs.current.phone = el)}
                className={`form-control${errors.phone ? ' form-input-error' : ''}`}
                maxLength={10}
                placeholder="e.g. 9876543210"
                pattern="[6-9][0-9]{9}"
                title="Please enter a valid 10-digit Indian phone number starting with 6-9"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/[^0-9]/g, '').slice(0, 10) })}
                onKeyPress={(e) => { if (!/[0-9]/.test(e.key)) e.preventDefault(); }}
                required
              />
              {errors.phone && <span className="form-error-msg"><FaExclamationCircle /> {errors.phone}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Occupation <span className="form-required">*</span></label>
              <input
                type="text"
                ref={(el) => (fieldRefs.current.occupation = el)}
                className={`form-control${errors.occupation ? ' form-input-error' : ''}`}
                placeholder="e.g. Software Engineer"
                value={formData.occupation}
                onChange={(e) => setFormData({ ...formData, occupation: e.target.value.replace(/[^a-zA-Z0-9\s&.\-]/g, '') })}
                required
              />
              {errors.occupation && <span className="form-error-msg"><FaExclamationCircle /> {errors.occupation}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                ref={(el) => (fieldRefs.current.email = el)}
                className={`form-control${errors.email ? ' form-input-error' : ''}`}
                placeholder="e.g. parent@example.com"
                value={formData.email}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    email: val,
                    userId: (!editingId || prev.userId === prev.email?.trim().toLowerCase() || !prev.userId) ? val.trim().toLowerCase() : prev.userId
                  }));
                  if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                  if (errors.userId) setErrors((prev) => ({ ...prev, userId: '' }));
                }}
              />
              {errors.email && <span className="form-error-msg"><FaExclamationCircle /> {errors.email}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-control"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">User ID (Login)</label>
              <input
                type="text"
                ref={(el) => (fieldRefs.current.userId = el)}
                className={`form-control${errors.userId ? ' form-input-error' : ''}`}
                placeholder="e.g. prnt_rajesh"
                value={formData.userId}
                onChange={(e) => setFormData({ ...formData, userId: e.target.value.replace(/\s+/g, '') })}
              />
              {errors.userId && <span className="form-error-msg"><FaExclamationCircle /> {errors.userId}</span>}
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
                  className={`form-control${errors.password ? ' form-input-error' : ''}`}
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
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete guardian?"
        message={deleteTarget ? `Remove ${deleteTarget.name} and unlink them from their students? This cannot be undone.` : ''}
        confirmLabel="Delete"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </motion.div>
  )
}
