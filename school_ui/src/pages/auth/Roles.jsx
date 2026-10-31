import axios from '../../lib/axios'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FaPlus, FaTrash, FaEdit, FaSearch } from 'react-icons/fa'
import { createPortal } from 'react-dom'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import usePagination from '../../hooks/usePagination'

import { toast } from 'react-toastify'

export default function Roles() {
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState(null)
  const [errors, setErrors] = useState({})
  
  const currentUser = JSON.parse(sessionStorage.getItem('e_school_user') || '{}')
  const userRole = (currentUser?.user_role || currentUser?.role || '').toLowerCase()
  const isSchoolAdmin = userRole.includes('school') && !userRole.includes('super')

  const [formData, setFormData] = useState({
    MAS_role_id: '',
    MAS_role_DESC: '',
    MAS_role_link: ''
  })

  useEffect(() => {
    loadRoles()
  }, [])

  async function loadRoles() {
    try {
      setLoading(true)
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/auth/roles`)
      let items = Array.isArray(res.data) ? res.data : res.data?.data || []
      
      // If School Admin, filter down to branch and school-assignable roles
      if (isSchoolAdmin) {
        const allowedRoles = ['R_SCHOOLEXECUTIVE', 'R_BRANCHADMIN', 'R_BRANCHEXECUTIVE', 'R_BRANCHOFFICIAL', 'R_SCHOOLSTAFF', 'R_OFFICESTAFF', 'R_TEACHER', 'R_STUDENT', 'R_GUARDIAN']
        items = items.filter(r => {
          const code = (r.MAS_ROLE_ID || r.MAS_role_id || r.mas_role_id || '').toUpperCase()
          return allowedRoles.includes(code)
        })
      }

      setRoles(items)
    } catch (err) {
      toast.error('Failed to load roles')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function openModal(role = null) {
    setErrors({})
    if (role) {
      setEditingRole(role)
      setFormData({
        MAS_role_id: role.MAS_role_id || role.MAS_ROLE_ID || role.mas_role_id || '',
        MAS_role_DESC: role.MAS_role_DESC || role.MAS_ROLE_DESC || role.mas_role_desc || '',
        MAS_role_link: role.MAS_role_LINK || role.MAS_role_link || role.MAS_ROLE_LINK || role.mas_role_link || ''
      })
    } else {
      setEditingRole(null)
      setFormData({ MAS_role_id: '', MAS_role_DESC: '', MAS_role_link: '' })
    }
    setIsModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = {}
    if (!editingRole) {
      const roleId = formData.MAS_role_id.trim()
      if (!roleId) {
        errs.MAS_role_id = 'Role ID is required.'
      } else if (/^\d+$/.test(roleId)) {
        errs.MAS_role_id = 'Role ID cannot be numbers only. It must contain letters (e.g. R_TEACHER or ADMIN1).'
      } else if (!/^[a-zA-Z0-9_-]+$/.test(roleId) || !/[a-zA-Z]/.test(roleId)) {
        errs.MAS_role_id = 'Role ID must be alphanumeric and contain at least one letter.'
      }
    }
    if (!formData.MAS_role_DESC.trim()) errs.MAS_role_DESC = 'Role description is required.'
    else if (!/^[a-zA-Z\s]+$/.test(formData.MAS_role_DESC.trim())) errs.MAS_role_DESC = 'Role description can only contain letters and spaces.'
    if (formData.MAS_role_link && !/^\/[a-zA-Z0-9\/_\-]*$/.test(formData.MAS_role_link.trim())) errs.MAS_role_link = 'Link must start with "/" and contain only letters, numbers, /, _, -'
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    try {
      if (editingRole) {
        const targetId = editingRole.MAS_ROLE_ID || editingRole.MAS_role_id || editingRole.mas_role_id
        await axios.put(`${import.meta.env.VITE_API_BASE_URL}/auth/roles/${targetId}`, formData)
        toast.success('Role updated successfully')
      } else {
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/roles`, formData)
        toast.success('Role created successfully')
      }
      setIsModalOpen(false)
      loadRoles()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save role')
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this role?')) return
    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/auth/roles/${id}`)
      toast.success('Role deleted successfully')
      loadRoles()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete role')
    }
  }

  const debouncedSearch = useDebouncedValue(search, 300)
  const filtered = roles.filter((r) => {
    const id = r.MAS_role_id || r.MAS_ROLE_ID || r.mas_role_id || ''
    const desc = r.MAS_role_DESC || r.MAS_ROLE_DESC || r.mas_role_desc || ''
    const link = r.MAS_role_LINK || r.MAS_role_link || r.MAS_ROLE_LINK || r.mas_role_link || ''
    return `${id} ${desc} ${link}`.toLowerCase().includes(debouncedSearch.toLowerCase())
  })

  const pagination = usePagination(filtered, 10)

  return (
    <motion.div className="animate-fade-in" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isSchoolAdmin ? 'Role Assignation' : 'Roles'}</h1>
          <p className="page-subtitle">
            {isSchoolAdmin 
              ? 'View and manage roles assignable to branch and school-level users' 
              : (loading ? 'Loading...' : `${roles.length} system roles configured`)}
          </p>
        </div>
        {!isSchoolAdmin && (
          <button className="btn-primary" onClick={() => openModal()}>
            <FaPlus /> Add Role
          </button>
        )}
      </div>

      <div className="glass-panel page-card">
        <div className="filter-row" style={{ marginBottom: '16px' }}>
          <div className="header-search">
            <span className="header-search-icon"><FaSearch /></span>
            <input
              className="header-search-input"
              type="search"
              placeholder="Search roles by ID, description, or link…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search roles"
            />
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Role ID</th>
                <th>Description</th>
                <th>Link</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="text-center">Loading...</td>
                </tr>
              ) : pagination.pageItems.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center text-muted">No roles found</td>
                </tr>
              ) : (
                pagination.pageItems.map((r, idx) => {
                  const id = r.MAS_role_id || r.MAS_ROLE_ID || r.mas_role_id
                  const desc = r.MAS_role_DESC || r.MAS_ROLE_DESC || r.mas_role_desc
                  const link = r.MAS_role_LINK || r.MAS_role_link || r.MAS_ROLE_LINK || r.mas_role_link
                  return (
                    <tr key={id || idx}>
                      <td><span className="badge badge-info">{id}</span></td>
                      <td>{desc}</td>
                      <td>{link || '-'}</td>
                      <td>
                        <div className="flex gap-sm">
                          <button className="btn-icon" onClick={() => openModal(r)} title="Edit"><FaEdit /></button>
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

      {/* Pagination Footer */}
      {filtered.length > 10 && (
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
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="modal-header">
              <h2 className="modal-title">{editingRole ? 'Edit Role' : 'New Role'}</h2>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {!editingRole && (
                  <div className="form-group">
                    <label className="form-label">Role ID <span className="form-required">*</span></label>
                    <input
                      type="text"
                      className={`form-control${errors.MAS_role_id ? ' form-input-error' : ''}`}
                      placeholder="e.g. R_SUPERADMIN"
                      value={formData.MAS_role_id}
                      onChange={(e) => setFormData({ ...formData, MAS_role_id: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
                      required
                    />
                    {errors.MAS_role_id && <span className="form-error-msg">{errors.MAS_role_id}</span>}
                  </div>
                )}
                {editingRole && (
                  <div className="form-group">
                    <label className="form-label">Role ID</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.MAS_role_id}
                      disabled
                      readOnly
                    />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Description <span className="form-required">*</span></label>
                  <input
                    type="text"
                    className={`form-control${errors.MAS_role_DESC ? ' form-input-error' : ''}`}
                    value={formData.MAS_role_DESC}
                    onChange={(e) => setFormData({ ...formData, MAS_role_DESC: e.target.value.replace(/[^a-zA-Z\s]/g, '') })}
                    required
                  />
                  {errors.MAS_role_DESC && <span className="form-error-msg">{errors.MAS_role_DESC}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Default Link (Optional)</label>
                  <input
                    type="text"
                    className={`form-control${errors.MAS_role_link ? ' form-input-error' : ''}`}
                    placeholder="e.g. /dashboard"
                    value={formData.MAS_role_link}
                    onChange={(e) => setFormData({ ...formData, MAS_role_link: e.target.value })}
                  />
                  {errors.MAS_role_link && <span className="form-error-msg">{errors.MAS_role_link}</span>}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Role</button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}
    </motion.div>
  )
}
