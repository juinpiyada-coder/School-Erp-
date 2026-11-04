import axios from '../../lib/axios'
import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { FaPlus, FaTrash, FaEdit, FaCodeBranch, FaEye, FaEyeSlash, FaSearch } from 'react-icons/fa'
import { createPortal } from 'react-dom'
import { toast } from 'react-toastify'
import { INDIAN_STATES, CITIES_BY_STATE, ALL_INDIAN_CITIES, COUNTRIES, MEDIUMS, BOARDS } from '../../lib/indiaData'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import usePagination from '../../hooks/usePagination'

const INITIAL_FORM = {
  SCHL_BR_ID: '', SCHL_BR_CENTER_ID: '', SCHL_BR_NM: '', SCHL_BR_ADDRESS: '',
  SCHL_BR_CITY: '', SCHL_BR_STATE: '', SCHL_BR_PIN: '', SCHL_BR_COUNTRY: 'India',
  SCHL_BR_MEDIUM: '', SCHL_BR_BOARD: '', SCHL_BR_EMAILID: '', SCHL_BR_CONTACTNO: '', SCHL_BR_PASSWORD: ''
}

// Reusable Form Field helper to eliminate repetitive markup
function FormField({ label, required = true, error, fullWidth = false, children }) {
  return (
    <div className="form-group" style={fullWidth ? { gridColumn: '1 / -1' } : undefined}>
      <label className="form-label">{label} {required && <span className="form-required">*</span>}</label>
      {children}
      {error && <span className="form-error-msg">{error}</span>}
    </div>
  )
}

export default function Branches() {
  const [branches, setBranches] = useState([])
  const [schools, setSchools] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [search, setSearch] = useState('')
  const [formData, setFormData] = useState(INITIAL_FORM)

  const user = useMemo(() => JSON.parse(sessionStorage.getItem('e_school_user') || '{}'), [])
  const userRole = (user?.user_role || user?.role_id || user?.role || '').toLowerCase()
  const isSuperAdmin = userRole.includes('super')
  const isSchoolAdmin = userRole.includes('school') && !isSuperAdmin
  const isBranchAdmin = userRole.includes('branch') && !isSuperAdmin

  const defaultSchoolId = user.school_id || user.SCHL_ID || user.user_school_id || user.user_id || user.id || ''

  useEffect(() => {
    loadBranches()
    loadSchools()
  }, [])

  async function loadSchools() {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/auth/school`)
      let list = Array.isArray(res.data) ? res.data : res.data?.data || []
      if (isSchoolAdmin && defaultSchoolId) {
        const matched = list.filter(s => String(s.schl_mn_id || s.SCHL_MN_ID || '') === String(defaultSchoolId))
        if (matched.length > 0) list = matched
      }
      setSchools(list)
    } catch (err) {
      console.error('Failed to load schools', err)
    }
  }

  async function loadBranches() {
    try {
      setLoading(true)
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/branches?limit=1000`)
      setBranches(Array.isArray(res.data) ? res.data : res.data?.data || [])
    } catch (err) {
      toast.error('Failed to load branches')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function openModal(branch = null) {
    setShowPassword(false)
    setErrors({})
    const schoolFallback = defaultSchoolId || (schools[0]?.schl_mn_id || schools[0]?.SCHL_MN_ID) || ''
    if (branch) {
      setEditingBranch(branch)
      setFormData({
        SCHL_BR_ID: branch.SCHL_BR_ID || branch.schl_br_id || '',
        SCHL_BR_CENTER_ID: branch.SCHL_BR_CENTER_ID || branch.schl_br_center_id || schoolFallback,
        SCHL_BR_NM: branch.SCHL_BR_NM || branch.schl_br_nm || '',
        SCHL_BR_ADDRESS: branch.SCHL_BR_ADDRESS || branch.schl_br_address || '',
        SCHL_BR_CITY: branch.SCHL_BR_CITY || branch.schl_br_city || '',
        SCHL_BR_STATE: branch.SCHL_BR_STATE || branch.schl_br_state || '',
        SCHL_BR_PIN: branch.SCHL_BR_PIN || branch.schl_br_pin || '',
        SCHL_BR_COUNTRY: branch.SCHL_BR_COUNTRY || branch.schl_br_country || 'India',
        SCHL_BR_MEDIUM: branch.SCHL_BR_MEDIUM || branch.schl_br_medium || '',
        SCHL_BR_BOARD: branch.SCHL_BR_BOARD || branch.schl_br_board || '',
        SCHL_BR_EMAILID: branch.SCHL_BR_EMAILID || branch.schl_br_emailid || '',
        SCHL_BR_CONTACTNO: branch.SCHL_BR_CONTACTNO || branch.schl_br_contactno || '',
        SCHL_BR_PASSWORD: ''
      })
    } else {
      setEditingBranch(null)
      setFormData({ ...INITIAL_FORM, SCHL_BR_CENTER_ID: schoolFallback })
    }
    setIsModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = {}
    if (!formData.SCHL_BR_NM.trim()) {
      errs.SCHL_BR_NM = 'Branch name is required.'
    } else if (!/^[a-zA-Z0-9\s]+$/.test(formData.SCHL_BR_NM.trim())) {
      errs.SCHL_BR_NM = 'Branch name can only contain letters, numbers, and spaces.'
    }
    if (!formData.SCHL_BR_ADDRESS.trim()) errs.SCHL_BR_ADDRESS = 'Address is required.'
    if (!formData.SCHL_BR_CITY) errs.SCHL_BR_CITY = 'Please select a city.'
    if (!formData.SCHL_BR_STATE) errs.SCHL_BR_STATE = 'Please select a state.'
    if (!/^[1-9]\d{5}$/.test(formData.SCHL_BR_PIN)) errs.SCHL_BR_PIN = 'Enter a valid 6-digit PIN code.'
    if (!formData.SCHL_BR_COUNTRY) errs.SCHL_BR_COUNTRY = 'Please select a country.'
    if (!formData.SCHL_BR_MEDIUM) errs.SCHL_BR_MEDIUM = 'Please select a medium.'
    if (!formData.SCHL_BR_BOARD) errs.SCHL_BR_BOARD = 'Please select a board.'
    if (!/^\S+@\S+\.\S+$/.test(formData.SCHL_BR_EMAILID)) errs.SCHL_BR_EMAILID = 'Please enter a valid email address'
    if (!/^[6-9]\d{9}$/.test(formData.SCHL_BR_CONTACTNO)) errs.SCHL_BR_CONTACTNO = 'Enter a valid 10-digit Indian number (starts with 6-9)'
    if (!editingBranch && formData.SCHL_BR_PASSWORD.length < 6) errs.SCHL_BR_PASSWORD = 'Password must be at least 6 characters long'

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    try {
      const url = `${import.meta.env.VITE_API_BASE_URL}/academic/branches`
      if (editingBranch) {
        const id = editingBranch.SCHL_BR_ID || editingBranch.schl_br_id
        await axios.put(`${url}/${id}`, formData)
        toast.success('Branch updated successfully')
      } else {
        await axios.post(url, formData)
        toast.success('Branch created successfully')
      }
      setIsModalOpen(false)
      loadBranches()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save branch')
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this branch?')) return
    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/academic/branches/${id}`)
      toast.success('Branch deleted successfully')
      loadBranches()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete branch')
    }
  }

  const debouncedSearch = useDebouncedValue(search, 300)
  const filtered = useMemo(() => branches.filter((b) => {
    const text = `${b.SCHL_BR_ID || b.schl_br_id || ''} ${b.SCHL_BR_NM || b.schl_br_nm || ''} ${b.SCHL_BR_CITY || b.schl_br_city || ''} ${b.SCHL_BR_STATE || b.schl_br_state || ''} ${b.SCHL_BR_EMAILID || b.schl_br_emailid || ''}`.toLowerCase()
    return text.includes(debouncedSearch.toLowerCase())
  }), [branches, debouncedSearch])

  const pagination = usePagination(filtered, 10)

  // Derived city list based on selected state
  const cityOptions = useMemo(() => {
    let list = formData.SCHL_BR_STATE && CITIES_BY_STATE[formData.SCHL_BR_STATE] ? [...CITIES_BY_STATE[formData.SCHL_BR_STATE]] : (ALL_INDIAN_CITIES || [])
    if (formData.SCHL_BR_CITY && !list.includes(formData.SCHL_BR_CITY)) list = [formData.SCHL_BR_CITY, ...list]
    return list
  }, [formData.SCHL_BR_STATE, formData.SCHL_BR_CITY])

  return (
    <motion.div className="animate-fade-in" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Branches</h1>
          <p className="page-subtitle">Manage school campuses and branches</p>
        </div>
        <button className="btn-primary" onClick={() => openModal()}><FaPlus /> Add Branch</button>
      </div>

      <div className="glass-panel page-card">
        <div className="filter-row" style={{ marginBottom: '16px' }}>
          <div className="header-search">
            <span className="header-search-icon"><FaSearch /></span>
            <input
              className="header-search-input"
              type="search"
              placeholder="Search branches by name, city, state, or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search branches"
            />
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Branch Code</th>
                <th>Branch Name</th>
                <th>City / State</th>
                <th>Medium / Board</th>
                <th>Contact</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="text-center">Loading...</td></tr>
              ) : pagination.pageItems.length === 0 ? (
                <tr><td colSpan="6" className="text-center text-muted">{search ? 'No branches match your search.' : 'No branches found.'}</td></tr>
              ) : (
                pagination.pageItems.map((b) => {
                  const id = b.SCHL_BR_ID || b.schl_br_id
                  return (
                    <tr key={id}>
                      <td>
                        <div className="flex items-center gap-sm">
                          <FaCodeBranch className="text-muted" size={16} />
                          <span className="badge badge-info">{id}</span>
                        </div>
                      </td>
                      <td className="font-bold">{b.SCHL_BR_NM || b.schl_br_nm}</td>
                      <td>{b.SCHL_BR_CITY || b.schl_br_city}, {b.SCHL_BR_STATE || b.schl_br_state}</td>
                      <td>
                        <div className="text-small">{b.SCHL_BR_MEDIUM || b.schl_br_medium || '—'}</div>
                        <div className="text-small text-muted">{b.SCHL_BR_BOARD || b.schl_br_board || '—'}</div>
                      </td>
                      <td>
                        <div className="text-small">{b.SCHL_BR_EMAILID || b.schl_br_emailid}</div>
                        <div className="text-small text-muted">{b.SCHL_BR_CONTACTNO || b.schl_br_contactno}</div>
                      </td>
                      <td>
                        <div className="flex gap-sm">
                          <button className="btn-icon" onClick={() => openModal(b)} title="Edit"><FaEdit /></button>
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

      {filtered.length > 0 && (
        <div className="table-toolbar-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', marginTop: '12px', background: 'var(--clr-panel)', borderRadius: 'var(--radius-md)' }}>
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
              {[10, 25, 50, 100].map(s => <option key={s} value={s}>{s} / page</option>)}
            </select>
            <button className="btn-secondary" disabled={pagination.page === 1} onClick={() => pagination.setPage(pagination.page - 1)}>Prev</button>
            <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{pagination.page} / {pagination.totalPages}</span>
            <button className="btn-secondary" disabled={pagination.page >= pagination.totalPages} onClick={() => pagination.setPage(pagination.page + 1)}>Next</button>
          </div>
        </div>
      )}

      {isModalOpen && createPortal(
        <div className="modal-overlay">
          <motion.div className="glass-panel modal-container" style={{ maxWidth: '600px' }} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="modal-header">
              <h2 className="modal-title">{editingBranch ? 'Edit Branch' : 'New Branch'}</h2>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body form-row-2col">
                <FormField label="School / Center" fullWidth>
                  <select className="form-control" value={formData.SCHL_BR_CENTER_ID} onChange={e => setFormData({...formData, SCHL_BR_CENTER_ID: e.target.value})} required disabled={isSchoolAdmin || isBranchAdmin}>
                    <option value="">Select School</option>
                    {schools.map(s => <option key={s.schl_mn_id || s.SCHL_MN_ID} value={s.schl_mn_id || s.SCHL_MN_ID}>{s.schl_mn_nm || s.SCHL_MN_NM}</option>)}
                  </select>
                </FormField>

                <FormField label="Branch Name" error={errors.SCHL_BR_NM} fullWidth>
                  <input
                    type="text"
                    className={`form-control${errors.SCHL_BR_NM ? ' form-input-error' : ''}`}
                    placeholder="e.g. North Campus"
                    value={formData.SCHL_BR_NM}
                    onChange={e => setFormData({ ...formData, SCHL_BR_NM: e.target.value.replace(/[^a-zA-Z0-9\s]/g, '') })}
                    onKeyPress={e => {
                      if (!/[a-zA-Z0-9\s]/.test(e.key)) {
                        e.preventDefault()
                      }
                    }}
                    required
                  />
                </FormField>

                <FormField label="Address" error={errors.SCHL_BR_ADDRESS} fullWidth>
                  <input type="text" className={`form-control${errors.SCHL_BR_ADDRESS ? ' form-input-error' : ''}`} placeholder="Branch street address" value={formData.SCHL_BR_ADDRESS} onChange={e => setFormData({...formData, SCHL_BR_ADDRESS: e.target.value.replace(/[^a-zA-Z0-9\s,.\-\/]/g, '')})} required />
                </FormField>

                <FormField label="State" error={errors.SCHL_BR_STATE}>
                  <select className={`form-control${errors.SCHL_BR_STATE ? ' form-input-error' : ''}`} value={formData.SCHL_BR_STATE} onChange={e => setFormData(prev => ({ ...prev, SCHL_BR_STATE: e.target.value }))} required>
                    <option value="">Select State</option>
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </FormField>

                <FormField label="City" error={errors.SCHL_BR_CITY}>
                  <select className={`form-control${errors.SCHL_BR_CITY ? ' form-input-error' : ''}`} value={formData.SCHL_BR_CITY} onChange={e => {
                    const newCity = e.target.value
                    const matchedState = Object.keys(CITIES_BY_STATE).find(st => CITIES_BY_STATE[st].includes(newCity))
                    setFormData(prev => ({ ...prev, SCHL_BR_CITY: newCity, ...(matchedState && !prev.SCHL_BR_STATE ? { SCHL_BR_STATE: matchedState } : {}) }))
                  }} required>
                    <option value="">Select City</option>
                    {cityOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </FormField>

                <FormField label="PIN Code" error={errors.SCHL_BR_PIN}>
                  <input type="text" inputMode="numeric" maxLength={6} placeholder="e.g. 400001" className={`form-control${errors.SCHL_BR_PIN ? ' form-input-error' : ''}`} value={formData.SCHL_BR_PIN} onChange={e => setFormData({...formData, SCHL_BR_PIN: e.target.value.replace(/[^0-9]/g, '').slice(0, 6)})} onKeyPress={e => { if (!/[0-9]/.test(e.key)) e.preventDefault() }} required />
                </FormField>

                <FormField label="Country" error={errors.SCHL_BR_COUNTRY}>
                  <select className={`form-control${errors.SCHL_BR_COUNTRY ? ' form-input-error' : ''}`} value={formData.SCHL_BR_COUNTRY} onChange={e => setFormData({...formData, SCHL_BR_COUNTRY: e.target.value})} required>
                    <option value="">Select Country</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </FormField>

                <FormField label="Medium" error={errors.SCHL_BR_MEDIUM}>
                  <select className={`form-control${errors.SCHL_BR_MEDIUM ? ' form-input-error' : ''}`} value={formData.SCHL_BR_MEDIUM} onChange={e => setFormData({...formData, SCHL_BR_MEDIUM: e.target.value})} required>
                    <option value="">Select Medium</option>
                    {MEDIUMS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </FormField>

                <FormField label="Board" error={errors.SCHL_BR_BOARD}>
                  <select className={`form-control${errors.SCHL_BR_BOARD ? ' form-input-error' : ''}`} value={formData.SCHL_BR_BOARD} onChange={e => setFormData({...formData, SCHL_BR_BOARD: e.target.value})} required>
                    <option value="">Select Board</option>
                    {BOARDS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </FormField>

                <FormField label="Email ID" error={errors.SCHL_BR_EMAILID}>
                  <input type="email" className={`form-control${errors.SCHL_BR_EMAILID ? ' form-input-error' : ''}`} value={formData.SCHL_BR_EMAILID} onChange={e => setFormData({...formData, SCHL_BR_EMAILID: e.target.value})} required />
                </FormField>

                <FormField label="Contact No (10-digits)" error={errors.SCHL_BR_CONTACTNO}>
                  <input type="tel" maxLength={10} placeholder="e.g. 9876543210" className={`form-control${errors.SCHL_BR_CONTACTNO ? ' form-input-error' : ''}`} value={formData.SCHL_BR_CONTACTNO} onChange={e => setFormData({...formData, SCHL_BR_CONTACTNO: e.target.value.replace(/[^0-9]/g, '').slice(0, 10)})} onKeyPress={e => { if (!/[0-9]/.test(e.key)) e.preventDefault() }} required />
                </FormField>

                {!editingBranch && (
                  <FormField label="Password (min 6 chars)" error={errors.SCHL_BR_PASSWORD}>
                    <div style={{ position: 'relative' }}>
                      <input type={showPassword ? 'text' : 'password'} className={`form-control${errors.SCHL_BR_PASSWORD ? ' form-input-error' : ''}`} style={{ paddingRight: '2.5rem' }} value={formData.SCHL_BR_PASSWORD} onChange={e => setFormData({...formData, SCHL_BR_PASSWORD: e.target.value})} minLength={6} required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--clr-text-secondary, #666)' }} aria-label="Toggle password visibility">
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </FormField>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Branch</button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}
    </motion.div>
  )
}
