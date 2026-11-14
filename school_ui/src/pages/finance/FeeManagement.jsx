import { useState, useEffect, useMemo, useCallback } from 'react'
import axios from '../../lib/axios'
import {
  FaMoneyBillWave, FaPlus, FaFilter, FaFileInvoiceDollar, FaReceipt,
  FaExclamationTriangle, FaCheckCircle, FaSearch, FaSync, FaCalendarAlt,
  FaBuilding, FaLayerGroup, FaCoins, FaHandHoldingUsd, FaHistory, FaTimes
} from 'react-icons/fa'
import { toast } from 'react-toastify'

export default function FeeManagement() {
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(false)
  const [branches, setBranches] = useState([])
  const [classes, setClasses] = useState([])

  // User auth details
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || {}
    } catch {
      return {}
    }
  }, [])

  const isSchoolAdmin = ['R_SUPERADMIN', 'R_SCHOOLADMIN', 'R_SCHOOLEXECUTIVE'].includes(user.role_code)
  const [selectedBranch, setSelectedBranch] = useState(user.branch_id || '')

  // Tab Data States
  const [overview, setOverview] = useState(null)
  const [classFees, setClassFees] = useState([])
  const [studentFees, setStudentFees] = useState([])
  const [payments, setPayments] = useState([])
  const [fines, setFines] = useState([])

  // Modals
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false)
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isFineModalOpen, setIsFineModalOpen] = useState(false)

  // Forms
  const [feeForm, setFeeForm] = useState({
    brch_id: user.branch_id || '',
    class_id: '',
    academic_year: '2026-2027',
    total_annual_fee: 0,
    components: [
      { fee_type: 'TUITION', amount: 0, frequency: 'MONTHLY' },
      { fee_type: 'EXAM', amount: 0, frequency: 'ANNUAL' }
    ]
  })

  const [batchForm, setBatchForm] = useState({
    brch_id: user.branch_id || '',
    class_id: '',
    fee_id: '',
    fee_month: new Date().getMonth() + 1,
    fee_year: new Date().getFullYear(),
    due_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  })

  const [paymentForm, setPaymentForm] = useState({
    brch_id: user.branch_id || '',
    stu_fee_id: '',
    student_id: '',
    paid_amount: '',
    payment_mode: 'CASH',
    transaction_ref: '',
    remarks: ''
  })

  const [fineForm, setFineForm] = useState({
    brch_id: user.branch_id || '',
    student_id: '',
    fine_reason: 'Late Fee Payment',
    fine_amount: 100,
    fine_date: new Date().toISOString().split('T')[0]
  })

  // Load auxiliary lists (branches & classes)
  useEffect(() => {
    const fetchAuxData = async () => {
      try {
        if (isSchoolAdmin) {
          const resBrch = await axios.get('/api/academic/branches')
          if (resBrch.data?.status === 'success') {
            setBranches(resBrch.data.data || [])
          }
        }
        const resCls = await axios.get('/api/academic/classes')
        if (resCls.data?.status === 'success') {
          setClasses(resCls.data.data || [])
        }
      } catch (err) {
        console.error('Failed to load aux data', err)
      }
    }
    fetchAuxData()
  }, [isSchoolAdmin])

  // Fetch data per tab
  const fetchData = useCallback(async () => {
    setLoading(true)
    const brchParam = selectedBranch ? `?branch_id=${selectedBranch}` : ''
    try {
      if (activeTab === 'overview') {
        const res = await axios.get(`/api/finance/overview${brchParam}`)
        if (res.data?.status === 'success') setOverview(res.data.data)
      } else if (activeTab === 'structures') {
        const res = await axios.get(`/api/finance/class-fees${brchParam}`)
        if (res.data?.status === 'success') setClassFees(res.data.data)
      } else if (activeTab === 'invoices') {
        const res = await axios.get(`/api/finance/student-fee-maps${brchParam}`)
        if (res.data?.status === 'success') setStudentFees(res.data.data)
      } else if (activeTab === 'payments') {
        const res = await axios.get(`/api/finance/payments${brchParam}`)
        if (res.data?.status === 'success') setPayments(res.data.data)
      } else if (activeTab === 'fines') {
        const res = await axios.get(`/api/finance/fines${brchParam}`)
        if (res.data?.status === 'success') setFines(res.data.data)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error loading finance data')
    } finally {
      setLoading(false)
    }
  }, [activeTab, selectedBranch])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Handlers for Add Class Fee Structure
  const handleAddComponent = () => {
    setFeeForm(prev => ({
      ...prev,
      components: [...prev.components, { fee_type: 'MISC', amount: 0, frequency: 'MONTHLY' }]
    }))
  }

  const handleRemoveComponent = (idx) => {
    setFeeForm(prev => {
      const updated = [...prev.components]
      updated.splice(idx, 1)
      const total = updated.reduce((sum, c) => sum + Number(c.amount || 0), 0)
      return { ...prev, components: updated, total_annual_fee: total }
    })
  }

  const handleComponentChange = (idx, field, value) => {
    setFeeForm(prev => {
      const updated = [...prev.components]
      updated[idx] = { ...updated[idx], [field]: value }
      const total = updated.reduce((sum, c) => sum + Number(c.amount || 0), 0)
      return { ...prev, components: updated, total_annual_fee: total }
    })
  }

  const handleSaveClassFee = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...feeForm,
        brch_id: selectedBranch || user.branch_id || feeForm.brch_id
      }
      const res = await axios.post('/api/finance/class-fees', payload)
      if (res.data?.status === 'success') {
        toast.success('Fee structure created!')
        setIsFeeModalOpen(false)
        fetchData()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save fee structure')
    }
  }

  // Handle Batch Allocation
  const handleBatchAssignSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...batchForm,
        brch_id: selectedBranch || user.branch_id || batchForm.brch_id
      }
      const res = await axios.post('/api/finance/batch-assign', payload)
      if (res.data?.status === 'success') {
        toast.success(`Allocated fees to ${res.data.data.assigned_count} students!`)
        setIsBatchModalOpen(false)
        fetchData()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Batch allocation failed')
    }
  }

  // Handle Recording Payment
  const handleRecordPaymentSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...paymentForm,
        brch_id: selectedBranch || user.branch_id || paymentForm.brch_id
      }
      const res = await axios.post('/api/finance/payments', payload)
      if (res.data?.status === 'success') {
        toast.success(`Payment receipt #${res.data.data.receipt_no} generated!`)
        setIsPaymentModalOpen(false)
        fetchData()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment recording failed')
    }
  }

  // Handle Imposing Fine
  const handleFineSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...fineForm,
        brch_id: selectedBranch || user.branch_id || fineForm.brch_id
      }
      const res = await axios.post('/api/finance/fines', payload)
      if (res.data?.status === 'success') {
        toast.success('Fine imposed successfully!')
        setIsFineModalOpen(false)
        fetchData()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to impose fine')
    }
  }

  const handleMarkFinePaid = async (fineId) => {
    try {
      const res = await axios.patch(`/api/finance/fines/${fineId}`, { status: 'PAID' })
      if (res.data?.status === 'success') {
        toast.success('Fine marked as paid')
        fetchData()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update fine')
    }
  }

  return (
    <div className="container-fluid py-4" style={{ minHeight: '85vh' }}>
      {/* Header & Multi-Branch Scoping */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold mb-1 d-flex align-items-center gap-2">
            <FaMoneyBillWave className="text-primary" /> Fee & Finance Management
          </h3>
          <p className="text-muted mb-0 small">
            Multi-tier fee structure, student invoicing, receipt generation, and fine control
          </p>
        </div>

        {isSchoolAdmin && (
          <div className="d-flex align-items-center gap-2 bg-light p-2 rounded shadow-sm">
            <FaBuilding className="text-secondary" />
            <span className="small fw-semibold text-secondary">Branch Filter:</span>
            <select
              className="form-select form-select-sm"
              style={{ minWidth: '180px' }}
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
            >
              <option value="">All Branches</option>
              {branches.map(b => (
                <option key={b.brch_id || b.BRCH_ID} value={b.brch_id || b.BRCH_ID}>
                  {b.brch_name || b.BRCH_NAME}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <ul className="nav nav-pills mb-4 gap-2 bg-light p-2 rounded border">
        <li className="nav-item">
          <button
            className={`nav-link btn-sm ${activeTab === 'overview' ? 'active shadow-sm fw-bold' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <FaCoins className="me-2" /> Financial Overview
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link btn-sm ${activeTab === 'structures' ? 'active shadow-sm fw-bold' : ''}`}
            onClick={() => setActiveTab('structures')}
          >
            <FaLayerGroup className="me-2" /> Class Fee Structures
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link btn-sm ${activeTab === 'invoices' ? 'active shadow-sm fw-bold' : ''}`}
            onClick={() => setActiveTab('invoices')}
          >
            <FaFileInvoiceDollar className="me-2" /> Student Invoices & Allocation
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link btn-sm ${activeTab === 'payments' ? 'active shadow-sm fw-bold' : ''}`}
            onClick={() => setActiveTab('payments')}
          >
            <FaReceipt className="me-2" /> Payments & Receipts
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link btn-sm ${activeTab === 'fines' ? 'active shadow-sm fw-bold' : ''}`}
            onClick={() => setActiveTab('fines')}
          >
            <FaExclamationTriangle className="me-2" /> Penalties & Dues
          </button>
        </li>
      </ul>

      {/* Loading Indicator */}
      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-2 text-muted small">Loading finance records...</p>
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {!loading && activeTab === 'overview' && overview && (
        <div className="row g-3">
          <div className="col-md-3">
            <div className="card shadow-sm border-0 border-start border-4 border-primary h-100">
              <div className="card-body">
                <span className="text-muted small fw-semibold">Total Revenue Expected</span>
                <h4 className="fw-bold mt-2 text-primary">₹{Number(overview.total_expected || 0).toLocaleString()}</h4>
                <div className="text-muted small mt-1">{overview.total_invoices || 0} active invoice allocations</div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card shadow-sm border-0 border-start border-4 border-success h-100">
              <div className="card-body">
                <span className="text-muted small fw-semibold">Total Fee Collected</span>
                <h4 className="fw-bold mt-2 text-success">₹{Number(overview.total_collected || 0).toLocaleString()}</h4>
                <div className="text-muted small mt-1">{overview.total_receipts || 0} verified receipts generated</div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card shadow-sm border-0 border-start border-4 border-danger h-100">
              <div className="card-body">
                <span className="text-muted small fw-semibold">Total Outstanding Due</span>
                <h4 className="fw-bold mt-2 text-danger">₹{Number(overview.total_pending || 0).toLocaleString()}</h4>
                <div className="text-muted small mt-1">{overview.pending_invoices || 0} pending/overdue invoices</div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card shadow-sm border-0 border-start border-4 border-warning h-100">
              <div className="card-body">
                <span className="text-muted small fw-semibold">Collection Rate</span>
                <h4 className="fw-bold mt-2 text-warning">{overview.collection_percentage || 0}%</h4>
                <div className="progress mt-2" style={{ height: '6px' }}>
                  <div
                    className="progress-bar bg-warning"
                    role="progressbar"
                    style={{ width: `${overview.collection_percentage || 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-12 mt-4">
            <div className="card shadow-sm border-0">
              <div className="card-header bg-white py-3">
                <h6 className="fw-bold mb-0">Finance Health & Summary</h6>
              </div>
              <div className="card-body">
                <p className="text-secondary small">
                  The dashboard displays cumulative fee structures and real-time ledger records across classes.
                  Use the tabs above to manage fee structures, allocate fees in batch to classes, record manual counter
                  receipts, and audit late penalties.
                </p>
                <div className="d-flex gap-3">
                  <button className="btn btn-primary btn-sm" onClick={() => setIsFeeModalOpen(true)}>
                    <FaPlus className="me-1" /> New Fee Structure
                  </button>
                  <button className="btn btn-outline-secondary btn-sm" onClick={() => setIsBatchModalOpen(true)}>
                    <FaLayerGroup className="me-1" /> Batch Assign Fee
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CLASS FEE STRUCTURES */}
      {!loading && activeTab === 'structures' && (
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <h6 className="fw-bold mb-0">Class Fee Masters</h6>
            <button className="btn btn-primary btn-sm" onClick={() => setIsFeeModalOpen(true)}>
              <FaPlus className="me-1" /> Create Class Fee
            </button>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Class</th>
                  <th>Branch</th>
                  <th>Academic Year</th>
                  <th>Total Annual Fee</th>
                  <th>Components Breakdown</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {classFees.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-muted">No fee structures configured yet.</td>
                  </tr>
                ) : (
                  classFees.map((fee) => (
                    <tr key={fee.fee_id}>
                      <td className="fw-bold">{fee.class_name || `Class #${fee.class_id}`}</td>
                      <td>{fee.brch_name || `Branch #${fee.brch_id}`}</td>
                      <td>{fee.academic_year}</td>
                      <td className="fw-bold text-primary">₹{Number(fee.total_annual_fee || 0).toLocaleString()}</td>
                      <td>
                        {fee.components && fee.components.length > 0 ? (
                          <div className="d-flex flex-wrap gap-1">
                            {fee.components.map((c, i) => (
                              <span key={i} className="badge bg-light text-dark border">
                                {c.fee_type}: ₹{c.amount} ({c.frequency})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted small">Consolidated</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${fee.is_active ? 'bg-success' : 'bg-secondary'}`}>
                          {fee.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: STUDENT INVOICES & ALLOCATION */}
      {!loading && activeTab === 'invoices' && (
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <h6 className="fw-bold mb-0">Student Monthly Invoices</h6>
            <button className="btn btn-primary btn-sm" onClick={() => setIsBatchModalOpen(true)}>
              <FaLayerGroup className="me-1" /> Batch Assign To Class
            </button>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Invoice ID</th>
                  <th>Student</th>
                  <th>Class / Branch</th>
                  <th>Period</th>
                  <th>Payable Amount</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {studentFees.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4 text-muted">No student fee records found.</td>
                  </tr>
                ) : (
                  studentFees.map((inv) => (
                    <tr key={inv.stu_fee_id}>
                      <td className="fw-bold">#INV-{inv.stu_fee_id}</td>
                      <td>
                        <div className="fw-semibold">{inv.student_name || `Student #${inv.student_id}`}</div>
                        <div className="text-muted small">{inv.admission_no || ''}</div>
                      </td>
                      <td>
                        <div>{inv.class_name || '-'}</div>
                        <div className="text-muted small">{inv.brch_name || ''}</div>
                      </td>
                      <td>Month {inv.fee_month} / {inv.fee_year}</td>
                      <td className="fw-bold text-success">₹{Number(inv.payable_amount || 0).toLocaleString()}</td>
                      <td>{inv.due_date || '-'}</td>
                      <td>
                        <span className={`badge ${inv.status === 'PAID' ? 'bg-success' : inv.status === 'PARTIAL' ? 'bg-warning text-dark' : 'bg-danger'}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td>
                        {inv.status !== 'PAID' && (
                          <button
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => {
                              setPaymentForm({
                                brch_id: inv.brch_id,
                                stu_fee_id: inv.stu_fee_id,
                                student_id: inv.student_id,
                                paid_amount: inv.payable_amount,
                                payment_mode: 'CASH',
                                transaction_ref: '',
                                remarks: `Settlement for Invoice #${inv.stu_fee_id}`
                              })
                              setIsPaymentModalOpen(true)
                            }}
                          >
                            <FaReceipt className="me-1" /> Pay
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PAYMENTS & RECEIPTS */}
      {!loading && activeTab === 'payments' && (
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <h6 className="fw-bold mb-0">Payment Transactions & Receipts</h6>
            <button className="btn btn-primary btn-sm" onClick={() => setIsPaymentModalOpen(true)}>
              <FaPlus className="me-1" /> Record Counter Payment
            </button>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Receipt #</th>
                  <th>Student</th>
                  <th>Amount Paid</th>
                  <th>Payment Mode</th>
                  <th>Reference / Txn ID</th>
                  <th>Payment Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-4 text-muted">No payment transactions recorded.</td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.payment_id}>
                      <td className="fw-bold text-primary">{p.receipt_no || `#REC-${p.payment_id}`}</td>
                      <td>
                        <div className="fw-semibold">{p.student_name || `Student #${p.student_id}`}</div>
                        <div className="text-muted small">{p.admission_no}</div>
                      </td>
                      <td className="fw-bold text-success">₹{Number(p.paid_amount || 0).toLocaleString()}</td>
                      <td><span className="badge bg-light text-dark border">{p.payment_mode}</span></td>
                      <td className="small text-muted">{p.transaction_ref || 'Counter Cash'}</td>
                      <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                      <td>
                        <span className="badge bg-success">{p.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: FINES & PENALTIES */}
      {!loading && activeTab === 'fines' && (
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <h6 className="fw-bold mb-0">Imposed Penalties & Late Dues</h6>
            <button className="btn btn-danger btn-sm" onClick={() => setIsFineModalOpen(true)}>
              <FaExclamationTriangle className="me-1" /> Impose Fine
            </button>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Fine ID</th>
                  <th>Student</th>
                  <th>Reason</th>
                  <th>Fine Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {fines.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-4 text-muted">No fines or late penalties logged.</td>
                  </tr>
                ) : (
                  fines.map((f) => (
                    <tr key={f.fine_id}>
                      <td className="fw-bold">#FN-{f.fine_id}</td>
                      <td>
                        <div className="fw-semibold">{f.student_name || `Student #${f.student_id}`}</div>
                        <div className="text-muted small">{f.admission_no}</div>
                      </td>
                      <td>{f.fine_reason}</td>
                      <td className="fw-bold text-danger">₹{Number(f.fine_amount || 0).toLocaleString()}</td>
                      <td>{f.fine_date}</td>
                      <td>
                        <span className={`badge ${f.status === 'PAID' ? 'bg-success' : 'bg-warning text-dark'}`}>
                          {f.status}
                        </span>
                      </td>
                      <td>
                        {f.status !== 'PAID' && (
                          <button
                            className="btn btn-sm btn-outline-success"
                            onClick={() => handleMarkFinePaid(f.fine_id)}
                          >
                            Mark Paid
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE CLASS FEE */}
      {isFeeModalOpen && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <form onSubmit={handleSaveClassFee}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">Create Class Fee Structure</h5>
                  <button type="button" className="btn-close" onClick={() => setIsFeeModalOpen(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="row g-3">
                    {isSchoolAdmin && (
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Branch</label>
                        <select
                          className="form-select form-select-sm"
                          required
                          value={feeForm.brch_id}
                          onChange={(e) => setFeeForm({ ...feeForm, brch_id: e.target.value })}
                        >
                          <option value="">Select Branch</option>
                          {branches.map(b => (
                            <option key={b.brch_id || b.BRCH_ID} value={b.brch_id || b.BRCH_ID}>
                              {b.brch_name || b.BRCH_NAME}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Class</label>
                      <select
                        className="form-select form-select-sm"
                        required
                        value={feeForm.class_id}
                        onChange={(e) => setFeeForm({ ...feeForm, class_id: e.target.value })}
                      >
                        <option value="">Select Class</option>
                        {classes.map(c => (
                          <option key={c.class_id || c.CLASS_ID} value={c.class_id || c.CLASS_ID}>
                            {c.class_name || c.CLASS_NAME}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Academic Year</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        required
                        value={feeForm.academic_year}
                        onChange={(e) => setFeeForm({ ...feeForm, academic_year: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Total Annual Fee (Auto Calculated)</label>
                      <input
                        type="number"
                        className="form-control form-control-sm fw-bold bg-light"
                        readOnly
                        value={feeForm.total_annual_fee}
                      />
                    </div>

                    <div className="col-12 mt-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="small fw-bold">Fee Breakdown Components</span>
                        <button type="button" className="btn btn-outline-primary btn-sm" onClick={handleAddComponent}>
                          <FaPlus className="me-1" /> Add Component
                        </button>
                      </div>
                      {feeForm.components.map((comp, idx) => (
                        <div key={idx} className="row g-2 align-items-center mb-2">
                          <div className="col-4">
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="Component (e.g. TUITION)"
                              value={comp.fee_type}
                              onChange={(e) => handleComponentChange(idx, 'fee_type', e.target.value.toUpperCase())}
                              required
                            />
                          </div>
                          <div className="col-3">
                            <input
                              type="number"
                              className="form-control form-control-sm"
                              placeholder="Amount (₹)"
                              value={comp.amount}
                              onChange={(e) => handleComponentChange(idx, 'amount', e.target.value)}
                              required
                            />
                          </div>
                          <div className="col-3">
                            <select
                              className="form-select form-select-sm"
                              value={comp.frequency}
                              onChange={(e) => handleComponentChange(idx, 'frequency', e.target.value)}
                            >
                              <option value="MONTHLY">MONTHLY</option>
                              <option value="QUARTERLY">QUARTERLY</option>
                              <option value="ANNUAL">ANNUAL</option>
                              <option value="ONE_TIME">ONE_TIME</option>
                            </select>
                          </div>
                          <div className="col-2 text-end">
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => handleRemoveComponent(idx)}
                              disabled={feeForm.components.length <= 1}
                            >
                              <FaTimes />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsFeeModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm">Save Fee Structure</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: BATCH ALLOCATION */}
      {isBatchModalOpen && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={handleBatchAssignSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">Batch Fee Assignment</h5>
                  <button type="button" className="btn-close" onClick={() => setIsBatchModalOpen(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="row g-3">
                    {isSchoolAdmin && (
                      <div className="col-12">
                        <label className="form-label small fw-semibold">Branch</label>
                        <select
                          className="form-select form-select-sm"
                          required
                          value={batchForm.brch_id}
                          onChange={(e) => setBatchForm({ ...batchForm, brch_id: e.target.value })}
                        >
                          <option value="">Select Branch</option>
                          {branches.map(b => (
                            <option key={b.brch_id || b.BRCH_ID} value={b.brch_id || b.BRCH_ID}>
                              {b.brch_name || b.BRCH_NAME}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Target Class</label>
                      <select
                        className="form-select form-select-sm"
                        required
                        value={batchForm.class_id}
                        onChange={(e) => setBatchForm({ ...batchForm, class_id: e.target.value })}
                      >
                        <option value="">Select Class</option>
                        {classes.map(c => (
                          <option key={c.class_id || c.CLASS_ID} value={c.class_id || c.CLASS_ID}>
                            {c.class_name || c.CLASS_NAME}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Fee Structure Template</label>
                      <select
                        className="form-select form-select-sm"
                        required
                        value={batchForm.fee_id}
                        onChange={(e) => setBatchForm({ ...batchForm, fee_id: e.target.value })}
                      >
                        <option value="">Select Fee Structure</option>
                        {classFees.map(f => (
                          <option key={f.fee_id} value={f.fee_id}>
                            {f.class_name} - ₹{f.total_annual_fee} ({f.academic_year})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Fee Month (1-12)</label>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        className="form-control form-control-sm"
                        required
                        value={batchForm.fee_month}
                        onChange={(e) => setBatchForm({ ...batchForm, fee_month: e.target.value })}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Year</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        required
                        value={batchForm.fee_year}
                        onChange={(e) => setBatchForm({ ...batchForm, fee_year: e.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Due Date</label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        required
                        value={batchForm.due_date}
                        onChange={(e) => setBatchForm({ ...batchForm, due_date: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsBatchModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm">Assign to All Students</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: RECORD PAYMENT */}
      {isPaymentModalOpen && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={handleRecordPaymentSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">Record Counter Payment</h5>
                  <button type="button" className="btn-close" onClick={() => setIsPaymentModalOpen(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Student Invoice ID (stu_fee_id)</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        required
                        value={paymentForm.stu_fee_id}
                        onChange={(e) => setPaymentForm({ ...paymentForm, stu_fee_id: e.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Student ID (user_id / stu_id)</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        required
                        value={paymentForm.student_id}
                        onChange={(e) => setPaymentForm({ ...paymentForm, student_id: e.target.value })}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Amount (₹)</label>
                      <input
                        type="number"
                        className="form-control form-control-sm fw-bold"
                        required
                        value={paymentForm.paid_amount}
                        onChange={(e) => setPaymentForm({ ...paymentForm, paid_amount: e.target.value })}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Payment Mode</label>
                      <select
                        className="form-select form-select-sm"
                        value={paymentForm.payment_mode}
                        onChange={(e) => setPaymentForm({ ...paymentForm, payment_mode: e.target.value })}
                      >
                        <option value="CASH">CASH</option>
                        <option value="UPI">UPI</option>
                        <option value="CHEQUE">CHEQUE</option>
                        <option value="NETBANKING">NETBANKING</option>
                        <option value="CARD">CARD</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Transaction Reference / Cheque No</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="e.g. UTR12345678 or Cheque #9876"
                        value={paymentForm.transaction_ref}
                        onChange={(e) => setPaymentForm({ ...paymentForm, transaction_ref: e.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Remarks</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={paymentForm.remarks}
                        onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsPaymentModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-success btn-sm">Generate Receipt</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: IMPOSE FINE */}
      {isFineModalOpen && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={handleFineSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">Impose Penalty / Late Fine</h5>
                  <button type="button" className="btn-close" onClick={() => setIsFineModalOpen(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Student ID</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        required
                        value={fineForm.student_id}
                        onChange={(e) => setFineForm({ ...fineForm, student_id: e.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Reason for Penalty</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        required
                        value={fineForm.fine_reason}
                        onChange={(e) => setFineForm({ ...fineForm, fine_reason: e.target.value })}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Fine Amount (₹)</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        required
                        value={fineForm.fine_amount}
                        onChange={(e) => setFineForm({ ...fineForm, fine_amount: e.target.value })}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Date</label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        required
                        value={fineForm.fine_date}
                        onChange={(e) => setFineForm({ ...fineForm, fine_date: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsFineModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-danger btn-sm">Impose Fine</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

