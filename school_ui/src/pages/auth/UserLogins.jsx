import axios from '../../lib/axios'
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { FaPlus, FaTrash, FaEdit, FaUserCircle, FaSearch, FaCamera, FaTimes, FaUpload, FaImage } from 'react-icons/fa'
import { createPortal } from 'react-dom'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import usePagination from '../../hooks/usePagination'
import { toast } from 'react-toastify'

export default function UserLogins() {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [schools, setSchools] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [errors, setErrors] = useState({})
  const fileInputRef = useRef(null)

  const currentUser = JSON.parse(sessionStorage.getItem('e_school_user') || '{}')
  const userRole = (currentUser?.user_role || currentUser?.role || '').toLowerCase()
  const isSuperAdmin = userRole.includes('super')
  const isSchoolAdmin = userRole.includes('school') && !isSuperAdmin
  const isBranchAdmin = userRole.includes('branch') && !isSuperAdmin
  
  const [formData, setFormData] = useState({
    user_id: '',
    user_first_name: '',
    user_last_name: '',
    user_email_id: '',
    user_mobile: '',
    user_passwd: '',
    user_role: '',
    user_school_id: currentUser?.school_id || currentUser?.SCHL_ID || '',
    user_branch_id: currentUser?.branch_id || currentUser?.SCHL_BR_ID || '',
    user_img: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const requests = [
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/auth/users`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/auth/roles`)
      ]

      if (isSuperAdmin) {
        requests.push(axios.get(`${import.meta.env.VITE_API_BASE_URL}/auth/school`))
        requests.push(axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/branches`))
      } else if (isSchoolAdmin) {
        requests.push(axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/branches`))
      }

      const results = await Promise.all(requests)
      const usersList = Array.isArray(results[0].data) ? results[0].data : results[0].data?.data || []
      setUsers(usersList)

      let rolesList = Array.isArray(results[1].data) ? results[1].data : results[1].data?.data || []
      if (isSchoolAdmin) {
        const allowed = ['R_SCHOOLEXECUTIVE', 'R_BRANCHADMIN', 'R_BRANCHEXECUTIVE', 'R_BRANCHOFFICIAL', 'R_SCHOOLSTAFF', 'R_OFFICESTAFF', 'R_TEACHER', 'R_STUDENT', 'R_GUARDIAN']
        rolesList = rolesList.filter(r => allowed.includes((r.MAS_ROLE_ID || r.mas_role_id || r.MAS_role_id || '').toUpperCase()))
      } else if (isBranchAdmin) {
        const allowed = ['R_BRANCHEXECUTIVE', 'R_BRANCHOFFICIAL', 'R_OFFICESTAFF', 'R_TEACHER', 'R_STUDENT', 'R_GUARDIAN']
        rolesList = rolesList.filter(r => allowed.includes((r.MAS_ROLE_ID || r.mas_role_id || r.MAS_role_id || '').toUpperCase()))
      }
      setRoles(rolesList)

      if (isSuperAdmin) {
        setSchools(Array.isArray(results[2]?.data) ? results[2].data : results[2]?.data?.data || [])
        setBranches(Array.isArray(results[3]?.data) ? results[3].data : results[3]?.data?.data || [])
      } else if (isSchoolAdmin) {
        setBranches(Array.isArray(results[2]?.data) ? results[2].data : results[2]?.data?.data || [])
      }
    } catch (err) {
      toast.error('Failed to load users or roles')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function handleImageUpload(e) {
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
      setFormData(prev => ({ ...prev, user_img: event.target.result }))
    }
    reader.readAsDataURL(file)
  }

  function openModal(user = null) {
    setErrors({})
    if (user) {
      setEditingUser(user)
      setFormData({
        user_id: (user.user_id || user.id) || '',
        user_first_name: user.user_first_name || user.USER_FIRST_NAME || '',
        user_last_name: user.user_last_name || user.USER_LAST_NAME || '',
        user_email_id: user.user_email_id || '',
        user_mobile: user.user_mobile || user.USER_MOBILE || '',
        user_passwd: '', // Leave blank when editing unless changing
        user_role: (user.user_role || user.role_id) || '',
        user_school_id: user.user_school_id || user.USER_SCHOOL_ID || '',
        user_branch_id: user.user_branch_id || user.USER_BRANCH_ID || '',
        user_img: user.user_img || user.USER_IMG || ''
      })
    } else {
      setEditingUser(null)
      setFormData({
        user_id: '',
        user_first_name: '',
        user_last_name: '',
        user_email_id: '',
        user_mobile: '',
        user_passwd: '',
        user_role: '',
        user_school_id: isSchoolAdmin ? (currentUser?.school_id || currentUser?.userId) : '',
        user_branch_id: isBranchAdmin ? (currentUser?.branch_id || currentUser?.userId) : '',
        user_img: ''
      })
    }
    setIsModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = {}
    if (!formData.user_id.trim()) errs.user_id = 'User ID is required.'
    else if (!/^[a-zA-Z0-9_.]+$/.test(formData.user_id.trim())) errs.user_id = 'User ID can only contain letters, numbers, dots and underscores.'
    else if (formData.user_id.trim().length < 3) errs.user_id = 'User ID must be at least 3 characters long'
    
    if (formData.user_first_name && !/^[a-zA-Z\s]+$/.test(formData.user_first_name.trim())) {
      errs.user_first_name = 'First name can only contain letters and spaces.'
    }
    if (formData.user_last_name && !/^[a-zA-Z\s]+$/.test(formData.user_last_name.trim())) {
      errs.user_last_name = 'Last name can only contain letters and spaces.'
    }

    const emailTrimmed = formData.user_email_id.trim()
    if (!emailTrimmed) {
      errs.user_email_id = 'Email address is required.'
    } else if (!/^[a-zA-Z._-]+@[a-zA-Z.-]+\.[a-zA-Z]{2,}$/.test(emailTrimmed) || (emailTrimmed.match(/@/g) || []).length > 1 || emailTrimmed.endsWith('.')) {
      errs.user_email_id = 'Please enter a valid email address (e.g. name@school.edu). Numbers and symbols like $, % are not allowed.'
    }

    if (formData.user_mobile && !/^\+?[0-9]{10,15}$/.test(formData.user_mobile)) {
      errs.user_mobile = 'Mobile number must be between 10 to 15 digits.'
    }
    
    if (!editingUser) {
      if (!formData.user_passwd) errs.user_passwd = 'Password is required.'
      else if (formData.user_passwd.length < 6) errs.user_passwd = 'Password must be at least 6 characters long'
    } else if (formData.user_passwd && formData.user_passwd.length < 6) {
      errs.user_passwd = 'Password must be at least 6 characters long'
    }
    if (!formData.user_role) errs.user_role = 'Please select a role.'
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    try {
      const dataToSubmit = { ...formData }
      if (editingUser && !dataToSubmit.user_passwd) {
        delete dataToSubmit.user_passwd // Don't send empty password on update
      }

      if (editingUser) {
        await axios.put(`${import.meta.env.VITE_API_BASE_URL}/auth/users/${editingUser.user_id || editingUser.id}`, dataToSubmit)
        toast.success('User updated successfully')
      } else {
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/users`, dataToSubmit)
        toast.success('User created successfully')
      }
      setIsModalOpen(false)
      loadData()
    } catch (err) {
      const respData = err?.response?.data
      const errorMsg = respData?.message || err?.message || 'Failed to save user'
      if (respData?.errors && typeof respData.errors === 'object') {
        setErrors(prev => ({ ...prev, ...respData.errors }))
        const firstErr = Object.values(respData.errors)[0]
        toast.error(typeof firstErr === 'string' ? `${errorMsg}: ${firstErr}` : errorMsg)
      } else {
        toast.error(errorMsg)
      }
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this user?')) return
    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/auth/users/${id}`)
      toast.success('User deleted successfully')
      loadData()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete user')
    }
  }

  const debouncedSearch = useDebouncedValue(search, 300)
  const filteredUsers = users.filter((u) => {
    const q = debouncedSearch.toLowerCase()
    const id = (u.user_id || '').toLowerCase()
    const email = (u.user_email_id || '').toLowerCase()
    const role = (u.user_role || u.role_name || '').toLowerCase()
    const name = `${u.user_first_name || ''} ${u.user_last_name || ''}`.toLowerCase()
    const branch = (u.branch_name || u.school_name || '').toLowerCase()
    return id.includes(q) || email.includes(q) || role.includes(q) || name.includes(q) || branch.includes(q)
  })

  const pagination = usePagination(filteredUsers, 10)

  return (
    <motion.div className="animate-fade-in" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Accounts &amp; Logins</h1>
          <p className="page-subtitle">
            {isSuperAdmin && 'Manage all platform accounts, roles, credentials, and profile photos'}
            {isSchoolAdmin && 'Manage school administrators, teachers, and staff login accounts'}
            {isBranchAdmin && 'Manage your branch teachers, staff, and student login accounts'}
          </p>
        </div>
        <button className="btn-primary" onClick={() => openModal()}>
          <FaPlus /> New User Account
        </button>
      </div>

      <div className="glass-panel page-card">
        <div className="filter-row" style={{ marginBottom: '16px' }}>
          <div className="header-search">
            <span className="header-search-icon"><FaSearch /></span>
            <input
              className="header-search-input"
              type="search"
              placeholder="Search by User ID, Name, Email, Role, or Branch…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search users"
            />
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>User / Avatar</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Role</th>
                {!isBranchAdmin && <th>School / Branch</th>}
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isBranchAdmin ? 6 : 7} className="text-center">Loading...</td>
                </tr>
              ) : pagination.pageItems.length === 0 ? (
                <tr>
                  <td colSpan={isBranchAdmin ? 6 : 7} className="text-center text-muted">No users found</td>
                </tr>
              ) : (
                pagination.pageItems.map((u, idx) => {
                  const firstName = u.user_first_name || u.USER_FIRST_NAME || ''
                  const lastName = u.user_last_name || u.USER_LAST_NAME || ''
                  const fullName = `${firstName} ${lastName}`.trim() || '-'
                  const branchDisplay = u.branch_name || u.school_name || u.user_branch_id || u.user_school_id || '-'

                  return (
                    <tr key={u.user_id || idx}>
                      <td>
                        <div className="flex items-center gap-sm">
                          {u.user_img ? (
                            <img
                              src={u.user_img}
                              alt={u.user_id}
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '1.5px solid var(--clr-primary)'
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: 'rgba(0, 90, 158, 0.1)',
                                color: 'var(--clr-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '0.8rem'
                              }}
                            >
                              {(u.user_id || 'U').substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span className="font-bold">{u.user_id}</span>
                        </div>
                      </td>
                      <td>{fullName}</td>
                      <td>{u.user_email_id}</td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {(u.roles && u.roles.length > 0 ? u.roles : (u.user_role || '').split(',').filter(Boolean)).map(r => {
                            const foundRole = roles.find(item => (item.MAS_ROLE_ID || item.mas_role_id || item.MAS_role_id) === r)
                            const label = foundRole?.MAS_ROLE_DESC || foundRole?.mas_role_desc || foundRole?.MAS_role_DESC || r
                            return (
                              <span key={r} className="badge badge-info" style={{ fontSize: '0.72rem' }} title={r}>
                                {label}
                              </span>
                            )
                          })}
                        </div>
                      </td>
                      {!isBranchAdmin && <td>{branchDisplay}</td>}
                      <td>{u.user_cr_dt || '-'}</td>
                      <td>
                        <div className="flex gap-sm">
                          <button className="btn-icon" onClick={() => openModal(u)} title="Edit"><FaEdit /></button>
                          <button className="btn-icon text-danger" onClick={() => handleDelete(u.user_id)} title="Delete"><FaTrash /></button>
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

      {/* Pagination Footer */}
      {filteredUsers.length > 10 && (
        <div className="table-toolbar-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', marginTop: '12px' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--clr-text-muted)' }}>
            Showing {pagination.startIndex}–{pagination.endIndex} of {pagination.totalItems}
          </div>
          <div className="flex gap-sm" style={{ alignItems: 'center' }}>
            <select
              value={pagination.pageSize}
              onChange={(e) => pagination.setPageSize(Number(e.target.value))}
              className="form-control"
              style={{ width: 'auto', padding: '4px 8px', fontSize: '0.82rem' }}
              aria-label="Rows per page"
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
            <button className="btn-secondary" disabled={pagination.page === 1} onClick={() => pagination.setPage(pagination.page - 1)}>Prev</button>
            <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{pagination.page} / {pagination.totalPages}</span>
            <button className="btn-secondary" disabled={pagination.page >= pagination.totalPages} onClick={() => pagination.setPage(pagination.page + 1)}>Next</button>
          </div>
        </div>
      )}

      {isModalOpen && createPortal(
        <div className="modal-overlay">
          <motion.div
            className="glass-panel modal-container"
            style={{ maxWidth: '580px' }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="modal-header">
              <h2 className="modal-title">{editingUser ? 'Edit User Account' : 'Create User Account'}</h2>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
                
                {/* User Image Upload Section */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '12px 16px',
                  background: 'rgba(0,0,0,0.02)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--clr-border)',
                  marginBottom: '14px'
                }}>
                  <div style={{ position: 'relative' }}>
                    {formData.user_img ? (
                      <img
                        src={formData.user_img}
                        alt="Profile Preview"
                        style={{
                          width: '68px',
                          height: '68px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '2px solid var(--clr-primary)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '68px',
                        height: '68px',
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
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '4px' }}>
                      Profile Photo
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--clr-text-muted)', marginBottom: '8px' }}>
                      Supports PNG, JPG, WebP (Max 2MB)
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleImageUpload}
                      />
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                        onClick={() => fileInputRef.current?.click()}
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
                  <label className="form-label">User ID (Username) <span className="form-required">*</span></label>
                  <input
                    type="text"
                    className={`form-control${errors.user_id ? ' form-input-error' : ''}`}
                    placeholder="e.g. john_doe"
                    value={formData.user_id}
                    onChange={(e) => setFormData({ ...formData, user_id: e.target.value.replace(/[^a-zA-Z0-9_.]/g, '') })}
                    required
                  />
                  {errors.user_id && <span className="form-error-msg">{errors.user_id}</span>}
                </div>

                <div className="form-row-2col">
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input
                      type="text"
                      className={`form-control${errors.user_first_name ? ' form-input-error' : ''}`}
                      placeholder="e.g. John"
                      value={formData.user_first_name}
                      onChange={(e) => setFormData({ ...formData, user_first_name: e.target.value.replace(/[^a-zA-Z\s]/g, '') })}
                    />
                    {errors.user_first_name && <span className="form-error-msg">{errors.user_first_name}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input
                      type="text"
                      className={`form-control${errors.user_last_name ? ' form-input-error' : ''}`}
                      placeholder="e.g. Doe"
                      value={formData.user_last_name}
                      onChange={(e) => setFormData({ ...formData, user_last_name: e.target.value.replace(/[^a-zA-Z\s]/g, '') })}
                    />
                    {errors.user_last_name && <span className="form-error-msg">{errors.user_last_name}</span>}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address <span className="form-required">*</span></label>
                  <input
                    type="email"
                    className={`form-control${errors.user_email_id ? ' form-input-error' : ''}`}
                    placeholder="e.g. john@school.edu"
                    value={formData.user_email_id}
                    onChange={(e) => {
                      // Disallow numbers and special characters like $, %, &, *, etc. Only allow letters, @, ., _, -
                      const cleaned = e.target.value.toLowerCase().replace(/[^a-z@._-]/g, '')
                      setFormData({ ...formData, user_email_id: cleaned })
                    }}
                    required
                  />
                  {errors.user_email_id && <span className="form-error-msg">{errors.user_email_id}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Mobile Number</label>
                  <input
                    type="text"
                    className={`form-control${errors.user_mobile ? ' form-input-error' : ''}`}
                    placeholder="e.g. +1234567890"
                    value={formData.user_mobile}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^\d+]/g, '')
                      setFormData({ ...formData, user_mobile: cleaned })
                    }}
                  />
                  {errors.user_mobile && <span className="form-error-msg">{errors.user_mobile}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Password {!editingUser && <span className="form-required">*</span>} <span className="form-hint">(min 6 chars)</span></label>
                  <input
                    type="password"
                    className={`form-control${errors.user_passwd ? ' form-input-error' : ''}`}
                    placeholder={editingUser ? "Leave blank to keep unchanged" : "Enter password"}
                    value={formData.user_passwd}
                    onChange={(e) => setFormData({ ...formData, user_passwd: e.target.value })}
                    required={!editingUser}
                  />
                  {errors.user_passwd && <span className="form-error-msg">{errors.user_passwd}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Assign Role(s) <span className="form-required">*</span>
                    {isSuperAdmin && <span style={{ fontSize: '0.74rem', color: 'var(--clr-accent)', marginLeft: '8px', fontWeight: 'normal' }}>(Super Admin: select multiple roles)</span>}
                  </label>
                  {isSuperAdmin ? (
                    <div className="grid-auto-md" style={{
                      gap: '8px',
                      maxHeight: '180px',
                      overflowY: 'auto',
                      padding: '10px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(0,0,0,0.02)',
                      border: errors.user_role ? '1px solid var(--clr-danger)' : '1px solid var(--clr-border)'
                    }}>
                      {roles.map(r => {
                        const rId = r.MAS_ROLE_ID || r.mas_role_id || r.MAS_role_id
                        const rDesc = r.MAS_ROLE_DESC || r.mas_role_desc || r.MAS_role_DESC || rId
                        const currentRoles = (formData.user_role || '').split(',').map(x => x.trim()).filter(Boolean)
                        const isChecked = currentRoles.includes(rId)

                        return (
                          <label
                            key={rId}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontSize: '0.8rem',
                              padding: '6px 8px',
                              borderRadius: '4px',
                              background: isChecked ? 'rgba(0, 90, 158, 0.08)' : 'transparent',
                              cursor: 'pointer'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                let updated
                                if (e.target.checked) {
                                  updated = [...currentRoles, rId]
                                } else {
                                  updated = currentRoles.filter(x => x !== rId)
                                }
                                setFormData({ ...formData, user_role: updated.join(',') })
                                if (errors.user_role) setErrors(prev => ({ ...prev, user_role: '' }))
                              }}
                            />
                            <span>{rDesc} <strong style={{ color: 'var(--clr-text-muted)', fontSize: '0.72rem' }}>({rId})</strong></span>
                          </label>
                        )
                      })}
                    </div>
                  ) : (
                    <select
                      className={`form-control${errors.user_role ? ' form-input-error' : ''}`}
                      value={formData.user_role}
                      onChange={(e) => setFormData({ ...formData, user_role: e.target.value })}
                      required
                    >
                      <option value="" disabled>Select Role</option>
                      {roles.map(r => {
                        const rId = r.MAS_ROLE_ID || r.mas_role_id || r.MAS_role_id
                        const rDesc = r.MAS_ROLE_DESC || r.mas_role_desc || r.MAS_role_DESC || rId
                        return (
                          <option key={rId} value={rId}>
                            {rDesc} ({rId})
                          </option>
                        )
                      })}
                    </select>
                  )}
                  {errors.user_role && <span className="form-error-msg">{errors.user_role}</span>}
                </div>

                {isSuperAdmin && (
                  <div className="form-row-2col">
                    <div className="form-group">
                      <label className="form-label">School / Center</label>
                      <select
                        className="form-control"
                        value={formData.user_school_id}
                        onChange={(e) => setFormData({ ...formData, user_school_id: e.target.value })}
                      >
                        <option value="">(None / Global)</option>
                        {schools.map(s => (
                          <option key={s.SCHL_MN_ID || s.id} value={s.SCHL_MN_ID || s.id}>
                            {s.SCHL_MN_NM || s.name} ({s.SCHL_MN_ID || s.id})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Branch</label>
                      <select
                        className="form-control"
                        value={formData.user_branch_id}
                        onChange={(e) => setFormData({ ...formData, user_branch_id: e.target.value })}
                      >
                        <option value="">(None / Global)</option>
                        {branches.map(b => (
                          <option key={b.SCHL_BR_ID || b.id} value={b.SCHL_BR_ID || b.id}>
                            {b.SCHL_BR_NM || b.name} ({b.SCHL_BR_ID || b.id})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {isSchoolAdmin && (
                  <div className="form-group">
                    <label className="form-label">Assign Branch (Optional)</label>
                    <select
                      className="form-control"
                      value={formData.user_branch_id}
                      onChange={(e) => setFormData({ ...formData, user_branch_id: e.target.value })}
                    >
                      <option value="">(All Branches / School Level)</option>
                      {branches.map(b => (
                        <option key={b.SCHL_BR_ID || b.id} value={b.SCHL_BR_ID || b.id}>
                          {b.SCHL_BR_NM || b.name} ({b.SCHL_BR_ID || b.id})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save User</button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}
    </motion.div>
  )
}
