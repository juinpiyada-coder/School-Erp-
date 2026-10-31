import axios from '../../lib/axios'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FaPlus, FaTrash, FaEdit, FaSearch, FaListUl, FaCheckCircle, FaTimesCircle, FaToggleOn, FaToggleOff } from 'react-icons/fa'
import { createPortal } from 'react-dom'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import usePagination from '../../hooks/usePagination'
import { toast } from 'react-toastify'

// Dispatch event so Sidebar component immediately re-fetches without page refresh
function notifyRoleLinksUpdated() {
  window.dispatchEvent(new CustomEvent('role-links-updated'))
  try {
    localStorage.setItem('sms_last_links_update', Date.now().toString())
  } catch (e) {}
}

export default function RoleLinks() {
  const [links, setLinks] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('')
  const [togglingId, setTogglingId] = useState(null)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLink, setEditingLink] = useState(null)
  const [errors, setErrors] = useState({})

  const [formData, setFormData] = useState({
    SM_RL_ROLE_ID: '',
    SM_RL_LINK_DESC: '',
    SM_RL_LINK_URL: '',
    SM_RL_LINK_SRL: 1,
    SM_RL_SUBMENU: '',
    SM_RL_STATUS: 'ACTIVE'
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [linksRes, rolesRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/auth/role-links`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/auth/roles`)
      ])

      const linkItems = Array.isArray(linksRes.data) ? linksRes.data : linksRes.data?.data || []
      setLinks(linkItems)

      const roleItems = Array.isArray(rolesRes.data) ? rolesRes.data : rolesRes.data?.data || []
      setRoles(roleItems)
    } catch (err) {
      toast.error('Failed to load role navigation links')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function openModal(link = null) {
    setErrors({})
    if (link) {
      setEditingLink(link)
      const st = (link.SM_RL_STATUS || link.sm_rl_status || 'ACTIVE').toUpperCase()
      setFormData({
        SM_RL_ROLE_ID: link.SM_RL_ROLE_ID || link.sm_rl_role_id || '',
        SM_RL_LINK_DESC: link.SM_RL_LINK_DESC || link.sm_rl_link_desc || '',
        SM_RL_LINK_URL: link.SM_RL_LINK_URL || link.sm_rl_link_url || '',
        SM_RL_LINK_SRL: link.SM_RL_LINK_SRL ?? link.sm_rl_link_srl ?? 1,
        SM_RL_SUBMENU: link.SM_RL_SUBMENU || link.sm_rl_submenu || '',
        SM_RL_STATUS: st === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'
      })
    } else {
      setEditingLink(null)
      setFormData({
        SM_RL_ROLE_ID: selectedRoleFilter || (roles[0]?.mas_role_id || roles[0]?.MAS_role_id || 'R_SUPERADMIN'),
        SM_RL_LINK_DESC: '',
        SM_RL_LINK_URL: '',
        SM_RL_LINK_SRL: links.length + 1,
        SM_RL_SUBMENU: '',
        SM_RL_STATUS: 'ACTIVE'
      })
    }
    setIsModalOpen(true)
  }

  async function handleToggleStatus(item) {
    const id = item.SM_RL_ID || item.sm_rl_id
    if (!id || togglingId) return

    const currentStatus = (item.SM_RL_STATUS || item.sm_rl_status || 'ACTIVE').toUpperCase()
    const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'

    // Optimistically update local list
    setLinks(prev => prev.map(l => {
      const lid = l.SM_RL_ID || l.sm_rl_id
      if (lid === id) {
        return { ...l, SM_RL_STATUS: nextStatus, sm_rl_status: nextStatus }
      }
      return l
    }))

    setTogglingId(id)
    try {
      try {
        await axios.put(`${import.meta.env.VITE_API_BASE_URL}/auth/role-links/${encodeURIComponent(id)}/toggle-status`, {
          SM_RL_STATUS: nextStatus
        })
      } catch (toggleErr) {
        // Fallback directly to full link update
        await axios.put(`${import.meta.env.VITE_API_BASE_URL}/auth/role-links/${encodeURIComponent(id)}`, {
          ...item,
          SM_RL_STATUS: nextStatus
        })
      }

      toast.success(`"${item.SM_RL_LINK_DESC || item.sm_rl_link_desc}" is now ${nextStatus === 'ACTIVE' ? 'Active' : 'Deactivated'}`)
      notifyRoleLinksUpdated()
    } catch (err) {
      // Revert on error
      setLinks(prev => prev.map(l => {
        const lid = l.SM_RL_ID || l.sm_rl_id
        if (lid === id) {
          return { ...l, SM_RL_STATUS: currentStatus, sm_rl_status: currentStatus }
        }
        return l
      }))
      const msg = err?.response?.data?.message || err?.message || 'Failed to toggle status'
      toast.error(msg)
    } finally {
      setTogglingId(null)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = {}
    if (!formData.SM_RL_ROLE_ID) errs.SM_RL_ROLE_ID = 'Role is required.'
    if (!formData.SM_RL_LINK_DESC.trim()) errs.SM_RL_LINK_DESC = 'Link title / description is required.'
    if (!formData.SM_RL_LINK_URL.trim()) {
      errs.SM_RL_LINK_URL = 'URL path is required.'
    } else if (!formData.SM_RL_LINK_URL.startsWith('/') && !formData.SM_RL_LINK_URL.startsWith('http')) {
      errs.SM_RL_LINK_URL = 'URL path must start with "/" (e.g., /user/roles).'
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    try {
      if (editingLink) {
        const id = editingLink.SM_RL_ID || editingLink.sm_rl_id
        await axios.put(`${import.meta.env.VITE_API_BASE_URL}/auth/role-links/${id}`, formData)
        toast.success('Role navigation link updated successfully')
      } else {
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/role-links`, formData)
        toast.success('Role navigation link added to database')
      }
      setIsModalOpen(false)
      loadData()
      notifyRoleLinksUpdated()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save role link')
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to remove this navigation link?')) return
    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/auth/role-links/${id}`)
      toast.success('Role link deleted successfully')
      loadData()
      notifyRoleLinksUpdated()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete role link')
    }
  }

  const debouncedSearch = useDebouncedValue(search, 300)
  const filtered = links.filter((item) => {
    const roleId = item.SM_RL_ROLE_ID || item.sm_rl_role_id || ''
    const desc = item.SM_RL_LINK_DESC || item.sm_rl_link_desc || ''
    const url = item.SM_RL_LINK_URL || item.sm_rl_link_url || ''
    const submenu = item.SM_RL_SUBMENU || item.sm_rl_submenu || ''
    const status = (item.SM_RL_STATUS || item.sm_rl_status || 'ACTIVE').toUpperCase()

    if (selectedRoleFilter && roleId !== selectedRoleFilter) {
      return false
    }

    if (selectedStatusFilter && status !== selectedStatusFilter) {
      return false
    }

    return `${roleId} ${desc} ${url} ${submenu} ${status}`.toLowerCase().includes(debouncedSearch.toLowerCase())
  })

  const pagination = usePagination(filtered, 10)

  return (
    <motion.div className="animate-fade-in" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Role Links (Sidepanel Menu)</h1>
          <p className="page-subtitle">
            {loading ? 'Loading...' : `${links.length} total navigation routes in database (${links.filter(l => (l.SM_RL_STATUS || l.sm_rl_status || 'ACTIVE').toUpperCase() === 'ACTIVE').length} active)`}
          </p>
        </div>
        <button className="btn-primary" onClick={() => openModal()}>
          <FaPlus /> Add Role Link
        </button>
      </div>

      <div className="glass-panel page-card">
        <div className="flex items-center gap-md" style={{ marginBottom: '16px', flexWrap: 'wrap' }}>
          <div className="header-search">
            <span className="header-search-icon"><FaSearch /></span>
            <input
              className="header-search-input"
              type="search"
              placeholder="Search by label, route, or category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search role links"
            />
          </div>

          <div style={{ minWidth: '170px' }}>
            <select
              className="form-control"
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              aria-label="Filter by role"
            >
              <option value="">All Roles</option>
              {roles.map((r) => {
                const rid = r.MAS_role_id || r.MAS_ROLE_ID || r.mas_role_id
                const rdesc = r.MAS_role_DESC || r.MAS_ROLE_DESC || r.mas_role_desc || rid
                return <option key={rid} value={rid}>{rdesc} ({rid})</option>
              })}
            </select>
          </div>

          <div style={{ minWidth: '150px' }}>
            <select
              className="form-control"
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Deactivated Only</option>
            </select>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Target Role</th>
                <th>Category / Submenu</th>
                <th>Menu Label</th>
                <th>Route Path</th>
                <th>Status / Toggle</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center">Loading role navigation routes...</td>
                </tr>
              ) : pagination.pageItems.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center text-muted">No navigation links found</td>
                </tr>
              ) : (
                pagination.pageItems.map((item, idx) => {
                  const id = item.SM_RL_ID || item.sm_rl_id
                  const roleId = item.SM_RL_ROLE_ID || item.sm_rl_role_id
                  const desc = item.SM_RL_LINK_DESC || item.sm_rl_link_desc
                  const url = item.SM_RL_LINK_URL || item.sm_rl_link_url
                  const srl = item.SM_RL_LINK_SRL ?? item.sm_rl_link_srl ?? 0
                  const submenu = item.SM_RL_SUBMENU || item.sm_rl_submenu || '-'
                  const isLinkActive = (item.SM_RL_STATUS || item.sm_rl_status || 'ACTIVE').toUpperCase() === 'ACTIVE'
                  const isToggling = togglingId === id

                  return (
                    <tr key={id || idx} style={{ opacity: isLinkActive ? 1 : 0.65 }}>
                      <td><span className="badge badge-secondary">#{srl}</span></td>
                      <td><span className="badge badge-info">{roleId}</span></td>
                      <td><strong style={{ color: 'var(--clr-text-main)' }}>{submenu}</strong></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FaListUl style={{ opacity: 0.6, fontSize: '0.85rem' }} />
                          <span style={{ fontWeight: isLinkActive ? 600 : 400 }}>{desc}</span>
                        </div>
                      </td>
                      <td>
                        <code style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.82rem' }}>
                          {url}
                        </code>
                      </td>
                      <td>
                        {/* Interactive Active/Deactive Toggle Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item)}
                          disabled={isToggling}
                          title={isLinkActive ? 'Click to Deactivate' : 'Click to Activate'}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '16px',
                            border: `1px solid ${isLinkActive ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                            background: isLinkActive ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            color: isLinkActive ? '#4ade80' : '#f87171',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {isLinkActive ? (
                            <>
                              <FaToggleOn style={{ fontSize: '1.15rem' }} />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <FaToggleOff style={{ fontSize: '1.15rem' }} />
                              <span>Deactive</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td>
                        <div className="flex gap-sm">
                          <button className="btn-icon" onClick={() => openModal(item)} title="Edit Link">
                            <FaEdit />
                          </button>
                          <button className="btn-icon text-danger" onClick={() => handleDelete(id)} title="Delete Link">
                            <FaTrash />
                          </button>
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
            </select>
            <button className="btn-secondary" disabled={pagination.page === 1} onClick={() => pagination.setPage(pagination.page - 1)}>Prev</button>
            <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{pagination.page} / {pagination.totalPages}</span>
            <button className="btn-secondary" disabled={pagination.page >= pagination.totalPages} onClick={() => pagination.setPage(pagination.page + 1)}>Next</button>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && createPortal(
        <div className="modal-overlay">
          <motion.div
            className="glass-panel modal-container"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="modal-header">
              <h2 className="modal-title">{editingLink ? 'Edit Role Link' : 'Add Role Navigation Link'}</h2>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Role <span className="form-required">*</span></label>
                  <select
                    className={`form-control${errors.SM_RL_ROLE_ID ? ' form-input-error' : ''}`}
                    value={formData.SM_RL_ROLE_ID}
                    onChange={(e) => setFormData({ ...formData, SM_RL_ROLE_ID: e.target.value })}
                    required
                  >
                    <option value="">Select Role</option>
                    {roles.map((r) => {
                      const rid = r.MAS_role_id || r.MAS_ROLE_ID || r.mas_role_id
                      const rdesc = r.MAS_role_DESC || r.MAS_ROLE_DESC || r.mas_role_desc || rid
                      return <option key={rid} value={rid}>{rdesc} ({rid})</option>
                    })}
                  </select>
                  {errors.SM_RL_ROLE_ID && <span className="form-error-msg">{errors.SM_RL_ROLE_ID}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Category / Submenu Section</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. User & Access, Institution, Academic"
                    value={formData.SM_RL_SUBMENU}
                    onChange={(e) => setFormData({ ...formData, SM_RL_SUBMENU: e.target.value })}
                  />
                  <small style={{ color: 'var(--clr-text-muted)', fontSize: '0.78rem' }}>
                    Groups this link under a section header in the sidepanel.
                  </small>
                </div>

                <div className="form-group">
                  <label className="form-label">Link Label <span className="form-required">*</span></label>
                  <input
                    type="text"
                    className={`form-control${errors.SM_RL_LINK_DESC ? ' form-input-error' : ''}`}
                    placeholder="e.g. Roles, School Details, Class Schedule"
                    value={formData.SM_RL_LINK_DESC}
                    onChange={(e) => setFormData({ ...formData, SM_RL_LINK_DESC: e.target.value })}
                    required
                  />
                  {errors.SM_RL_LINK_DESC && <span className="form-error-msg">{errors.SM_RL_LINK_DESC}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Navigation URL Path <span className="form-required">*</span></label>
                  <input
                    type="text"
                    className={`form-control${errors.SM_RL_LINK_URL ? ' form-input-error' : ''}`}
                    placeholder="e.g. /user/roles or /academic/schedule"
                    value={formData.SM_RL_LINK_URL}
                    onChange={(e) => setFormData({ ...formData, SM_RL_LINK_URL: e.target.value })}
                    required
                  />
                  {errors.SM_RL_LINK_URL && <span className="form-error-msg">{errors.SM_RL_LINK_URL}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Sequence Order (Serial No.)</label>
                  <input
                    type="number"
                    className="form-control"
                    min="1"
                    value={formData.SM_RL_LINK_SRL}
                    onChange={(e) => setFormData({ ...formData, SM_RL_LINK_SRL: parseInt(e.target.value) || 1 })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Status (Active / Deactive)</label>
                  <select
                    className="form-control"
                    value={formData.SM_RL_STATUS}
                    onChange={(e) => setFormData({ ...formData, SM_RL_STATUS: e.target.value })}
                  >
                    <option value="ACTIVE">Active (Visible in Sidepanel)</option>
                    <option value="INACTIVE">Deactive / Inactive (Hidden from Sidepanel)</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save to Database</button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}
    </motion.div>
  )
}
