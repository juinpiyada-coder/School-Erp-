import axios from '../../lib/axios'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FaSearch, FaCog, FaEdit, FaTrash, FaPlus, FaSchool, FaMicroscope, FaLaptop, FaTheaterMasks, FaRunning, FaBuilding, FaCheckCircle, FaInfoCircle, FaWrench } from 'react-icons/fa'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import usePagination from '../../hooks/usePagination'
import { toast } from 'react-toastify'
import { ROOM_CATEGORIES } from '../../lib/indiaData'

const TYPE_ICONS = {
  'Classroom':    <FaSchool />,
  'Science Lab':  <FaMicroscope />,
  'Laboratory':   <FaMicroscope />,
  'Computer Lab': <FaLaptop />,
  'Auditorium':   <FaTheaterMasks />,
  'Sports Hall':  <FaRunning />,
  'Sports Room':  <FaRunning />,
  'Conference Room': <FaBuilding />,
  'Meeting Room': <FaBuilding />,
  'Teachers Room': <FaBuilding />,
  'Canteen': <FaBuilding />,
  'Library': <FaBuilding />,
}

const STATUS_BADGE = {
  'Available':   'badge-success',
  'In Use':      'badge-info',
  'Maintenance': 'badge-warning',
}

const FLOOR_OPTIONS = [
  'Ground Floor',
  'Basement',
  '1st Floor',
  '2nd Floor',
  '3rd Floor',
  '4th Floor',
  '5th Floor',
  '6th Floor',
  '7th Floor',
  '8th Floor',
  '9th Floor',
  '10th Floor',
  'Other'
]

function normaliseRoom(r, branchesList = []) {
  const branchId = r.SCHL_BR_REF_ID || r.schl_br_ref_id || r.branchId || r.branch_id;
  let bName = r.branch_name || r.SCHL_BR_NM || r.schl_br_nm;
  if (!bName && branchId && Array.isArray(branchesList)) {
    const br = branchesList.find(b => String(b.SCHL_BR_ID || b.schl_br_id) === String(branchId));
    if (br) bName = br.SCHL_BR_NM || br.schl_br_nm;
  }
  return {
    id: r.SCHL_BR_RM_ID || r.schl_br_rm_id || r.id,
    room_no: r.SCHL_BR_RM_ID || r.schl_br_rm_id || r.id,
    name: r.SCHL_BR_ROOM_DESC || r.schl_br_room_desc || r.name || 'Unknown Room',
    building: r.SCHL_BR_BUILDING || r.schl_br_building || 'Main Building',
    category: r.SCHL_BR_ROOM_CAT || r.schl_br_room_cat || (r.SCHL_BR_ISLAB === 'Y' ? 'Laboratory' : 'Classroom'),
    capacity: r.SCHL_BR_ROOM_CAPACITY || r.schl_br_room_capacity || r.capacity || 30,
    type: r.SCHL_BR_ROOM_CAT || (r.SCHL_BR_ISLAB === 'Y' || r.schl_br_islab === 'Y' ? 'Laboratory' : (r.type || 'Classroom')),
    floor: r.SCHL_BR_FLR || r.schl_br_flr || r.floor || 'Ground',
    status: r.status || 'Available',
    branch: bName || 'Unassigned',
    SCHL_BR_REF_ID: branchId,
    amenities: typeof r.amenities === 'string' ? r.amenities.split(',') : (r.SCHL_BR_FACILITY || r.schl_br_facility ? [r.SCHL_BR_FACILITY || r.schl_br_facility] : ['Whiteboard'])
  }
}

export default function Rooms() {
  const [rooms, setRooms] = useState([])
  const [branches, setBranches] = useState([])
  const [roomCategories, setRoomCategories] = useState(ROOM_CATEGORIES)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [errors, setErrors] = useState({})
  const [editingRoom, setEditingRoom] = useState(null)

  const currentUser = JSON.parse(sessionStorage.getItem('e_school_user') || '{}')
  const userRole = (currentUser.user_role || currentUser.role_id || currentUser.role || '').toLowerCase()
  const isBranchAdmin = userRole.includes('branch') && !userRole.includes('super')

  const [formData, setFormData] = useState({
    SCHL_BR_REF_ID: currentUser.branch_id || currentUser.userId || '',
    SCHL_BR_RM_ID: '',
    SCHL_BR_ROOM_DESC: '',
    SCHL_BR_BUILDING: '',
    SCHL_BR_ROOM_CAT: 'Classroom',
    SCHL_BR_ROOM_CAPACITY: '',
    SCHL_BR_FLR: '',
    SCHL_BR_ISLAB: 'N'
  })

  async function fetchRooms(branchesList = branches) {
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/rooms?limit=1000`)
      let items = Array.isArray(data) ? data : data?.data || []
      
      const user = JSON.parse(sessionStorage.getItem('e_school_user') || '{}')
      const isSchoolAdmin = (user.user_role || user.role_id) === 'R_SCHOOLADMIN' || user.role === 'R_SCHOOLADMIN'
      const isBranchAdminRole = (user.user_role || user.role_id) === 'R_BRANCHADMIN' || user.role === 'R_BRANCHADMIN'
      
      if ((isSchoolAdmin || isBranchAdminRole) && branchesList && branchesList.length > 0) {
          const validIds = branchesList.map(b => String(b.SCHL_BR_ID || b.schl_br_id))
          items = items.filter(r => validIds.includes(String(r.SCHL_BR_REF_ID || r.schl_br_ref_id || r.branchId)))
      }
      
      setRooms(items.map(r => normaliseRoom(r, branchesList)))
    } catch (err) {
      console.error('Failed to fetch rooms:', err)
      toast.error('Failed to load rooms')
    } finally {
      setLoading(false)
    }
  }

  async function fetchCategories() {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/room-categories`)
      const list = Array.isArray(res.data) ? res.data : res.data?.data || []
      if (list.length > 0) {
        const names = list.map(c => c.category_name || c.CAT_NM || c.name).filter(Boolean)
        if (names.length > 0) setRoomCategories(names)
      }
    } catch (e) {
      // Fallback to static ROOM_CATEGORIES
    }
  }

  function generateRoomCode() {
    const existingNums = rooms
      .map(r => {
        const m = String(r.room_no || r.id).match(/RM-(\d+)/i)
        return m ? parseInt(m[1], 10) : null
      })
      .filter(n => n !== null)

    const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 101
    return `RM-${String(nextNum).padStart(3, '0')}`
  }

  function openModal(room = null) {
    setErrors({})
    const defaultBranchId = isBranchAdmin 
      ? (currentUser.branch_id || currentUser.userId || '')
      : (branches.length === 1 ? (branches[0].SCHL_BR_ID || branches[0].schl_br_id || '') : '')

    if (room) {
      setEditingRoom(room)
      setFormData({
        SCHL_BR_REF_ID: room.SCHL_BR_REF_ID || room.schl_br_ref_id || room.branchId || defaultBranchId,
        SCHL_BR_RM_ID: room.room_no || room.id || '',
        SCHL_BR_ROOM_DESC: room.name || '',
        SCHL_BR_BUILDING: room.building || '',
        SCHL_BR_ROOM_CAT: room.category || 'Classroom',
        SCHL_BR_ROOM_CAPACITY: room.capacity || '',
        SCHL_BR_FLR: room.floor || '',
        SCHL_BR_ISLAB: room.category === 'Laboratory' || room.type === 'Laboratory' ? 'Y' : 'N'
      })
    } else {
      setEditingRoom(null)
      setFormData({
        SCHL_BR_REF_ID: defaultBranchId,
        SCHL_BR_RM_ID: '',
        SCHL_BR_ROOM_DESC: '',
        SCHL_BR_BUILDING: '',
        SCHL_BR_ROOM_CAT: 'Classroom',
        SCHL_BR_ROOM_CAPACITY: '',
        SCHL_BR_FLR: '',
        SCHL_BR_ISLAB: 'N'
      })
    }
    setIsModalOpen(true)
  }

  // Only letters, numbers and single spaces; no leading space, no special characters.
  const sanitizeName = (v) => v.replace(/[^A-Za-z0-9 ]/g, '').replace(/^\s+/, '').replace(/\s{2,}/g, ' ')
  const NAME_PATTERN = /^[A-Za-z0-9]+( [A-Za-z0-9]+)*$/

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = {}
    if (!isBranchAdmin && !formData.SCHL_BR_REF_ID) errs.SCHL_BR_REF_ID = 'Please select a branch.'
    // Any characters (special characters, blank spaces) are accepted; only a completely empty value is rejected.
    if (!formData.SCHL_BR_ROOM_DESC || !formData.SCHL_BR_ROOM_DESC.trim()) {
      errs.SCHL_BR_ROOM_DESC = 'Room name is required (blank spaces are not allowed).'
    } else if (!NAME_PATTERN.test(formData.SCHL_BR_ROOM_DESC.trim())) {
      errs.SCHL_BR_ROOM_DESC = 'Room name can contain only letters, numbers and spaces.'
    } else if (formData.SCHL_BR_ROOM_DESC.length > 50) {
      errs.SCHL_BR_ROOM_DESC = 'Room name cannot exceed 50 characters.'
    }
    if (formData.SCHL_BR_BUILDING && !NAME_PATTERN.test(formData.SCHL_BR_BUILDING.trim())) {
      errs.SCHL_BR_BUILDING = 'Building name can contain only letters, numbers and spaces.'
    }
    if (!formData.SCHL_BR_ROOM_CAPACITY) {
      errs.SCHL_BR_ROOM_CAPACITY = 'Capacity is required.'
    } else if (Number(formData.SCHL_BR_ROOM_CAPACITY) < 1 || Number(formData.SCHL_BR_ROOM_CAPACITY) > 1000) {
      errs.SCHL_BR_ROOM_CAPACITY = 'Capacity must be between 1 and 1000.'
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    try {
      const dataToSubmit = { 
        ...formData,
        SCHL_BR_ROOM_DESC: formData.SCHL_BR_ROOM_DESC.trim(),
        SCHL_BR_BUILDING: (formData.SCHL_BR_BUILDING || '').trim(),
        SCHL_BR_ISLAB: formData.SCHL_BR_ROOM_CAT === 'Laboratory' ? 'Y' : formData.SCHL_BR_ISLAB
      }
      if (editingRoom) {
        await axios.put(`${import.meta.env.VITE_API_BASE_URL}/academic/rooms/${editingRoom.id}`, dataToSubmit);
      } else {
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/academic/rooms`, dataToSubmit);
      }
      setIsModalOpen(false);
      toast.success(editingRoom ? 'Room updated successfully' : 'Room created successfully');
      fetchRooms();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save room');
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this room?')) return
    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/academic/rooms/${id}`)
      toast.success('Room deleted successfully')
      fetchRooms()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete room')
    }
  }

  async function fetchBranches() {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/branches`)
      let list = Array.isArray(res.data) ? res.data : res.data?.data || []
      
      const user = JSON.parse(sessionStorage.getItem('e_school_user') || '{}')
      const isSchoolAdmin = (user.user_role || user.role_id) === 'R_SCHOOLADMIN' || user.role === 'R_SCHOOLADMIN'
      const isBranchAdminRole = (user.user_role || user.role_id) === 'R_BRANCHADMIN' || user.role === 'R_BRANCHADMIN'
      
      if (isSchoolAdmin) {
         const centerId = String((user.user_id || user.id))
         list = list.filter(b => String(b.SCHL_BR_CENTER_ID || b.schl_br_center_id) === centerId)
      } else if (isBranchAdminRole) {
         const branchId = String((user.user_id || user.id))
         list = list.filter(b => String(b.SCHL_BR_ID || b.schl_br_id) === branchId)
      }
      
      setBranches(list)
      return list
    } catch (err) {
      console.error('Failed to fetch branches:', err)
      return []
    }
  }

  useEffect(() => {
    fetchCategories()
    fetchBranches().then(branchesList => {
      fetchRooms(branchesList)
    })
  }, [])

  const debouncedSearch = useDebouncedValue(search, 300)
  const filtered = rooms.filter((r) =>
    `${r.name || ''} ${r.type || ''} ${r.category || ''} ${r.building || ''} ${r.branch || ''} ${r.floor || ''}`.toLowerCase().includes(debouncedSearch.toLowerCase())
  )

  const pagination = usePagination(filtered, 10)

  return (
    <motion.div className="animate-fade-in" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Rooms &amp; Facilities</h1>
          <p className="page-subtitle">
            {loading 
              ? 'Loading...' 
              : isBranchAdmin 
              ? `${rooms.length} branch rooms registered`
              : `${rooms.length} rooms registered across branches`}
          </p>
        </div>
        <button id="add-room-btn" className="btn-primary" onClick={() => openModal()}><FaPlus /> Add Room</button>
      </div>

      {/* Summary Tiles */}
      <div className="metrics-grid metrics-grid-3">
        <div className="glass-panel metric-card animate-fade-in-up">
          <div className="metric-icon-wrap metric-icon-green"><FaCheckCircle /></div>
          <div className="metric-label">Available</div>
          <div className="metric-value">{rooms.filter(r => r.status === 'Available').length}</div>
        </div>
        <div className="glass-panel metric-card animate-fade-in-up">
          <div className="metric-icon-wrap metric-icon-blue"><FaInfoCircle /></div>
          <div className="metric-label">In Use</div>
          <div className="metric-value">{rooms.filter(r => r.status === 'In Use').length}</div>
        </div>
        <div className="glass-panel metric-card animate-fade-in-up">
          <div className="metric-icon-wrap metric-icon-orange"><FaWrench /></div>
          <div className="metric-label">Under Maintenance</div>
          <div className="metric-value">{rooms.filter(r => r.status === 'Maintenance').length}</div>
        </div>
      </div>

      {/* Search + Table */}
      <div className="glass-panel page-card">
        <div className="filter-row" style={{ marginBottom: '16px' }}>
          <div className="header-search">
            <span className="header-search-icon"><FaSearch /></span>
            <input
              id="rooms-search"
              className="header-search-input"
              type="search"
              placeholder="Search rooms by name, building, category, or floor…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search rooms"
            />
          </div>
        </div>

        <div className="table-container">
          <table className="data-table" aria-label="Rooms table">
            <thead>
              <tr>
                <th scope="col">Room No.</th>
                <th scope="col">Room Name</th>
                <th scope="col">Building</th>
                <th scope="col">Category</th>
                <th scope="col">Capacity</th>
                <th scope="col">Floor</th>
                {!isBranchAdmin && <th scope="col">Branch</th>}
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isBranchAdmin ? 8 : 9} style={{ textAlign: 'center', padding: '32px', color: 'var(--clr-text-muted)' }}>
                    Loading rooms...
                  </td>
                </tr>
              ) : pagination.pageItems.length === 0 ? (
                <tr>
                  <td colSpan={isBranchAdmin ? 8 : 9} style={{ textAlign: 'center', padding: '32px', color: 'var(--clr-text-muted)' }}>
                    {search ? 'No rooms match your search.' : 'No rooms registered yet.'}
                  </td>
                </tr>
              ) : (
                pagination.pageItems.map((room) => (
                  <tr key={room.id}>
                    <td>
                      <span className="badge" style={{ background: 'rgba(0, 90, 158, 0.1)', color: 'var(--clr-primary)', fontWeight: 700, fontSize: '0.82rem' }}>
                        {room.room_no || room.id}
                      </span>
                    </td>
                    <td>
                      <div className="font-bold" style={{ fontSize: '0.875rem' }}>{room.name || room.room_name}</div>
                    </td>
                    <td>{room.building || 'Main Building'}</td>
                    <td>
                      <span style={{ fontSize: '0.9rem', marginRight: 6 }}>{TYPE_ICONS[room.category] ?? <FaBuilding />}</span>
                      {room.category || room.type}
                    </td>
                    <td>{room.capacity} seats</td>
                    <td>{room.floor ? (/^\d+$/.test(String(room.floor).trim()) ? `${room.floor}th Floor` : room.floor) : 'Ground Floor'}</td>
                    {!isBranchAdmin && <td>{room.branch}</td>}
                    <td>
                      <span className={`badge ${STATUS_BADGE[room.status] ?? 'badge-info'}`}>
                        {room.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-sm">
                        <button className="btn-icon" aria-label={`Edit ${room.name}`} title="Edit" onClick={() => openModal(room)}><FaEdit /></button>
                        <button className="btn-icon text-danger" aria-label={`Delete ${room.name}`} title="Delete" onClick={() => handleDelete(room.id)}><FaTrash /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footer */}
      {filtered.length > 0 && (
        <div className="table-toolbar-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', marginTop: '12px', background: 'var(--clr-panel)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--clr-text-muted)' }}>
            Showing {filtered.length === 0 ? 0 : pagination.startIndex}–{pagination.endIndex} of {pagination.totalItems}
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

      {/* Add Room Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <motion.div
            className="glass-panel modal-container"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div className="modal-header">
              <h2 className="modal-title">{editingRoom ? 'Edit Room' : 'Add New Room'}</h2>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {!isBranchAdmin && (
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Branch <span className="form-required">*</span></label>
                    <select
                      className={`form-control${errors.SCHL_BR_REF_ID ? ' form-input-error' : ''}`}
                      value={formData.SCHL_BR_REF_ID}
                      onChange={e => setFormData({ ...formData, SCHL_BR_REF_ID: e.target.value })}
                      required
                    >
                      <option value="">Select Branch</option>
                      {branches.map(b => (
                        <option key={b.SCHL_BR_ID || b.schl_br_id} value={b.SCHL_BR_ID || b.schl_br_id}>
                          {b.SCHL_BR_NM || b.schl_br_nm}
                        </option>
                      ))}
                    </select>
                    {errors.SCHL_BR_REF_ID && <span className="form-error-msg">{errors.SCHL_BR_REF_ID}</span>}
                  </div>
                )}
                
                {/* Room Name */}
                <div className="form-group">
                  <label className="form-label">Room Name <span className="form-required">*</span></label>
                  <input
                    type="text"
                    maxLength={50}
                    className={`form-control${errors.SCHL_BR_ROOM_DESC ? ' form-input-error' : ''}`}
                    placeholder="e.g. Room 101, Physics Lab, Auditorium"
                    value={formData.SCHL_BR_ROOM_DESC}
                    onChange={(e) => setFormData({ ...formData, SCHL_BR_ROOM_DESC: sanitizeName(e.target.value) })}
                    required
                  />
                  {errors.SCHL_BR_ROOM_DESC && <span className="form-error-msg">{errors.SCHL_BR_ROOM_DESC}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Building Name / Block</label>
                  <input
                    type="text"
                    maxLength={50}
                    className={`form-control${errors.SCHL_BR_BUILDING ? ' form-input-error' : ''}`}
                    placeholder="e.g. Main Block, Science Wing, North Tower"
                    value={formData.SCHL_BR_BUILDING}
                    onChange={(e) => setFormData({ ...formData, SCHL_BR_BUILDING: sanitizeName(e.target.value) })}
                  />
                  {errors.SCHL_BR_BUILDING && <span className="form-error-msg">{errors.SCHL_BR_BUILDING}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Room Category <span className="form-required">*</span></label>
                  <select
                    className="form-control"
                    value={formData.SCHL_BR_ROOM_CAT}
                    onChange={(e) => setFormData({ ...formData, SCHL_BR_ROOM_CAT: e.target.value })}
                    required
                  >
                    {roomCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Floor</label>
                  <select
                    className="form-control"
                    value={formData.SCHL_BR_FLR}
                    onChange={(e) => setFormData({ ...formData, SCHL_BR_FLR: e.target.value })}
                  >
                    <option value="">Select Floor</option>
                    {FLOOR_OPTIONS.map(flr => (
                      <option key={flr} value={flr}>{flr}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Max Seating Capacity <span className="form-required">*</span></label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    className={`form-control${errors.SCHL_BR_ROOM_CAPACITY ? ' form-input-error' : ''}`}
                    placeholder="e.g. 40"
                    value={formData.SCHL_BR_ROOM_CAPACITY}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                      setFormData({ ...formData, SCHL_BR_ROOM_CAPACITY: val });
                    }}
                    onKeyPress={(e) => { if (!/[0-9]/.test(e.key)) e.preventDefault(); }}
                    required
                  />
                  {errors.SCHL_BR_ROOM_CAPACITY && <span className="form-error-msg">{errors.SCHL_BR_ROOM_CAPACITY}</span>}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">{editingRoom ? 'Save Room' : 'Create Room'}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  )
}