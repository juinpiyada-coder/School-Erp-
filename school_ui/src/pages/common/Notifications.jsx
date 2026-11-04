import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FaBell, 
  FaBullhorn, 
  FaPlus, 
  FaSearch, 
  FaFilter, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaTrash, 
  FaEdit, 
  FaReply, 
  FaPaperclip, 
  FaImage, 
  FaCalendarAlt, 
  FaUserCheck, 
  FaChevronRight, 
  FaClock, 
  FaTimes,
  FaCheck,
  FaLock,
  FaExclamationTriangle,
  FaEnvelopeOpenText,
  FaTag
} from 'react-icons/fa'
import { toast } from 'react-toastify'
import axios from '../../lib/axios'

const CATEGORIES = [
  { value: 'ALL', label: 'All Categories' },
  { value: 'NOTICE', label: 'Notices & Circulars' },
  { value: 'ANNOUNCEMENT', label: 'Announcements' },
  { value: 'EXAM', label: 'Exams & Results' },
  { value: 'EVENT', label: 'Events & Functions' },
  { value: 'ACADEMIC', label: 'Academic Alerts' },
  { value: 'FEES', label: 'Fees & Finance' },
  { value: 'LEAVE', label: 'Leave Requests' },
  { value: 'QUERY', label: 'Helpdesk / Support' }
]

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedNotif, setSelectedNotif] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  
  // Filters & Pagination
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Modals & Forms
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [newDetailText, setNewDetailText] = useState('')
  const [detailImageBase64, setDetailImageBase64] = useState('')
  const [detailAssignTo, setDetailAssignTo] = useState('')
  const [submittingDetail, setSubmittingDetail] = useState(false)

  // New Notification Form State
  const [formData, setFormData] = useState({
    SMS_NO_CAT: 'NOTICE',
    SMS_NO_DESC: '',
    SMS_NO_ACTIVE: 'ACTIVE',
    detail_desc: '',
    assign_to: ''
  })

  // User details from session
  const storedUser = JSON.parse(sessionStorage.getItem('e_school_user') || '{}')
  const userRole = (storedUser.user_role || storedUser.role_id || storedUser.role || '').toUpperCase()
  const userId = storedUser.user_id || storedUser.id || storedUser.userId || ''

  const isSuperAdmin = userRole === 'R_SUPERADMIN'
  const isSchoolAdmin = userRole === 'R_SCHOOLADMIN' || userRole === 'R_SCHOOLEXECUTIVE'
  const isBranchAdmin = userRole === 'R_BRANCHADMIN' || userRole === 'R_BRANCHEXECUTIVE'
  const isTeacher = userRole === 'R_TEACHER'
  const isStudent = userRole === 'R_STUDENT'
  const isParent = userRole === 'R_PARENT'
  const canPublishBroadcast = isSuperAdmin || isSchoolAdmin || isBranchAdmin || isTeacher

  useEffect(() => {
    fetchNotifications()
  }, [categoryFilter, page])

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const params = {
        page,
        limit: 15
      }
      if (categoryFilter !== 'ALL') {
        params.category = categoryFilter
      }

      const res = await axios.get('/notifications', { params })
      const data = res.data?.data || []
      const pagination = res.data?.pagination || {}

      setNotifications(data)
      setTotalPages(pagination.totalPages || 1)
      setTotalCount(pagination.total || 0)

      // Auto select first item if none selected or refresh selected
      if (data.length > 0) {
        if (!selectedNotif) {
          fetchNotificationDetails(data[0].SMS_NO_ID)
        } else {
          const match = data.find(n => n.SMS_NO_ID === selectedNotif.SMS_NO_ID)
          if (match) {
            fetchNotificationDetails(match.SMS_NO_ID, false)
          }
        }
      } else {
        setSelectedNotif(null)
      }
    } catch (err) {
      console.error('Failed to load notifications:', err)
      toast.error(err?.response?.data?.message || 'Could not load notifications')
    } finally {
      setLoading(false)
    }
  }

  const fetchNotificationDetails = async (id, showSpinner = true) => {
    if (showSpinner) setDetailsLoading(true)
    try {
      const res = await axios.get(`/notifications/${id}`)
      setSelectedNotif(res.data?.data || null)
    } catch (err) {
      toast.error('Failed to fetch details')
    } finally {
      if (showSpinner) setDetailsLoading(false)
    }
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    if (!formData.SMS_NO_DESC.trim()) {
      toast.warning('Please enter a description or subject')
      return
    }

    try {
      const res = await axios.post('/notifications', formData)
      toast.success('Notification posted successfully!')
      setShowCreateModal(false)
      setFormData({
        SMS_NO_CAT: 'NOTICE',
        SMS_NO_DESC: '',
        SMS_NO_ACTIVE: 'ACTIVE',
        detail_desc: '',
        assign_to: ''
      })
      fetchNotifications()
      if (res.data?.data?.SMS_NO_ID) {
        fetchNotificationDetails(res.data.data.SMS_NO_ID)
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create notification')
    }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!editingItem) return

    try {
      await axios.put(`/notifications/${editingItem.SMS_NO_ID}`, {
        SMS_NO_CAT: editingItem.SMS_NO_CAT,
        SMS_NO_DESC: editingItem.SMS_NO_DESC,
        SMS_NO_ACTIVE: editingItem.SMS_NO_ACTIVE
      })
      toast.success('Notification updated')
      setShowEditModal(false)
      fetchNotifications()
      fetchNotificationDetails(editingItem.SMS_NO_ID, false)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update')
    }
  }

  const handleDeleteNotification = async (id) => {
    if (!window.confirm('Are you sure you want to delete this notification and all its conversation thread records?')) {
      return
    }

    try {
      await axios.delete(`/notifications/${id}`)
      toast.success('Notification removed')
      if (selectedNotif?.SMS_NO_ID === id) {
        setSelectedNotif(null)
      }
      fetchNotifications()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete notification')
    }
  }

  const handleAddDetail = async (e) => {
    e.preventDefault()
    if (!newDetailText.trim() && !detailImageBase64) {
      toast.warning('Please type a message or upload an attachment')
      return
    }
    if (!selectedNotif) return

    setSubmittingDetail(true)
    try {
      await axios.post(`/notifications/${selectedNotif.SMS_NO_ID}/details`, {
        SMS_NODTLS_DESC: newDetailText.trim(),
        image: detailImageBase64 || null,
        assign_to: detailAssignTo || null,
        closed: 'OPEN'
      })
      toast.success('Reply added')
      setNewDetailText('')
      setDetailImageBase64('')
      setDetailAssignTo('')
      fetchNotificationDetails(selectedNotif.SMS_NO_ID, false)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to send message')
    } finally {
      setSubmittingDetail(false)
    }
  }

  const handleToggleCloseDetail = async (detailId, currentStatus) => {
    const nextStatus = currentStatus === 'CLOSED' ? 'OPEN' : 'CLOSED'
    try {
      await axios.put(`/notifications/details/${detailId}`, {
        SMS_DTLS_CLOSED: nextStatus
      })
      toast.info(`Marked as ${nextStatus}`)
      fetchNotificationDetails(selectedNotif.SMS_NO_ID, false)
    } catch (err) {
      toast.error('Failed to change status')
    }
  }

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size cannot exceed 5MB')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setDetailImageBase64(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const filteredNotifications = notifications.filter(n => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      (n.SMS_NO_DESC || '').toLowerCase().includes(q) ||
      (n.SMS_NO_CAT || '').toLowerCase().includes(q) ||
      (n.created_by_first_name || '').toLowerCase().includes(q)
    )
  })

  const getCategoryBadgeClass = (cat) => {
    switch (cat?.toUpperCase()) {
      case 'NOTICE': return 'badge-cat-notice'
      case 'ANNOUNCEMENT': return 'badge-cat-announcement'
      case 'EXAM': return 'badge-cat-exam'
      case 'EVENT': return 'badge-cat-event'
      case 'ACADEMIC': return 'badge-cat-academic'
      case 'FEES': return 'badge-cat-fees'
      case 'LEAVE': return 'badge-cat-leave'
      case 'QUERY': return 'badge-cat-query'
      default: return 'badge-cat-default'
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="notifications-container">
      {/* ── Top Bar & Actions ── */}
      <div className="notif-header-panel glass-panel">
        <div className="notif-header-title-wrap">
          <div className="notif-icon-circle">
            <FaBullhorn />
          </div>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>Campus Broadcasts & Communications</h1>
            <p className="page-subtitle" style={{ margin: '4px 0 0' }}>
              Multi-tiered announcements, departmental notices, student inquiries, and grievance tracking.
            </p>
          </div>
        </div>

        <div className="notif-header-controls">
          <button 
            type="button" 
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <FaPlus /> {canPublishBroadcast ? 'Post Announcement / Notice' : 'Submit Inquire / Request'}
          </button>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="notif-filter-bar glass-panel">
        <div className="notif-search-box">
          <FaSearch className="notif-search-icon" />
          <input 
            type="text" 
            className="form-control"
            placeholder="Search notifications, subjects, or sender..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="notif-category-chips">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              type="button"
              className={`chip-btn ${categoryFilter === cat.value ? 'chip-btn-active' : ''}`}
              onClick={() => { setCategoryFilter(cat.value); setPage(1); }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Two-Column Split View ── */}
      <div className="notif-split-layout">
        {/* Left Side: Notification Feed */}
        <div className="notif-feed-panel glass-panel">
          <div className="notif-feed-header">
            <span className="notif-feed-count">
              <strong>{totalCount}</strong> Total Broadcasts
            </span>
            <span className="notif-role-indicator">
              Viewing as: <strong>{userRole.replace('R_', '')}</strong>
            </span>
          </div>

          <div className="notif-feed-list">
            {loading ? (
              <div className="notif-loading-state">
                <div className="spinner" />
                <p>Loading communications...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="notif-empty-state">
                <FaEnvelopeOpenText size={40} className="text-muted" />
                <p>No notifications found in this category.</p>
              </div>
            ) : (
              filteredNotifications.map(item => {
                const isSelected = selectedNotif?.SMS_NO_ID === item.SMS_NO_ID
                return (
                  <div
                    key={item.SMS_NO_ID}
                    className={`notif-card-item ${isSelected ? 'notif-card-selected' : ''}`}
                    onClick={() => fetchNotificationDetails(item.SMS_NO_ID)}
                  >
                    <div className="notif-card-top">
                      <span className={`cat-badge ${getCategoryBadgeClass(item.SMS_NO_CAT)}`}>
                        <FaTag size={10} /> {item.SMS_NO_CAT}
                      </span>
                      <span className="notif-date-stamp">
                        <FaClock size={11} /> {item.SMS_NO_CREATEDT ? new Date(item.SMS_NO_CREATEDT).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                      </span>
                    </div>

                    <div className="notif-card-desc">
                      {item.SMS_NO_DESC}
                    </div>

                    <div className="notif-card-meta">
                      <span className="notif-author">
                        By {item.created_by_first_name || item.SMS_NO_USERID || 'Admin'}
                      </span>
                      {Number(item.details_count) > 0 && (
                        <span className="notif-thread-count">
                          <FaReply size={11} /> {item.details_count} replies
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="notif-pagination">
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <span className="pagination-info">Page {page} of {totalPages}</span>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Conversation Thread & Action Hub */}
        <div className="notif-detail-panel glass-panel">
          {detailsLoading ? (
            <div className="notif-detail-loading">
              <div className="spinner" />
              <p>Fetching thread history...</p>
            </div>
          ) : !selectedNotif ? (
            <div className="notif-detail-placeholder">
              <FaBell size={48} className="text-muted" style={{ opacity: 0.3 }} />
              <h3>Select a Notification</h3>
              <p>Choose an item from the left pane to view details, updates, and reply.</p>
            </div>
          ) : (
            <div className="notif-thread-wrapper">
              {/* Header */}
              <div className="thread-header">
                <div className="thread-title-area">
                  <div className="thread-tags-row">
                    <span className={`cat-badge ${getCategoryBadgeClass(selectedNotif.SMS_NO_CAT)}`}>
                      {selectedNotif.SMS_NO_CAT}
                    </span>
                    <span className="thread-id-pill">
                      ID: {selectedNotif.SMS_NO_ID}
                    </span>
                    <span className={`status-pill ${selectedNotif.SMS_NO_ACTIVE === 'ACTIVE' || selectedNotif.SMS_NO_ACTIVE === '1' ? 'status-active' : 'status-inactive'}`}>
                      {selectedNotif.SMS_NO_ACTIVE || 'ACTIVE'}
                    </span>
                  </div>
                  <h2 className="thread-subject-title">{selectedNotif.SMS_NO_DESC}</h2>
                  <div className="thread-author-meta">
                    Published by <strong>{selectedNotif.created_by_first_name ? `${selectedNotif.created_by_first_name} ${selectedNotif.created_by_last_name || ''}` : selectedNotif.SMS_NO_USERID}</strong> 
                    {' '}&bull; {new Date(selectedNotif.SMS_NO_CREATEDT).toLocaleString()}
                  </div>
                </div>

                {/* Edit / Delete Actions */}
                {(canPublishBroadcast || selectedNotif.SMS_NO_USERID === userId) && (
                  <div className="thread-actions">
                    <button 
                      type="button" 
                      className="btn-icon" 
                      title="Edit Notice"
                      onClick={() => { setEditingItem(selectedNotif); setShowEditModal(true); }}
                    >
                      <FaEdit />
                    </button>
                    {(isSuperAdmin || selectedNotif.SMS_NO_USERID === userId) && (
                      <button 
                        type="button" 
                        className="btn-icon btn-icon-danger" 
                        title="Delete Notice"
                        onClick={() => handleDeleteNotification(selectedNotif.SMS_NO_ID)}
                      >
                        <FaTrash />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Thread Entries (SMS_NO_DTLS) */}
              <div className="thread-conversation-body">
                <div className="thread-section-label">Discussion & Action Trail</div>
                
                {(!selectedNotif.details || selectedNotif.details.length === 0) ? (
                  <div className="thread-empty-box">
                    <p>No response updates or follow-ups logged yet.</p>
                  </div>
                ) : (
                  selectedNotif.details.map((dtl) => {
                    const isClosed = dtl.SMS_DTLS_CLOSED === 'CLOSED' || dtl.SMS_DTLS_CLOSED === '1'
                    return (
                      <div key={dtl.SMS_NODTLS_ID} className={`thread-entry-card ${isClosed ? 'entry-closed' : ''}`}>
                        <div className="entry-card-header">
                          <div className="entry-author-info">
                            <div className="avatar-chip">
                              {(dtl.updated_by_first_name || 'U').charAt(0)}
                            </div>
                            <div>
                              <strong>{dtl.updated_by_first_name ? `${dtl.updated_by_first_name} ${dtl.updated_by_last_name || ''}` : dtl.SMS_DTLS_UPDTDBY || 'System'}</strong>
                              <span className="entry-timestamp">
                                {dtl.SMS_DTLS_UPDT ? new Date(dtl.SMS_DTLS_UPDT).toLocaleString() : ''}
                              </span>
                            </div>
                          </div>

                          <div className="entry-header-status">
                            {dtl.SMS_DTLS_ASSIGN_TO && (
                              <span className="assignee-pill" title="Assigned Official">
                                <FaUserCheck size={11} /> {dtl.assign_first_name || dtl.SMS_DTLS_ASSIGN_TO}
                              </span>
                            )}
                            <span className={`badge-state ${isClosed ? 'state-closed' : 'state-open'}`}>
                              {isClosed ? 'Resolved / Closed' : 'Open'}
                            </span>
                            {canPublishBroadcast && (
                              <button 
                                type="button" 
                                className="status-toggle-btn"
                                onClick={() => handleToggleCloseDetail(dtl.SMS_NODTLS_ID, dtl.SMS_DTLS_CLOSED)}
                                title={isClosed ? 'Reopen status' : 'Mark as closed'}
                              >
                                {isClosed ? <FaReply size={11} /> : <FaCheck size={11} />}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="entry-content-text">
                          {dtl.SMS_NODTLS_DESC}
                        </div>

                        {/* Image attachment rendering */}
                        {Number(dtl.has_image) === 1 && (
                          <div className="entry-image-attachment">
                            <span className="attachment-label"><FaImage /> Attachment:</span>
                            <div className="attachment-img-preview">
                              <img 
                                src={`${import.meta.env.VITE_API_BASE_URL || '/api'}/notifications/details/${dtl.SMS_NODTLS_ID}/image`} 
                                alt="Attachment" 
                                loading="lazy"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {/* Reply / Append Action Hub */}
              <div className="thread-reply-box">
                <form onSubmit={handleAddDetail}>
                  <div className="reply-textarea-wrap">
                    <textarea 
                      className="form-control reply-textarea"
                      rows={3}
                      placeholder="Write an official update, response, or follow-up note..."
                      value={newDetailText}
                      onChange={(e) => setNewDetailText(e.target.value)}
                    />
                  </div>

                  <div className="reply-toolbar">
                    <div className="reply-attach-actions">
                      <label className="btn btn-secondary btn-sm file-attach-btn">
                        <FaPaperclip /> {detailImageBase64 ? 'Attachment Ready' : 'Add Image / Scan'}
                        <input 
                          type="file" 
                          accept="image/*" 
                          style={{ display: 'none' }}
                          onChange={handleImageFileChange}
                        />
                      </label>

                      {detailImageBase64 && (
                        <span className="attachment-chip">
                          Image selected <button type="button" onClick={() => setDetailImageBase64('')}><FaTimes size={10} /></button>
                        </span>
                      )}

                      {canPublishBroadcast && (
                        <input 
                          type="text"
                          className="form-control form-control-sm assignee-input"
                          placeholder="Assign to User ID (optional)"
                          value={detailAssignTo}
                          onChange={(e) => setDetailAssignTo(e.target.value)}
                        />
                      )}
                    </div>

                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={submittingDetail}
                    >
                      <FaReply /> {submittingDetail ? 'Sending...' : 'Post Reply'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Create Notification Modal ── */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="modal-backdrop">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }} 
              className="modal-content glass-panel notif-modal"
            >
              <div className="modal-header">
                <h3>{canPublishBroadcast ? 'Create Campus Notice / Announcement' : 'Submit Inquire / Request'}</h3>
                <button type="button" className="close-btn" onClick={() => setShowCreateModal(false)}>
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit}>
                <div className="modal-body">
                  <div className="form-group mb-md">
                    <label className="form-label">Communication Category *</label>
                    <select 
                      className="form-control"
                      value={formData.SMS_NO_CAT}
                      onChange={(e) => setFormData({ ...formData, SMS_NO_CAT: e.target.value })}
                      required
                    >
                      <option value="NOTICE">Notices & Circulars</option>
                      <option value="ANNOUNCEMENT">Announcements</option>
                      <option value="EXAM">Exams & Online Schedules</option>
                      <option value="EVENT">Events & Campus Activities</option>
                      <option value="ACADEMIC">Academic Alerts</option>
                      <option value="FEES">Fees & Receipts Alert</option>
                      <option value="LEAVE">Leave Applications</option>
                      <option value="QUERY">Helpdesk / Student Inquiries</option>
                    </select>
                  </div>

                  <div className="form-group mb-md">
                    <label className="form-label">Subject / Header *</label>
                    <textarea 
                      className="form-control"
                      rows={2}
                      placeholder="e.g. Schedule for Mid-Term Examinations / Sports Day Registrations..."
                      value={formData.SMS_NO_DESC}
                      onChange={(e) => setFormData({ ...formData, SMS_NO_DESC: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group mb-md">
                    <label className="form-label">Detailed Notes / Instructions (Optional)</label>
                    <textarea 
                      className="form-control"
                      rows={3}
                      placeholder="Enter detailed description or initial guidelines..."
                      value={formData.detail_desc}
                      onChange={(e) => setFormData({ ...formData, detail_desc: e.target.value })}
                    />
                  </div>

                  {canPublishBroadcast && (
                    <div className="form-group mb-md">
                      <label className="form-label">Target Audience / Assigned User</label>
                      <input 
                        type="text" 
                        className="form-control"
                        placeholder="Leave blank for All, or specify User ID"
                        value={formData.assign_to}
                        onChange={(e) => setFormData({ ...formData, assign_to: e.target.value })}
                      />
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Publish Now
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Edit Notification Modal ── */}
      <AnimatePresence>
        {showEditModal && editingItem && (
          <div className="modal-backdrop">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }} 
              className="modal-content glass-panel notif-modal"
            >
              <div className="modal-header">
                <h3>Edit Broadcast Details</h3>
                <button type="button" className="close-btn" onClick={() => setShowEditModal(false)}>
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleEditSubmit}>
                <div className="modal-body">
                  <div className="form-group mb-md">
                    <label className="form-label">Category</label>
                    <select 
                      className="form-control"
                      value={editingItem.SMS_NO_CAT}
                      onChange={(e) => setEditingItem({ ...editingItem, SMS_NO_CAT: e.target.value })}
                    >
                      <option value="NOTICE">Notices & Circulars</option>
                      <option value="ANNOUNCEMENT">Announcements</option>
                      <option value="EXAM">Exams & Online Schedules</option>
                      <option value="EVENT">Events & Campus Activities</option>
                      <option value="ACADEMIC">Academic Alerts</option>
                      <option value="FEES">Fees & Receipts Alert</option>
                      <option value="LEAVE">Leave Applications</option>
                      <option value="QUERY">Helpdesk / Student Inquiries</option>
                    </select>
                  </div>

                  <div className="form-group mb-md">
                    <label className="form-label">Description / Subject</label>
                    <textarea 
                      className="form-control"
                      rows={3}
                      value={editingItem.SMS_NO_DESC}
                      onChange={(e) => setEditingItem({ ...editingItem, SMS_NO_DESC: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group mb-md">
                    <label className="form-label">Status</label>
                    <select 
                      className="form-control"
                      value={editingItem.SMS_NO_ACTIVE || 'ACTIVE'}
                      onChange={(e) => setEditingItem({ ...editingItem, SMS_NO_ACTIVE: e.target.value })}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE / ARCHIVED</option>
                    </select>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .notifications-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
          height: calc(100vh - 120px);
          max-height: calc(100vh - 120px);
        }
        .notif-header-panel {
          padding: 18px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-radius: 12px;
          background: var(--bg-card, #ffffff);
          border: 1px solid var(--border-color, rgba(0,0,0,0.08));
        }
        .notif-header-title-wrap {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .notif-icon-circle {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: linear-gradient(135deg, #0078D4, #005A9E);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          box-shadow: 0 4px 12px rgba(0, 120, 212, 0.25);
        }
        .notif-filter-bar {
          padding: 12px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          border-radius: 12px;
        }
        .notif-search-box {
          position: relative;
          min-width: 260px;
          flex: 1;
        }
        .notif-search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #8a8d91;
        }
        .notif-search-box input {
          padding-left: 36px;
          height: 38px;
        }
        .notif-category-chips {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-x: auto;
          padding: 4px 0;
        }
        .chip-btn {
          border: 1px solid var(--border-color, #e0e0e0);
          background: var(--bg-card, #ffffff);
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 0.82rem;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
          color: var(--text-secondary, #555555);
        }
        .chip-btn:hover {
          background: rgba(0, 120, 212, 0.08);
          border-color: #0078D4;
          color: #0078D4;
        }
        .chip-btn-active {
          background: #0078D4 !important;
          color: #ffffff !important;
          border-color: #0078D4 !important;
          box-shadow: 0 2px 6px rgba(0, 120, 212, 0.3);
        }
        .notif-split-layout {
          display: grid;
          grid-template-columns: 380px 1fr;
          gap: 16px;
          flex: 1;
          min-height: 0;
        }
        @media (max-width: 1024px) {
          .notif-split-layout {
            grid-template-columns: 1fr;
          }
        }
        .notif-feed-panel {
          display: flex;
          flex-direction: column;
          border-radius: 12px;
          overflow: hidden;
          min-height: 0;
        }
        .notif-feed-header {
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-color, rgba(0,0,0,0.06));
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.82rem;
        }
        .notif-feed-list {
          flex: 1;
          overflow-y: auto;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .notif-card-item {
          padding: 14px;
          border-radius: 10px;
          border: 1px solid var(--border-color, #eaeaea);
          background: var(--bg-card, #ffffff);
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .notif-card-item:hover {
          border-color: #0078D4;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.04);
        }
        .notif-card-selected {
          border-color: #0078D4 !important;
          background: rgba(0, 120, 212, 0.04) !important;
          box-shadow: 0 4px 12px rgba(0, 120, 212, 0.12) !important;
        }
        .notif-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .cat-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
        }
        .badge-cat-notice { background: rgba(0, 120, 212, 0.12); color: #0078D4; }
        .badge-cat-announcement { background: rgba(16, 124, 65, 0.12); color: #107C41; }
        .badge-cat-exam { background: rgba(168, 0, 0, 0.12); color: #A80000; }
        .badge-cat-event { background: rgba(135, 100, 184, 0.12); color: #744da9; }
        .badge-cat-academic { background: rgba(0, 153, 188, 0.12); color: #0099BC; }
        .badge-cat-fees { background: rgba(232, 113, 10, 0.12); color: #d86400; }
        .badge-cat-leave { background: rgba(92, 45, 145, 0.12); color: #5c2d91; }
        .badge-cat-query { background: rgba(100, 110, 120, 0.12); color: #495057; }
        .badge-cat-default { background: rgba(0,0,0,0.06); color: #555555; }

        .notif-date-stamp {
          font-size: 0.74rem;
          color: #8a8d91;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .notif-card-desc {
          font-size: 0.92rem;
          font-weight: 600;
          color: var(--text-primary, #1e293b);
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .notif-card-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.78rem;
          color: #71717a;
          margin-top: 2px;
        }
        .notif-pagination {
          padding: 10px 14px;
          border-top: 1px solid var(--border-color, rgba(0,0,0,0.06));
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .notif-detail-panel {
          display: flex;
          flex-direction: column;
          border-radius: 12px;
          min-height: 0;
          overflow: hidden;
          background: var(--bg-card, #ffffff);
        }
        .notif-detail-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 12px;
          color: #8a8d91;
          text-align: center;
          padding: 24px;
        }
        .notif-thread-wrapper {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
        }
        .thread-header {
          padding: 18px 24px;
          border-bottom: 1px solid var(--border-color, rgba(0,0,0,0.08));
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }
        .thread-tags-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        .thread-id-pill {
          font-size: 0.72rem;
          padding: 2px 8px;
          border-radius: 4px;
          background: #f1f5f9;
          color: #64748b;
          font-family: monospace;
        }
        .status-pill {
          font-size: 0.72rem;
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 700;
        }
        .status-active { background: #dcfce7; color: #166534; }
        .status-inactive { background: #fee2e2; color: #991b1b; }
        .thread-subject-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary, #0f172a);
          margin: 4px 0 6px;
          line-height: 1.35;
        }
        .thread-author-meta {
          font-size: 0.82rem;
          color: #64748b;
        }
        .thread-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .btn-icon {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          border: 1px solid var(--border-color, #e2e8f0);
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #475569;
          transition: all 0.2s;
        }
        .btn-icon:hover {
          background: #f1f5f9;
          color: #0f172a;
        }
        .btn-icon-danger:hover {
          background: #fee2e2;
          color: #dc2626;
          border-color: #fca5a5;
        }
        .thread-conversation-body {
          flex: 1;
          overflow-y: auto;
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .thread-section-label {
          font-size: 0.78rem;
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.5px;
          color: #94a3b8;
          margin-bottom: 2px;
        }
        .thread-empty-box {
          padding: 24px;
          text-align: center;
          color: #94a3b8;
          border: 1px dashed #cbd5e1;
          border-radius: 8px;
        }
        .thread-entry-card {
          padding: 16px;
          border-radius: 10px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .entry-closed {
          background: #f1f5f9;
          opacity: 0.85;
          border-left: 4px solid #10b981;
        }
        .entry-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .entry-author-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .avatar-chip {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #0078D4;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.82rem;
        }
        .entry-timestamp {
          font-size: 0.72rem;
          color: #94a3b8;
          display: block;
        }
        .entry-header-status {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .assignee-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.72rem;
          padding: 2px 8px;
          background: #e0f2fe;
          color: #0369a1;
          border-radius: 4px;
        }
        .badge-state {
          font-size: 0.72rem;
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 600;
        }
        .state-open { background: #fef3c7; color: #b45309; }
        .state-closed { background: #d1fae5; color: #047857; }
        .status-toggle-btn {
          border: 1px solid #cbd5e1;
          background: #ffffff;
          border-radius: 4px;
          padding: 3px 6px;
          cursor: pointer;
          color: #475569;
        }
        .entry-content-text {
          font-size: 0.92rem;
          line-height: 1.5;
          color: #1e293b;
          white-space: pre-wrap;
        }
        .entry-image-attachment {
          margin-top: 6px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .attachment-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .attachment-img-preview img {
          max-height: 240px;
          max-width: 100%;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          object-fit: contain;
          background: #000000;
        }
        .thread-reply-box {
          padding: 16px 24px;
          border-top: 1px solid var(--border-color, rgba(0,0,0,0.08));
          background: #ffffff;
        }
        .reply-textarea-wrap {
          margin-bottom: 10px;
        }
        .reply-textarea {
          resize: vertical;
          font-size: 0.88rem;
          border-radius: 8px;
        }
        .reply-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .reply-attach-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .attachment-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
          background: #e2e8f0;
          padding: 3px 8px;
          border-radius: 4px;
        }
        .attachment-chip button {
          border: none;
          background: transparent;
          cursor: pointer;
          color: #ef4444;
        }
        .assignee-input {
          max-width: 180px;
          height: 32px;
          font-size: 0.8rem;
        }
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }
        .notif-modal {
          width: 100%;
          max-width: 580px;
          border-radius: 12px;
          background: #ffffff;
          overflow: hidden;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2);
        }
      `}</style>
    </motion.div>
  )
}
