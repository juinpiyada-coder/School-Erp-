import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FaMoneyBillWave,
  FaFileInvoiceDollar,
  FaCheckCircle,
  FaExclamationCircle,
  FaPrint,
  FaTimes,
  FaUserGraduate,
  FaCalendarAlt,
  FaCreditCard,
  FaReceipt,
  FaDownload,
  FaShieldAlt
} from 'react-icons/fa'
import axios from '../../lib/axios'
import { toast } from 'react-toastify'

const EMPTY_FEE_SUMMARY = { totalFee: 0, totalPaid: 0, totalDue: 0, dueDate: '', currency: '', academicYear: '', status: 'N/A' }
const EMPTY_FEE_HEADS = []
const EMPTY_INVOICES = []

export default function FeesDuePaidReport({ forcedRole = null }) {
  const [userRole, setUserRole] = useState('')
  const [wards, setWards] = useState([])
  const [selectedWard, setSelectedWard] = useState('')
  const [feeSummary, setFeeSummary] = useState(EMPTY_FEE_SUMMARY)
  const [feeHeads, setFeeHeads] = useState(EMPTY_FEE_HEADS)
  const [invoices, setInvoices] = useState(EMPTY_INVOICES)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)
  const [isPayModalOpen, setIsPayModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    try {
      const u = JSON.parse(sessionStorage.getItem('e_school_user') || '{}')
      const role = (forcedRole || u?.user_role || u?.role || '').toUpperCase()
      setUserRole(role)
    } catch (e) {}
  }, [forcedRole])

  const isParent = userRole.includes('PARENT') || userRole.includes('GUARDIAN')

  // Load parent's wards if parent
  useEffect(() => {
    if (isParent) {
      axios.get(`${import.meta.env.VITE_API_BASE_URL}/student/wards`)
        .then(res => {
          const list = Array.isArray(res.data) ? res.data : res.data?.data || []
          setWards(list)
          if (list.length > 0) {
            setSelectedWard(list[0].id || list[0].STU_ID || '')
          }
        })
        .catch(() => {
          setWards([]); setSelectedWard('')
        })
    }
  }, [isParent])

  // Fetch fees report data
  useEffect(() => {
    setLoading(true)
    const endpoint = isParent && selectedWard
      ? `${import.meta.env.VITE_API_BASE_URL}/student/fees-report?student_id=${selectedWard}`
      : `${import.meta.env.VITE_API_BASE_URL}/student/fees-report`

    axios.get(endpoint)
      .then(res => {
        const data = res.data?.data || res.data
        if (data?.summary) {
          setFeeSummary(data.summary)
          if (data?.heads && Array.isArray(data.heads)) setFeeHeads(data.heads)
          if (data?.invoices && Array.isArray(data.invoices)) setInvoices(data.invoices)
        } else {
          setFeeSummary(EMPTY_FEE_SUMMARY)
          setFeeHeads(EMPTY_FEE_HEADS)
          setInvoices(EMPTY_INVOICES)
        }
      })
      .catch(() => {
        setFeeSummary(EMPTY_FEE_SUMMARY)
        setFeeHeads(EMPTY_FEE_HEADS)
        setInvoices(EMPTY_INVOICES)
      })
      .finally(() => setLoading(false))
  }, [isParent, selectedWard])

  const openReceipt = (inv) => {
    setSelectedInvoice(inv)
    setIsReceiptModalOpen(true)
  }

  const printReceipt = () => {
    window.print()
  }

  const handleSimulatePayment = () => {
    toast.info('Online payment gateway is not configured. Please contact the school office.')
    setIsPayModalOpen(false)
  }

  const selectedWardObj = wards.find(w => (w.id || w.STU_ID) === selectedWard)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="page-container"
    >
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="section-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ display: 'inline-flex', padding: '10px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', fontSize: '1.25rem' }}>
              <FaMoneyBillWave />
            </span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--clr-text, #111827)' }}>
                {isParent ? 'Children Fees Due / Paid Report' : 'Fees Due / Paid Report'}
              </h2>
              <p style={{ margin: '4px 0 0 0', color: 'var(--clr-text-muted, #6b7280)', fontSize: '0.875rem' }}>
                Complete breakdown of school tuition, pending due amounts, paid receipts, and payment logs.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            onClick={() => setIsPayModalOpen(true)}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: '#10b981', borderColor: '#10b981' }}
          >
            <FaCreditCard /> Settle Due Fees
          </button>
        </div>
      </div>

      {/* ── Parent Ward Switcher Bar (Only if Parent) ──────────── */}
      {isParent && (
        <div 
          className="glass-panel" 
          style={{ 
            padding: '16px 20px', 
            marginBottom: '24px', 
            borderRadius: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            borderLeft: '4px solid #10b981'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              <FaUserGraduate />
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--clr-text-muted, #6b7280)', fontWeight: 600 }}>
                Selected Child / Ward
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--clr-text, #111827)' }}>
                {selectedWardObj?.STU_NM || selectedWardObj?.name || 'Selected Student'} 
                <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--clr-text-muted, #6b7280)', marginLeft: '8px' }}>
                  ({selectedWardObj?.className || selectedWardObj?.grade || 'Class Section'})
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label htmlFor="wardSelectFees" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--clr-text, #111827)' }}>
              Switch Ward:
            </label>
            <select
              id="wardSelectFees"
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="form-control"
              style={{ padding: '8px 14px', borderRadius: '8px', minWidth: '220px', fontWeight: 500 }}
            >
              {wards.map(w => (
                <option key={w.id || w.STU_ID} value={w.id || w.STU_ID}>
                  {w.STU_NM || w.name} {w.className ? `— ${w.className}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ── Top Summary Metric Cards ────────────────────────── */}
      <div className="grid-auto-md" style={{ gap: '16px', marginBottom: '24px' }}>
        <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--clr-text-muted, #6b7280)', fontWeight: 600, textTransform: 'uppercase' }}>
            Total Prescribed Fee
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--clr-text, #111827)', marginTop: '4px' }}>
            {feeSummary.currency} {feeSummary.totalFee.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted, #6b7280)' }}>
            Academic Term: {feeSummary.academicYear}
          </span>
        </div>

        <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--clr-text-muted, #6b7280)', fontWeight: 600, textTransform: 'uppercase' }}>
            Total Paid Fees
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
            {feeSummary.currency} {feeSummary.totalPaid.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
            ✓ Verified with bank & receipt
          </span>
        </div>

        <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--clr-text-muted, #6b7280)', fontWeight: 600, textTransform: 'uppercase' }}>
            Outstanding Due Balance
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: feeSummary.totalDue > 0 ? '#ef4444' : '#10b981', marginTop: '4px' }}>
            {feeSummary.currency} {feeSummary.totalDue.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.75rem', color: feeSummary.totalDue > 0 ? '#dc2626' : '#059669', fontWeight: 600 }}>
            {feeSummary.totalDue > 0 ? `Due by: ${feeSummary.dueDate}` : '✓ All fees clear'}
          </span>
        </div>

        <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--clr-text-muted, #6b7280)', fontWeight: 600, textTransform: 'uppercase' }}>
            Account Standing
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: feeSummary.totalDue === 0 ? '#10b981' : '#f59e0b', marginTop: '4px' }}>
            {feeSummary.status}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted, #6b7280)' }}>
            Next billing cycle active
          </span>
        </div>
      </div>

      {/* ── Fee Category Breakdown Cards ──────────────────────── */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '1.15rem', fontWeight: 700, color: 'var(--clr-text, #111827)' }}>
          Fee Structure & Itemized Allocation
        </h3>

        {feeHeads.length > 0 ? (
          <div className="grid-auto-md" style={{ gap: '14px' }}>
            {feeHeads.map(fh => {
              const isFullPaid = fh.due === 0
              const pct = fh.total > 0 ? Math.round((fh.paid * 100) / fh.total) : 0
              return (
                <div 
                  key={fh.id}
                  className="glass-panel"
                  style={{
                    padding: '16px 18px',
                    borderRadius: '10px',
                    borderLeft: isFullPaid ? '4px solid #10b981' : fh.paid > 0 ? '4px solid #f59e0b' : '4px solid #ef4444'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--clr-text, #111827)' }}>
                      {fh.name}
                    </div>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '10px',
                        background: isFullPaid ? 'rgba(16, 185, 129, 0.12)' : fh.paid > 0 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                        color: isFullPaid ? '#059669' : fh.paid > 0 ? '#d97706' : '#dc2626'
                      }}
                    >
                      {fh.status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--clr-text-muted, #6b7280)', marginBottom: '8px' }}>
                    <span>Paid: <strong>₹{fh.paid.toLocaleString()}</strong></span>
                    <span>Due: <strong style={{ color: fh.due > 0 ? '#ef4444' : undefined }}>₹{fh.due.toLocaleString()}</strong></span>
                  </div>

                  <div style={{ width: '100%', height: '6px', background: 'rgba(0,0,0,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        width: `${pct}%`, 
                        height: '100%', 
                        background: isFullPaid ? '#10b981' : '#f59e0b', 
                        borderRadius: '3px' 
                      }} 
                    />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--clr-text-muted, #6b7280)', borderRadius: '10px' }}>
            No fee head breakdown records available.
          </div>
        )}
      </div>

      {/* ── Invoices & Receipts Table ─────────────────────────── */}
      <div className="glass-panel" style={{ padding: '24px', borderRadius: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--clr-text, #111827)' }}>
              Invoices & Payment Receipts History
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--clr-text-muted, #6b7280)' }}>
              Official school payment logs and tax-deductible tuition receipts.
            </p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--clr-border, #e5e7eb)', color: 'var(--clr-text-muted, #6b7280)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px' }}>Invoice No</th>
                <th style={{ padding: '12px 16px' }}>Fee Description</th>
                <th style={{ padding: '12px 16px' }}>Total Amount</th>
                <th style={{ padding: '12px 16px' }}>Paid Amount</th>
                <th style={{ padding: '12px 16px' }}>Balance Due</th>
                <th style={{ padding: '12px 16px' }}>Payment Mode</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length > 0 ? (
                invoices.map(inv => {
                  const isPaid = inv.status === 'PAID'
                  const isPartial = inv.status === 'PARTIAL'
                  return (
                    <tr 
                      key={inv.invoiceNo} 
                      style={{ 
                        borderBottom: '1px solid var(--clr-border, #f3f4f6)', 
                        fontSize: '0.875rem' 
                      }}
                    >
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--clr-primary, #005A9E)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FaFileInvoiceDollar />
                          {inv.invoiceNo}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--clr-text, #111827)' }}>
                        {inv.description}
                        <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted, #6b7280)', fontWeight: 400 }}>
                          Due: {inv.dueDate}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>
                        ₹{inv.totalAmount.toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: '#10b981' }}>
                        ₹{inv.paidAmount.toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: inv.dueAmount > 0 ? '#ef4444' : '#6b7280' }}>
                        ₹{inv.dueAmount.toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--clr-text-muted, #6b7280)' }}>
                        {inv.method}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: isPaid 
                              ? 'rgba(16, 185, 129, 0.12)' 
                              : isPartial 
                                ? 'rgba(245, 158, 11, 0.12)' 
                                : 'rgba(239, 68, 68, 0.12)',
                            color: isPaid ? '#059669' : isPartial ? '#d97706' : '#dc2626'
                          }}
                        >
                          {isPaid ? <FaCheckCircle /> : <FaExclamationCircle />}
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => openReceipt(inv)}
                          className="btn btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                        >
                          <FaReceipt /> View
                        </button>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: 'var(--clr-text-muted, #6b7280)' }}>
                    No invoice or receipt records found for this student.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Official Printable Receipt Modal ──────────────────── */}
      <AnimatePresence>
        {isReceiptModalOpen && selectedInvoice && (
          <div 
            style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              background: 'rgba(0,0,0,0.5)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              zIndex: 9999, 
              padding: '20px' 
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel"
              style={{
                background: '#ffffff',
                color: '#111827',
                padding: '36px',
                borderRadius: '16px',
                maxWidth: '600px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
              }}
            >
              {/* Receipt Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e5e7eb', paddingBottom: '20px', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--clr-primary, #005A9E)' }}>
                    E-School Academic Portal
                  </h3>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '2px' }}>
                    Official Fee Payment Receipt
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                    Affiliated Institution | CB-2026/09
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <button 
                    onClick={() => setIsReceiptModalOpen(false)}
                    style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#9ca3af' }}
                  >
                    <FaTimes />
                  </button>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827', marginTop: '10px' }}>
                    {selectedInvoice.invoiceNo}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                    Date: {selectedInvoice.paymentDate}
                  </div>
                </div>
              </div>

              {/* Student details */}
              <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', fontSize: '0.875rem' }}>
                <div className="form-row-2col">
                  <div>
                    <span style={{ color: '#6b7280', fontSize: '0.78rem', display: 'block' }}>Student Name:</span>
                    <strong>{selectedWardObj?.STU_NM || selectedWardObj?.name || 'Enrolled Student'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#6b7280', fontSize: '0.78rem', display: 'block' }}>Class & Section:</span>
                    <strong>{selectedWardObj?.className || selectedWardObj?.grade || 'Grade 10 - Section A'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#6b7280', fontSize: '0.78rem', display: 'block' }}>Payment Reference:</span>
                    <code>{selectedInvoice.transactionId}</code>
                  </div>
                  <div>
                    <span style={{ color: '#6b7280', fontSize: '0.78rem', display: 'block' }}>Payment Method:</span>
                    <strong>{selectedInvoice.method}</strong>
                  </div>
                </div>
              </div>

              {/* Breakdown */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb', color: '#6b7280', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '8px 0' }}>Item Description</th>
                    <th style={{ padding: '8px 0', textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 0' }}>{selectedInvoice.description}</td>
                    <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 600 }}>₹{selectedInvoice.totalAmount.toLocaleString()}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 0', color: '#059669', fontWeight: 600 }}>Amount Settled</td>
                    <td style={{ padding: '12px 0', textAlign: 'right', color: '#059669', fontWeight: 700 }}>₹{selectedInvoice.paidAmount.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '12px 0', color: selectedInvoice.dueAmount > 0 ? '#dc2626' : '#6b7280', fontWeight: 600 }}>Remaining Due</td>
                    <td style={{ padding: '12px 0', textAlign: 'right', color: selectedInvoice.dueAmount > 0 ? '#dc2626' : '#6b7280', fontWeight: 700 }}>₹{selectedInvoice.dueAmount.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              {/* Security Seal & Print Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #d1d5db', paddingTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', fontSize: '0.8rem', fontWeight: 600 }}>
                  <FaShieldAlt /> Digitally Certified & Verified
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    type="button" 
                    onClick={printReceipt} 
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
                  >
                    <FaPrint /> Print Receipt
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setIsReceiptModalOpen(false)} 
                    className="btn btn-secondary"
                    style={{ fontSize: '0.85rem' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Settle Due Fees Simulation Modal ───────────────────── */}
      <AnimatePresence>
        {isPayModalOpen && (
          <div 
            style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              background: 'rgba(0,0,0,0.5)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              zIndex: 9999, 
              padding: '20px' 
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel"
              style={{
                background: '#ffffff',
                color: '#111827',
                padding: '28px',
                borderRadius: '16px',
                maxWidth: '460px',
                width: '100%',
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
                  Online Fee Settlement
                </h3>
                <button 
                  onClick={() => setIsPayModalOpen(false)}
                  style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#9ca3af' }}
                >
                  <FaTimes />
                </button>
              </div>

              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '20px' }}>
                You are about to initiate payment for outstanding balance: <strong>₹{feeSummary.totalDue.toLocaleString()}</strong>
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer' }}>
                  <input type="radio" name="payMethod" defaultChecked />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Instant UPI (GPay / PhonePe / Paytm)</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Zero transaction surcharge</div>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer' }}>
                  <input type="radio" name="payMethod" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Credit / Debit Card</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Visa, MasterCard, RuPay</div>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer' }}>
                  <input type="radio" name="payMethod" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Net Banking</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>All major nationalized & private banks</div>
                  </div>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => setIsPayModalOpen(false)} 
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={handleSimulatePayment} 
                  className="btn btn-primary"
                  style={{ background: '#10b981', borderColor: '#10b981' }}
                >
                  Confirm & Pay ₹{feeSummary.totalDue.toLocaleString()}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}