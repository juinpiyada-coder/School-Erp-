import axios from '../../lib/axios'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FaPlus, FaTrash, FaEdit, FaSchool, FaEye, FaEyeSlash } from 'react-icons/fa'
import { createPortal } from 'react-dom'
import { INDIAN_STATES, CITIES_BY_STATE, ALL_INDIAN_CITIES, COUNTRIES, BOARDS, LANGUAGES } from '../../lib/indiaData'

import { toast } from 'react-toastify'

export default function SchoolDetails() {
  const [schools, setSchools] = useState([])
  const [boards, setBoards] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSchool, setEditingSchool] = useState(null)
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)

  const user = JSON.parse(sessionStorage.getItem('e_school_user') || '{}')
  const isSchoolAdmin = (user.user_role || user.role_id) === 'R_SCHOOLADMIN' || user.role === 'R_SCHOOLADMIN'

  const [formData, setFormData] = useState({
    schl_mn_id: '',
    schl_mn_nm: '',
    schl_mn_address: '',
    schl_mn_city: '',
    schl_mn_state: '',
    schl_mn_pin: '',
    schl_mn_country: '',
    schl_mn_emailid: '',
    schl_mn_contactno: '',
    schl_brd_id: '',
    schl_language: 'English',
    schl_mn_password: ''
  })

  useEffect(() => {
    loadSchools()
    loadBoards()
  }, [])

  async function loadBoards() {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/boards`)
      const list = Array.isArray(res.data) ? res.data : res.data?.data || []
      setBoards(list)
    } catch (err) {
      console.error('Failed to load boards from API', err)
    }
  }

  async function loadSchools() {
    try {
      setLoading(true)
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/auth/school`)
      let list = Array.isArray(res.data) ? res.data : res.data?.data || []
      
      if (isSchoolAdmin) {
          const centerId = String((user.user_id || user.id))
          list = list.filter(s => String(s.schl_mn_id || s.SCHL_MN_ID) === centerId)
      }
      
      setSchools(list)
    } catch (err) {
      toast.error('Failed to load schools')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function openModal(school = null) {
    setShowPassword(false)
    setErrors({})
    if (school) {
      setEditingSchool(school)
      setFormData({
        schl_mn_id: school.schl_mn_id || school.SCHL_MN_ID || '',
        schl_mn_nm: school.schl_mn_nm || school.SCHL_MN_NM || '',
        schl_mn_address: school.schl_mn_address || school.SCHL_MN_ADDRESS || '',
        schl_mn_city: school.schl_mn_city || school.SCHL_MN_CITY || '',
        schl_mn_state: school.schl_mn_state || school.SCHL_MN_STATE || '',
        schl_mn_pin: school.schl_mn_pin || school.SCHL_MN_PIN || '',
        schl_mn_country: school.schl_mn_country || school.SCHL_MN_COUNTRY || 'India',
        schl_mn_emailid: school.schl_mn_emailid || school.SCHL_MN_EMAILID || '',
        schl_mn_contactno: school.schl_mn_contactno || school.SCHL_MN_CONTACTNO || '',
        schl_brd_id: school.schl_brd_id || school.SCHL_BRD_ID || '',
        schl_language: school.schl_language || school.SCHL_LANGUAGE || 'English',
        schl_mn_status: school.schl_mn_status || school.SCHL_MN_STATUS || 'ACTIVE',
        schl_mn_password: '' // Password should typically be empty when editing, or handled separately
      })
    } else {
      setEditingSchool(null)
      setFormData({
        schl_mn_id: '', schl_mn_nm: '', schl_mn_address: '', schl_mn_city: '',
        schl_mn_state: '', schl_mn_pin: '', schl_mn_country: 'India', schl_mn_emailid: '', schl_mn_contactno: '',
        schl_brd_id: '', schl_language: 'English', schl_mn_status: 'ACTIVE', schl_mn_password: ''
      })
    }
    setIsModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = {}
    if (!formData.schl_mn_nm.trim()) errs.schl_mn_nm = 'School name is required.'
    else if (!/^[a-zA-Z\s]+$/.test(formData.schl_mn_nm.trim())) errs.schl_mn_nm = 'School name can only contain letters and spaces.'
    if (!formData.schl_mn_address.trim()) errs.schl_mn_address = 'Address is required.'
    if (!formData.schl_mn_city) errs.schl_mn_city = 'Please select a city.'
    if (!formData.schl_mn_state) errs.schl_mn_state = 'Please select a state.'
    if (!/^[1-9]\d{5}$/.test(formData.schl_mn_pin)) errs.schl_mn_pin = 'Enter a valid 6-digit PIN code.'
    if (!formData.schl_mn_country) errs.schl_mn_country = 'Please select a country.'
    if (!/^\S+@\S+\.\S+$/.test(formData.schl_mn_emailid)) errs.schl_mn_emailid = 'Please enter a valid email address'
    if (!/^[6-9]\d{9}$/.test(formData.schl_mn_contactno.replace(/[^0-9]/g, ''))) errs.schl_mn_contactno = 'Enter a valid 10-digit Indian number (starts with 6-9)'
    if (!editingSchool && formData.schl_mn_password.length < 6) errs.schl_mn_password = 'Password must be at least 6 characters long'
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    try {
      if (editingSchool) {
        const id = editingSchool.schl_mn_id || editingSchool.SCHL_MN_ID
        await axios.put(`${import.meta.env.VITE_API_BASE_URL}/auth/school/${id}`, formData)
        toast.success('School updated successfully')
      } else {
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/school`, formData)
        toast.success('School created successfully')
      }
      setIsModalOpen(false)
      loadSchools()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save school')
    }
  }

  async function handleToggleStatus(school) {
    const id = school.schl_mn_id || school.SCHL_MN_ID
    const currentStatus = (school.schl_mn_status || school.SCHL_MN_STATUS || 'ACTIVE').toUpperCase()
    const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    const actionWord = nextStatus === 'ACTIVE' ? 'activate' : 'deactivate'

    if (!window.confirm(`Are you sure you want to ${actionWord} "${school.schl_mn_nm || school.SCHL_MN_NM}"?`)) {
      return
    }

    try {
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/auth/school/${id}`, {
        schl_mn_status: nextStatus
      })
      toast.success(`School ${nextStatus === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`)
      loadSchools()
    } catch (err) {
      toast.error(err?.response?.data?.message || `Failed to ${actionWord} school`)
    }
  }

  return (
    <motion.div className="animate-fade-in" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isSchoolAdmin ? 'My School Profile' : 'School Details'}</h1>
          <p className="page-subtitle">{isSchoolAdmin ? 'Manage your school details' : 'Manage main school entities and profiles'}</p>
        </div>
        {!isSchoolAdmin && (
          <button className="btn-primary" onClick={() => openModal()}>
            <FaPlus /> Add School
          </button>
        )}
      </div>

      <div className="glass-panel page-card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID / Code</th>
                <th>School Name</th>
                <th>Board / Medium</th>
                <th>City / State</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center">Loading...</td>
                </tr>
              ) : schools.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center text-muted">No schools found</td>
                </tr>
              ) : (
                schools.map((s, idx) => {
                  const id = s.schl_mn_id || s.SCHL_MN_ID
                  const name = s.schl_mn_nm || s.SCHL_MN_NM
                  const boardDesc = s.schl_brd_desc || s.SCHL_BRD_DESC || s.schl_brd_id || s.SCHL_BRD_ID || s.schl_mn_board || '-'
                  const language = s.schl_language || s.SCHL_LANGUAGE || 'English'
                  const city = s.schl_mn_city || s.SCHL_MN_CITY
                  const state = s.schl_mn_state || s.SCHL_MN_STATE
                  const email = s.schl_mn_emailid || s.SCHL_MN_EMAILID
                  const phone = s.schl_mn_contactno || s.SCHL_MN_CONTACTNO
                  const status = (s.schl_mn_status || s.SCHL_MN_STATUS || 'ACTIVE').toUpperCase()
                  const isActive = status === 'ACTIVE'

                  return (
                    <tr key={id || idx}>
                      <td>
                        <div className="flex items-center gap-sm">
                          <FaSchool className="text-muted" size={16} />
                          <span className="badge badge-info">{id}</span>
                        </div>
                      </td>
                      <td className="font-bold">{name}</td>
                      <td>
                        <div className="font-medium">{boardDesc}</div>
                        <div className="text-small text-muted">Medium: {language}</div>
                      </td>
                      <td>{city}, {state}</td>
                      <td>
                        <div className="text-small">{email}</div>
                        <div className="text-small text-muted">{phone}</div>
                      </td>
                      <td>
                        <span className={`badge ${isActive ? 'badge-success' : 'badge-danger'}`}>
                          {isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-sm">
                          {/* Edit Button */}
                          <button
                            className="btn-icon"
                            onClick={() => openModal(s)}
                            title="Edit School Details"
                          >
                            <FaEdit />
                          </button>

                          {/* Deactivate / Activate Toggle for Super Admin */}
                          {!isSchoolAdmin && (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(s)}
                              title={isActive ? 'Deactivate School' : 'Activate School'}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                padding: '4px 6px',
                                borderRadius: '6px'
                              }}
                            >
                              <div
                                style={{
                                  width: '36px',
                                  height: '20px',
                                  borderRadius: '10px',
                                  background: isActive ? '#107c10' : '#d13438',
                                  position: 'relative',
                                  transition: 'background 0.25s ease'
                                }}
                              >
                                <div
                                  style={{
                                    width: '14px',
                                    height: '14px',
                                    borderRadius: '50%',
                                    background: '#ffffff',
                                    position: 'absolute',
                                    top: '3px',
                                    left: isActive ? '19px' : '3px',
                                    transition: 'left 0.25s ease',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isActive ? '#107c10' : '#d13438' }}>
                                {isActive ? 'Active' : 'Deactivated'}
                              </span>
                            </button>
                          )}
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
              <h2 className="modal-title">{editingSchool ? 'Edit School' : 'New School'}</h2>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body form-row-2col">
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">School Name <span className="form-required">*</span></label>
                  <input type="text" className={`form-control${errors.schl_mn_nm ? ' form-input-error' : ''}`} value={formData.schl_mn_nm} onChange={e => setFormData({...formData, schl_mn_nm: e.target.value.replace(/[^a-zA-Z\s]/g, '')})} required />
                  {errors.schl_mn_nm && <span className="form-error-msg">{errors.schl_mn_nm}</span>}
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Address <span className="form-required">*</span></label>
                  <input type="text" className={`form-control${errors.schl_mn_address ? ' form-input-error' : ''}`} value={formData.schl_mn_address} onChange={e => setFormData({...formData, schl_mn_address: e.target.value.replace(/[^a-zA-Z0-9\s,.\-\/]/g, '')})} required />
                  {errors.schl_mn_address && <span className="form-error-msg">{errors.schl_mn_address}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Affiliated Board</label>
                  <select
                    className="form-control"
                    value={formData.schl_brd_id}
                    onChange={e => setFormData({...formData, schl_brd_id: e.target.value})}
                  >
                    <option value="">Select Board</option>
                    {boards && boards.length > 0 ? (
                      boards.map(b => (
                        <option key={b.BRD_ID || b.brd_id} value={b.BRD_ID || b.brd_id}>
                          {b.BRD_DESC || b.brd_desc}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="BRD_CBSE">Central Board of Secondary Education (CBSE)</option>
                        <option value="BRD_ICSE">Indian Certificate of Secondary Education (ICSE / CISCE)</option>
                        <option value="BRD_WBBSE">West Bengal Board of Secondary Education (WBBSE)</option>
                        <option value="BRD_WBCHSE">West Bengal Council of Higher Secondary Education (WBCHSE)</option>
                      </>
                    )}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Medium of Instruction</label>
                  <select
                    className="form-control"
                    value={formData.schl_language}
                    onChange={e => setFormData({...formData, schl_language: e.target.value})}
                  >
                    {['English', 'Hindi', 'Bengali', 'Composite'].map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">State <span className="form-required">*</span></label>
                  <select
                    className={`form-control${errors.schl_mn_state ? ' form-input-error' : ''}`}
                    value={formData.schl_mn_state}
                    onChange={e => {
                      const newState = e.target.value
                      setFormData(prev => ({
                        ...prev,
                        schl_mn_state: newState
                      }))
                    }}
                    required
                  >
                    <option value="">Select State</option>
                    {INDIAN_STATES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {errors.schl_mn_state && <span className="form-error-msg">{errors.schl_mn_state}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">City <span className="form-required">*</span></label>
                  <select
                    className={`form-control${errors.schl_mn_city ? ' form-input-error' : ''}`}
                    value={formData.schl_mn_city}
                    onChange={e => {
                      const newCity = e.target.value
                      const matchedState = Object.keys(CITIES_BY_STATE).find(st => CITIES_BY_STATE[st].includes(newCity))
                      setFormData(prev => ({
                        ...prev,
                        schl_mn_city: newCity,
                        ...(matchedState && !prev.schl_mn_state ? { schl_mn_state: matchedState } : {})
                      }))
                    }}
                    required
                  >
                    <option value="">Select City</option>
                    {(() => {
                      let cityOptions = []
                      if (formData.schl_mn_state && CITIES_BY_STATE[formData.schl_mn_state]) {
                        cityOptions = [...CITIES_BY_STATE[formData.schl_mn_state]]
                      } else {
                        cityOptions = ALL_INDIAN_CITIES || []
                      }
                      if (formData.schl_mn_city && !cityOptions.includes(formData.schl_mn_city)) {
                        cityOptions = [formData.schl_mn_city, ...cityOptions]
                      }
                      return cityOptions.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))
                    })()}
                  </select>
                  {errors.schl_mn_city && <span className="form-error-msg">{errors.schl_mn_city}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">PIN Code <span className="form-required">*</span></label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className={`form-control${errors.schl_mn_pin ? ' form-input-error' : ''}`}
                    maxLength={6}
                    placeholder="e.g. 400001"
                    value={formData.schl_mn_pin}
                    onChange={e => setFormData({...formData, schl_mn_pin: e.target.value.replace(/[^0-9]/g, '').slice(0, 6)})}
                    onKeyPress={e => { if (!/[0-9]/.test(e.key)) e.preventDefault(); }}
                    required
                  />
                  {errors.schl_mn_pin && <span className="form-error-msg">{errors.schl_mn_pin}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Country <span className="form-required">*</span></label>
                  <select
                    className={`form-control${errors.schl_mn_country ? ' form-input-error' : ''}`}
                    value={formData.schl_mn_country}
                    onChange={e => setFormData({...formData, schl_mn_country: e.target.value})}
                    required
                  >
                    <option value="">Select Country</option>
                    {COUNTRIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {errors.schl_mn_country && <span className="form-error-msg">{errors.schl_mn_country}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Email ID <span className="form-required">*</span></label>
                  <input type="email" className={`form-control${errors.schl_mn_emailid ? ' form-input-error' : ''}`} value={formData.schl_mn_emailid} onChange={e => setFormData({...formData, schl_mn_emailid: e.target.value})} required />
                  {errors.schl_mn_emailid && <span className="form-error-msg">{errors.schl_mn_emailid}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Contact No <span className="form-required">*</span></label>
                  <input
                    type="tel"
                    className={`form-control${errors.schl_mn_contactno ? ' form-input-error' : ''}`}
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    pattern="[6-9][0-9]{9}"
                    title="Please enter a valid 10-digit Indian phone number starting with 6-9"
                    value={formData.schl_mn_contactno}
                    onChange={e => setFormData({...formData, schl_mn_contactno: e.target.value.replace(/[^0-9]/g, '').slice(0, 10)})}
                    onKeyPress={e => { if (!/[0-9]/.test(e.key)) e.preventDefault(); }}
                    required
                  />
                  {errors.schl_mn_contactno && <span className="form-error-msg">{errors.schl_mn_contactno}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-control"
                    value={formData.schl_mn_status || 'ACTIVE'}
                    onChange={e => setFormData({...formData, schl_mn_status: e.target.value})}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
                {!editingSchool && (
                  <div className="form-group">
                    <label className="form-label">Password <span className="form-required">*</span></label>
                    <div style={{ position: 'relative' }}>
                      <input type={showPassword ? 'text' : 'password'} className={`form-control${errors.schl_mn_password ? ' form-input-error' : ''}`} style={{ paddingRight: '2.5rem' }} value={formData.schl_mn_password} onChange={e => setFormData({...formData, schl_mn_password: e.target.value})} minLength={6} required />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--clr-text-secondary, #666)' }}
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                    {errors.schl_mn_password && <span className="form-error-msg">{errors.schl_mn_password}</span>}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save School</button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}
    </motion.div>
  )
}
