import axios from '../../lib/axios'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FaPlus, FaTrash, FaEdit, FaCodeBranch, FaEye, FaEyeSlash, FaSearch } from 'react-icons/fa'
import { createPortal } from 'react-dom'
import { toast } from 'react-toastify'
import { INDIAN_STATES, CITIES_BY_STATE, ALL_INDIAN_CITIES, COUNTRIES, MEDIUMS, BOARDS } from '../../lib/indiaData'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import usePagination from '../../hooks/usePagination'

export default function Branches() {
  const [branches, setBranches] = useState([])
  const [schools, setSchools] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [search, setSearch] = useState('')

  const user = JSON.parse(sessionStorage.getItem('e_school_user') || '{}')
  const isSchoolAdmin = (user.user_role || user.role_id) === 'R_SCHOOLADMIN' || user.role === 'R_SCHOOLADMIN'
  const isBranchAdmin = (user.user_role || user.role_id) === 'R_BRANCHADMIN' || user.role === 'R_BRANCHADMIN'

  const [formData, setFormData] = useState({
    SCHL_BR_ID: '',
    SCHL_BR_CENTER_ID: '',
    SCHL_BR_NM: '',
    SCHL_BR_ADDRESS: '',
    SCHL_BR_CITY: '',
    SCHL_BR_STATE: '',
    SCHL_BR_PIN: '',
    SCHL_BR_COUNTRY: 'India',
    SCHL_BR_MEDIUM: '',
    SCHL_BR_BOARD: '',
    SCHL_BR_EMAILID: '',
    SCHL_BR_CONTACTNO: '',
    SCHL_BR_PASSWORD: ''
  })

  useEffect(() => {
    loadBranches()
    loadSchools()
  }, [])

  async function loadSchools() {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/auth/school`)
      let list = Array.isArray(res.data) ? res.data : res.data?.data || []
      
      if (isSchoolAdmin) {
          const centerId = String((user.user_id || user.id))
          list = list.filter(s => String(s.schl_mn_id || s.SCHL_MN_ID) === centerId)
      }
      
      setSchools(list)
    } catch (err) {
      console.error('Failed to load schools', err)
    }
  }

  async function loadBranches() {
    try {
      setLoading(true)
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/branches`)
      let list = Array.isArray(res.data) ? res.data : res.data?.data || []
      
      const centerId = String(user.user_id || user.id || user.userId || '')
      if (isSchoolAdmin && centerId) {
         const filtered = list.filter(b => String(b.SCHL_BR_CENTER_ID || b.schl_br_center_id) === centerId)
         if (filtered.length > 0) list = filtered
      } else if (isBranchAdmin && centerId) {
         const filtered = list.filter(b => String(b.SCHL_BR_ID || b.schl_br_id) === centerId)
         if (filtered.length > 0) list = filtered
      }
      
      setBranches(list)
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
    if (branch) {
      setEditingBranch(branch)
      setFormData({
        SCHL_BR_ID: branch.SCHL_BR_ID || branch.schl_br_id || '',
        SCHL_BR_CENTER_ID: branch.SCHL_BR_CENTER_ID || branch.schl_br_center_id || '',
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
      setFormData({
        SCHL_BR_ID: '', SCHL_BR_CENTER_ID: isSchoolAdmin ? ((user.user_id || user.id) || '') : '', SCHL_BR_NM: '', SCHL_BR_ADDRESS: '',
        SCHL_BR_CITY: '', SCHL_BR_STATE: '', SCHL_BR_PIN: '', SCHL_BR_COUNTRY: 'India',
        SCHL_BR_MEDIUM: '', SCHL_BR_BOARD: '',
        SCHL_BR_EMAILID: '', SCHL_BR_CONTACTNO: '', SCHL_BR_PASSWORD: ''
      })
    }
    setIsModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = {}
    if (!formData.SCHL_BR_NM.trim()) errs.SCHL_BR_NM = 'Branch name is required.'
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
      if (editingBranch) {
        const id = editingBranch.SCHL_BR_ID || editingBranch.schl_br_id
        await axios.put(`${import.meta.env.VITE_API_BASE_URL}/academic/branches/${id}`, formData)
        toast.success('Branch updated successfully')
      } else {
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/academic/branches`, formData)
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
  const filtered = branches.filter((b) => {
    const name = b.SCHL_BR_NM || b.schl_br_nm || ''
    const city = b.SCHL_BR_CITY || b.schl_br_city || ''
    const state = b.SCHL_BR_STATE || b.schl_br_state || ''
    const email = b.SCHL_BR_EMAILID || b.schl_br_emailid || ''
    const id = b.SCHL_BR_ID || b.schl_br_id || ''
    return `${id} ${name} ${city} ${state} ${email}`.toLowerCase().includes(debouncedSearch.toLowerCase())
  })

  const pagination = usePagination(filtered, 10)

  return (
    <motion.div className="animate-fade-in" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Branches</h1>
          <p className="page-subtitle">Manage school campuses and branches</p>
        </div>
        <button className="btn-primary" onClick={() => openModal()}>
          <FaPlus /> Add Branch
        </button>
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
                <tr>
                  <td colSpan="6" className="text-center">Loading...</td>
                </tr>
              ) : pagination.pageItems.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-muted">{search ? 'No branches match your search.' : 'No branches found.'}</td>
                </tr>
              ) : (
                pagination.pageItems.map((b) => {
                  const id = b.SCHL_BR_ID || b.schl_br_id
                  const name = b.SCHL_BR_NM || b.schl_br_nm
                  const city = b.SCHL_BR_CITY || b.schl_br_city
                  const state = b.SCHL_BR_STATE || b.schl_br_state
                  const email = b.SCHL_BR_EMAILID || b.schl_br_emailid
                  const phone = b.SCHL_BR_CONTACTNO || b.schl_br_contactno
                  const medium = b.SCHL_BR_MEDIUM || b.schl_br_medium
                  const board = b.SCHL_BR_BOARD || b.schl_br_board

                  return (
                    <tr key={id}>
                      <td>
                        <div className="flex items-center gap-sm">
                          <FaCodeBranch className="text-muted" size={16} />
                          <span className="badge badge-info">{id}</span>
                        </div>
                      </td>
                      <td className="font-bold">{name}</td>
                      <td>{city}, {state}</td>
                      <td>
                        <div className="text-small">{medium || '—'}</div>
                        <div className="text-small text-muted">{board || '—'}</div>
                      </td>
                      <td>
                        <div className="text-small">{email}</div>
                        <div className="text-small text-muted">{phone}</div>
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

      {/* Pagination Footer */}
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
            style={{ maxWidth: '600px' }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="modal-header">
              <h2 className="modal-title">{editingBranch ? 'Edit Branch' : 'New Branch'}</h2>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body form-row-2col">
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">School / Center <span className="form-required">*</span></label>
                  <select className="form-control" value={formData.SCHL_BR_CENTER_ID} onChange={e => setFormData({...formData, SCHL_BR_CENTER_ID: e.target.value})} required disabled={isSchoolAdmin || isBranchAdmin}>
                    <option value="">Select School</option>
                    {schools.map(school => (
                      <option key={school.schl_mn_id || school.SCHL_MN_ID} value={school.schl_mn_id || school.SCHL_MN_ID}>
                        {school.schl_mn_nm || school.SCHL_MN_NM}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Branch Name <span className="form-required">*</span></label>
                  <input
                    type="text"
                    className={`form-control${errors.SCHL_BR_NM ? ' form-input-error' : ''}`}
                    placeholder="e.g. North Campus"
                    value={formData.SCHL_BR_NM}
                    onChange={e => setFormData({...formData, SCHL_BR_NM: e.target.value})}
                    required
                  />
                  {errors.SCHL_BR_NM && <span className="form-error-msg">{errors.SCHL_BR_NM}</span>}
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Address <span className="form-required">*</span></label>
                  <input
                    type="text"
                    className={`form-control${errors.SCHL_BR_ADDRESS ? ' form-input-error' : ''}`}
                    placeholder="Branch street address"
                    value={formData.SCHL_BR_ADDRESS}
                    onChange={e => setFormData({...formData, SCHL_BR_ADDRESS: e.target.value.replace(/[^a-zA-Z0-9\s,.\-\/]/g, '')})}
                    required
                  />
                  {errors.SCHL_BR_ADDRESS && <span className="form-error-msg">{errors.SCHL_BR_ADDRESS}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">State <span className="form-required">*</span></label>
                  <select
                    className={`form-control${errors.SCHL_BR_STATE ? ' form-input-error' : ''}`}
                    value={formData.SCHL_BR_STATE}
                    onChange={e => {
                      const newState = e.target.value
                      setFormData(prev => ({
                        ...prev,
                        SCHL_BR_STATE: newState
                      }))
                    }}
                    required
                  >
                    <option value="">Select State</option>
                    {INDIAN_STATES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {errors.SCHL_BR_STATE && <span className="form-error-msg">{errors.SCHL_BR_STATE}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">City <span className="form-required">*</span></label>
                  <select
                    className={`form-control${errors.SCHL_BR_CITY ? ' form-input-error' : ''}`}
                    value={formData.SCHL_BR_CITY}
                    onChange={e => {
                      const newCity = e.target.value
                      const matchedState = Object.keys(CITIES_BY_STATE).find(st => CITIES_BY_STATE[st].includes(newCity))
                      setFormData(prev => ({
                        ...prev,
                        SCHL_BR_CITY: newCity,
                        ...(matchedState && !prev.SCHL_BR_STATE ? { SCHL_BR_STATE: matchedState } : {})
                      }))
                    }}
                    required
                  >
                    <option value="">Select City</option>
                    {(() => {
                      let cityOptions = []
                      if (formData.SCHL_BR_STATE && CITIES_BY_STATE[formData.SCHL_BR_STATE]) {
                        cityOptions = [...CITIES_BY_STATE[formData.SCHL_BR_STATE]]
                      } else {
                        cityOptions = ALL_INDIAN_CITIES || []
                      }
                      if (formData.SCHL_BR_CITY && !cityOptions.includes(formData.SCHL_BR_CITY)) {
                        cityOptions = [formData.SCHL_BR_CITY, ...cityOptions]
                      }
                      return cityOptions.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))
                    })()}
                  </select>
                  {errors.SCHL_BR_CITY && <span className="form-error-msg">{errors.SCHL_BR_CITY}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">PIN Code <span className="form-required">*</span></label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className={`form-control${errors.SCHL_BR_PIN ? ' form-input-error' : ''}`}
                    maxLength={6}
                    placeholder="e.g. 400001"
                    value={formData.SCHL_BR_PIN}
                    onChange={e => setFormData({...formData, SCHL_BR_PIN: e.target.value.replace(/[^0-9]/g, '').slice(0, 6)})}
                    onKeyPress={e => { if (!/[0-9]/.test(e.key)) e.preventDefault(); }}
                    required
                  />
                  {errors.SCHL_BR_PIN && <span className="form-error-msg">{errors.SCHL_BR_PIN}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Country <span className="form-required">*</span></label>
                  <select
                    className={`form-control${errors.SCHL_BR_COUNTRY ? ' form-input-error' : ''}`}
                    value={formData.SCHL_BR_COUNTRY}
                    onChange={e => setFormData({...formData, SCHL_BR_COUNTRY: e.target.value})}
                    required
                  >
                    <option value="">Select Country</option>
                    {COUNTRIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {errors.SCHL_BR_COUNTRY && <span className="form-error-msg">{errors.SCHL_BR_COUNTRY}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Medium <span className="form-required">*</span></label>
                  <select
                    className={`form-control${errors.SCHL_BR_MEDIUM ? ' form-input-error' : ''}`}
                    value={formData.SCHL_BR_MEDIUM}
                    onChange={e => setFormData({...formData, SCHL_BR_MEDIUM: e.target.value})}
                    required
                  >
                    <option value="">Select Medium</option>
                    {MEDIUMS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  {errors.SCHL_BR_MEDIUM && <span className="form-error-msg">{errors.SCHL_BR_MEDIUM}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Board <span className="form-required">*</span></label>
                  <select
                    className={`form-control${errors.SCHL_BR_BOARD ? ' form-input-error' : ''}`}
                    value={formData.SCHL_BR_BOARD}
                    onChange={e => setFormData({...formData, SCHL_BR_BOARD: e.target.value})}
                    required
                  >
                    <option value="">Select Board</option>
                    {BOARDS.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  {errors.SCHL_BR_BOARD && <span className="form-error-msg">{errors.SCHL_BR_BOARD}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Email ID <span className="form-required">*</span></label>
                  <input type="email" className={`form-control${errors.SCHL_BR_EMAILID ? ' form-input-error' : ''}`} value={formData.SCHL_BR_EMAILID} onChange={e => setFormData({...formData, SCHL_BR_EMAILID: e.target.value})} required />
                  {errors.SCHL_BR_EMAILID && <span className="form-error-msg">{errors.SCHL_BR_EMAILID}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Contact No (10-digits) <span className="form-required">*</span></label>
                  <input
                    type="tel"
                    className={`form-control${errors.SCHL_BR_CONTACTNO ? ' form-input-error' : ''}`}
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    pattern="[6-9][0-9]{9}"
                    title="Please enter a valid 10-digit Indian phone number starting with 6-9"
                    value={formData.SCHL_BR_CONTACTNO}
                    onChange={e => setFormData({...formData, SCHL_BR_CONTACTNO: e.target.value.replace(/[^0-9]/g, '').slice(0, 10)})}
                    onKeyPress={e => { if (!/[0-9]/.test(e.key)) e.preventDefault(); }}
                    required
                  />
                  {errors.SCHL_BR_CONTACTNO && <span className="form-error-msg">{errors.SCHL_BR_CONTACTNO}</span>}
                </div>
                {!editingBranch && (
                  <div className="form-group">
                    <label className="form-label">Password (min 6 chars) <span className="form-required">*</span></label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className={`form-control${errors.SCHL_BR_PASSWORD ? ' form-input-error' : ''}`}
                        style={{ paddingRight: '2.5rem' }}
                        value={formData.SCHL_BR_PASSWORD}
                        onChange={e => setFormData({...formData, SCHL_BR_PASSWORD: e.target.value})}
                        minLength={6}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--clr-text-secondary, #666)' }}
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                    {errors.SCHL_BR_PASSWORD && <span className="form-error-msg">{errors.SCHL_BR_PASSWORD}</span>}
                  </div>
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
