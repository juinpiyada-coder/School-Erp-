import React, { useState, useRef, useMemo } from 'react'
import * as XLSX from 'xlsx'
import {
  FaUpload,
  FaFileExcel,
  FaFileCsv,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaSpinner,
  FaTrashAlt,
  FaBuilding,
  FaInfoCircle
} from 'react-icons/fa'
import axios from '../../lib/axios'
import Modal from '../common/Modal'
import { toast } from 'react-toastify'

const TEMPLATE_HEADERS = [
  'Teacher Name*',
  'Email*',
  'Phone*',
  'Aadhar Number',
  'PAN Number',
  'Class Name',
  'Subject Name',
  'Status (Active/Inactive)',
  'User ID',
  'Password',
  'Branch ID'
]

const MAX_ROWS = 500
const MAX_FILE_BYTES = 10 * 1024 * 1024

// Read a cell by trying several header spellings
const pick = (row, keys) => {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') return String(row[k]).trim()
  }
  return ''
}

export default function StaffBulkUploadModal({
  isOpen,
  onClose,
  branches = [],
  classes = [],
  subjects = [],
  currentUser = {},
  onSuccess
}) {
  const fileInputRef = useRef(null)
  const [selectedBranch, setSelectedBranch] = useState('')
  const [selectedClassId, setSelectedClassId] = useState('')
  const [file, setFile] = useState(null)
  const [parsedRows, setParsedRows] = useState([])
  const [validationErrors, setValidationErrors] = useState([])
  const [isParsing, setIsParsing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [filterMode, setFilterMode] = useState('all') // 'all' | 'valid' | 'invalid'

  // ── Permissions ────────────────────────────────────────────────────────────
  const userRole = String(currentUser?.role_id || currentUser?.user_role || currentUser?.role || '').toUpperCase()
  const isBranchAdmin = userRole.includes('BRANCH') && !userRole.includes('SUPER')
  const userBranchId = currentUser?.branch_id || currentUser?.user_branch_id || currentUser?.userId || currentUser?.user_id || ''
  const effectiveBranch = isBranchAdmin
    ? userBranchId
    : (selectedBranch || branches[0]?.id || branches[0]?.SCHL_BR_ID || '')

  // ── Branch scoped reference data ───────────────────────────────────────────
  const branchClasses = useMemo(() => {
    if (!effectiveBranch) return classes
    return classes.filter((c) => !c.branchId || String(c.branchId) === String(effectiveBranch))
  }, [classes, effectiveBranch])

  const branchSubjects = useMemo(() => {
    const classIds = new Set(branchClasses.map((c) => String(c.id)))
    return subjects.filter((s) => {
      if (selectedClassId) return String(s.classId) === String(selectedClassId)
      if (s.branchId) return String(s.branchId) === String(effectiveBranch)
      return !s.classId || classIds.has(String(s.classId))
    })
  }, [subjects, branchClasses, selectedClassId, effectiveBranch])

  const activeClassObj = useMemo(() => {
    if (!selectedClassId) return null
    return branchClasses.find((c) => String(c.id) === String(selectedClassId)) || null
  }, [branchClasses, selectedClassId])

  const resetFile = () => {
    setFile(null)
    setParsedRows([])
    setValidationErrors([])
    setUploadResult(null)
    setFilterMode('all')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleClose = () => {
    resetFile()
    onClose()
  }

  // ── Template download ──────────────────────────────────────────────────────
  const handleDownloadTemplate = (type = 'xlsx') => {
    try {
      const sampleClass = activeClassObj?.name || branchClasses[0]?.name || 'Class 10'
      const sampleSubject = branchSubjects[0]?.name || 'Mathematics'

      const sampleRows = [
        ['Rahul Sen', 'rahul.sen@example.com', '9876543210', '123456789012', 'ABCDE1234F', sampleClass, sampleSubject, 'Active', 'rahul.sen@example.com', 'Teacher@123', effectiveBranch],
        ['Priya Das', 'priya.das@example.com', '9876501234', '', '', sampleClass, sampleSubject, 'Active', '', '', effectiveBranch]
      ]

      const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...sampleRows])
      ws['!cols'] = TEMPLATE_HEADERS.map(() => ({ wch: 22 }))

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Teachers_Template')

      // Reference sheet (Excel only) so the admin can copy exact class / subject names
      if (type !== 'csv') {
        const refRows = [['Class Name', 'Subject Name']]
        const classNameById = new Map(branchClasses.map((c) => [String(c.id), c.name]))
        branchSubjects.forEach((s) => refRows.push([classNameById.get(String(s.classId)) || s.className || '', s.name]))
        if (refRows.length === 1) branchClasses.forEach((c) => refRows.push([c.name, '']))
        const refWs = XLSX.utils.aoa_to_sheet(refRows)
        refWs['!cols'] = [{ wch: 24 }, { wch: 28 }]
        XLSX.utils.book_append_sheet(wb, refWs, 'Reference_Classes_Subjects')
      }

      XLSX.writeFile(wb, `teacher_bulk_import_template.${type === 'csv' ? 'csv' : 'xlsx'}`, { bookType: type === 'csv' ? 'csv' : 'xlsx' })
      toast.info(`Downloaded teacher ${type.toUpperCase()} template`)
    } catch (err) {
      toast.error('Failed to generate template: ' + err.message)
    }
  }

  // ── File handling ──────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const f = e.target.files?.[0]
    if (f) processFile(f)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (f) processFile(f)
  }

  const processFile = (inputFile) => {
    const hasValidExt = ['.xlsx', '.xls', '.csv'].some((ext) => inputFile.name.toLowerCase().endsWith(ext))
    if (!hasValidExt) {
      toast.error('Please upload a valid Excel (.xlsx, .xls) or CSV file.')
      return
    }
    if (inputFile.size > MAX_FILE_BYTES) {
      toast.error('File is larger than 10MB.')
      return
    }

    setFile(inputFile)
    setIsParsing(true)
    setUploadResult(null)

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(ws, { defval: '' })

        if (!jsonData || jsonData.length === 0) {
          toast.warning('The uploaded sheet is empty.')
          setParsedRows([])
          return
        }
        if (jsonData.length > MAX_ROWS) {
          toast.error(`Too many rows (${jsonData.length}). Maximum ${MAX_ROWS} teachers per upload.`)
          setParsedRows([])
          return
        }
        validateRows(jsonData)
      } catch (err) {
        toast.error('Failed to parse file: ' + err.message)
      } finally {
        setIsParsing(false)
      }
    }
    reader.readAsBinaryString(inputFile)
  }

  // ── Client-side validation (mirrors the Add Teacher form + backend) ───────
  const validateRows = (rows) => {
    const validated = []
    const errors = []
    const seenEmail = new Map()
    const seenUser = new Map()

    rows.forEach((row, idx) => {
      const rowNum = idx + 2
      const name = pick(row, ['Teacher Name*', 'Teacher Name', 'Name', 'name'])
      const email = pick(row, ['Email*', 'Email', 'email']).toLowerCase()
      let phone = pick(row, ['Phone*', 'Phone', 'phone']).replace(/[^0-9]/g, '')
      if (phone.length > 10) phone = phone.slice(-10)
      const aadhar = pick(row, ['Aadhar Number', 'Aadhar', 'aadhar']).replace(/[^0-9]/g, '')
      const pan = pick(row, ['PAN Number', 'PAN', 'pan']).toUpperCase()
      let className = pick(row, ['Class Name', 'Class', 'class'])
      const subjectName = pick(row, ['Subject Name', 'Subject', 'subject'])
      const statusRaw = pick(row, ['Status (Active/Inactive)', 'Status', 'status']) || 'Active'
      const status = /^inactive$/i.test(statusRaw) ? 'Inactive' : 'Active'
      const loginIdRaw = pick(row, ['User ID', 'UserID', 'userId']).toLowerCase()
      const password = pick(row, ['Password', 'password'])
      const targetBranch = pick(row, ['Branch ID', 'Target Branch ID']) || String(effectiveBranch || '')

      // Dropdown class is only a fallback for empty cells
      if (!className && activeClassObj?.name) className = activeClassObj.name

      const loginId = loginIdRaw || email
      const rowErrors = []

      if (!name) rowErrors.push('Missing Teacher Name')
      else if (!/^[a-zA-Z\s.]+$/.test(name)) rowErrors.push('Name can only contain letters')
      if (!email) rowErrors.push('Missing Email')
      else if (!/\S+@\S+\.\S+/.test(email)) rowErrors.push('Invalid Email')
      if (!phone) rowErrors.push('Missing Phone')
      else if (!/^[6-9]\d{9}$/.test(phone)) rowErrors.push('Phone must be 10 digits starting 6-9')
      if (aadhar && aadhar.length !== 12) rowErrors.push('Aadhar must be 12 digits')
      if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) rowErrors.push('Invalid PAN format')
      if (password && password.length < 6) rowErrors.push('Password min 6 characters')
      if (!targetBranch) rowErrors.push('Missing Branch')
      if (email && seenEmail.has(email)) rowErrors.push(`Duplicate email (row #${seenEmail.get(email)})`)
      if (loginId && seenUser.has(loginId)) rowErrors.push(`Duplicate User ID (row #${seenUser.get(loginId)})`)

      // Soft check against loaded classes (backend does the authoritative check)
      if (className && branchClasses.length > 0) {
        const norm = (s) => String(s).trim().toLowerCase()
        const digits = className.replace(/[^0-9]/g, '')
        const found = branchClasses.some((c) => {
          const n = norm(c.name)
          return n === norm(className) || (digits && n.replace(/[^0-9]/g, '') === digits)
        })
        if (!found) rowErrors.push(`Class '${className}' not found in branch`)
      }

      if (email && !seenEmail.has(email)) seenEmail.set(email, rowNum)
      if (loginId && !seenUser.has(loginId)) seenUser.set(loginId, rowNum)

      const isValid = rowErrors.length === 0
      if (!isValid) errors.push({ row: rowNum, name: name || 'Unnamed', errors: rowErrors })

      validated.push({
        _rowNum: rowNum,
        _isValid: isValid,
        _errors: rowErrors,
        TCHR_NM: name,
        TCHR_EMAIL: email,
        TCHR_CONTACT_NO: phone,
        BR_TCHR_AADHAR: aadhar,
        BR_TCHR_PAN: pan,
        class_name: className,
        subject_name: subjectName,
        TCHR_STATUS: status,
        USER_ID: loginIdRaw,
        PASSWORD: password,
        branch_id: targetBranch
      })
    })

    setParsedRows(validated)
    setValidationErrors(errors)
  }

  const validCount = useMemo(() => parsedRows.filter((r) => r._isValid).length, [parsedRows])

  const displayRows = useMemo(() => {
    if (filterMode === 'valid') return parsedRows.filter((r) => r._isValid)
    if (filterMode === 'invalid') return parsedRows.filter((r) => !r._isValid)
    return parsedRows
  }, [parsedRows, filterMode])

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmitUpload = async () => {
    if (!parsedRows.length) {
      toast.warning('Please select and parse a file first.')
      return
    }
    if (!effectiveBranch) {
      toast.warning('Please choose a Target Branch before submitting.')
      return
    }
    if (validCount === 0) {
      toast.warning('No valid rows to import. Please fix the issues and re-upload.')
      return
    }

    setIsSubmitting(true)
    setUploadResult(null)

    try {
      // Only valid rows are sent; invalid ones stay visible in the preview
      const payload = {
        branch_id: effectiveBranch,
        teachers: parsedRows
          .filter((r) => r._isValid)
          .map((r) => {
            const { _rowNum, _isValid, _errors, ...rest } = r
            return rest
          })
      }

      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/staff/bulk-upload`, payload)

      if (res.data?.success) {
        const resData = res.data.data
        setUploadResult(resData)
        toast.success(`Bulk Upload Completed! Imported ${resData.successCount} of ${resData.totalProcessed} teachers.`)
        if (onSuccess) onSuccess()
      } else {
        toast.error(res.data?.message || 'Failed to complete bulk upload.')
      }
    } catch (err) {
      const errRes = err.response?.data
      if (err.response?.status === 429) {
        toast.error(`Rate limit exceeded! Please wait ${errRes?.retry_after || 60} seconds.`)
      } else {
        toast.error(errRes?.message || err.message || 'Error occurred during bulk upload.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const isCsv = file?.name?.toLowerCase().endsWith('.csv')

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Bulk Add Teachers (Excel / CSV)"
      subtitle="Upload a faculty spreadsheet with automatic subject mapping and teacher portal logins"
      size="lg"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', width: '100%' }}>
          <button type="button" className="btn-secondary" onClick={handleClose}>
            {uploadResult ? 'Done' : 'Cancel'}
          </button>
          {!uploadResult && (
            <button
              type="button"
              className="btn-primary"
              disabled={isSubmitting || isParsing || validCount === 0}
              onClick={handleSubmitUpload}
            >
              {isSubmitting ? (
                <>
                  <FaSpinner className="animate-spin" style={{ marginRight: '6px' }} /> Processing...
                </>
              ) : (
                <>
                  <FaUpload style={{ marginRight: '6px' }} /> Import {validCount} Teachers
                </>
              )}
            </button>
          )}
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Info Box */}
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          background: 'rgba(0, 90, 158, 0.08)',
          border: '1px solid rgba(0, 90, 158, 0.2)',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start'
        }}>
          <FaInfoCircle style={{ color: 'var(--clr-primary)', fontSize: '18px', marginTop: '2px', flexShrink: 0 }} />
          <div style={{ fontSize: '0.82rem', lineHeight: '1.4', color: 'var(--clr-text-primary)' }}>
            <strong>Multi-Tenant Data Isolation Guardrail: </strong>
            {isBranchAdmin
              ? `You are importing teachers strictly into your assigned branch (${userBranchId}). Cross-branch entries will be securely rejected.`
              : 'As School Admin, choose the default branch for this sheet or specify Branch IDs per row (only branches of your school are accepted).'}
            {' '}If User ID is blank the email is used as login; if Password is blank the default <code>Teacher@123</code> is set.
          </div>
        </div>

        {/* Branch / Class + Templates */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '12px' }}>
          <div className="form-group" style={{ margin: 0, flex: '1 1 200px' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FaBuilding /> Target Branch {isBranchAdmin ? '(Locked)' : '(Default for Sheet)'}
            </label>
            {isBranchAdmin ? (
              <input
                type="text"
                disabled
                value={userBranchId}
                className="form-control"
                style={{ background: 'rgba(0,0,0,0.05)', cursor: 'not-allowed', color: 'var(--clr-text-secondary)' }}
              />
            ) : (
              <select
                value={selectedBranch}
                onChange={(e) => {
                  setSelectedBranch(e.target.value)
                  setSelectedClassId('')
                }}
                className="form-control"
              >
                <option value="">-- Choose Target Branch --</option>
                {branches.map((b) => (
                  <option key={b.id || b.SCHL_BR_ID} value={b.id || b.SCHL_BR_ID}>
                    {b.name || b.SCHL_BR_NM || b.id} ({b.id || b.SCHL_BR_ID})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="form-group" style={{ margin: 0, flex: '1 1 170px' }}>
            <label className="form-label">Default Class (Optional)</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="form-control"
            >
              <option value="">-- Use sheet values --</option>
              {branchClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-end' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => handleDownloadTemplate('xlsx')}
              style={{ color: '#107c41', borderColor: 'rgba(16, 124, 65, 0.3)' }}
            >
              <FaFileExcel style={{ marginRight: '6px', color: '#107c41' }} /> Excel Template
            </button>
            <button type="button" className="btn-secondary" onClick={() => handleDownloadTemplate('csv')}>
              <FaFileCsv style={{ marginRight: '6px', color: 'var(--clr-secondary)' }} /> CSV Template
            </button>
          </div>
        </div>

        {/* Reference: classes & subjects in branch */}
        {branchClasses.length > 0 && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            background: 'rgba(0,0,0,0.02)',
            border: '1px solid rgba(0,0,0,0.08)',
            fontSize: '0.78rem'
          }}>
            <div style={{ fontWeight: 600, color: 'var(--clr-text-secondary)', marginBottom: '6px' }}>
              Classes in this Branch (use these exact names):
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {branchClasses.map((cls) => (
                <span
                  key={cls.id}
                  style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '4px', fontWeight: 600, fontSize: '0.74rem' }}
                >
                  {cls.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Drop zone / file card */}
        {!file ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed var(--clr-glass-border)',
              borderRadius: '12px',
              padding: '36px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              background: 'rgba(255, 255, 255, 0.4)',
              transition: 'all 0.2s ease'
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
            />
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%',
              background: 'rgba(0, 90, 158, 0.1)', color: 'var(--clr-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px', margin: '0 auto 12px auto'
            }}>
              <FaUpload />
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--clr-text-primary)', marginBottom: '4px' }}>
              Click to browse or drag and drop your spreadsheet here
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--clr-text-muted)' }}>
              Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv) up to 10MB · max {MAX_ROWS} teachers
            </div>
          </div>
        ) : (
          <div style={{
            padding: '14px 18px', borderRadius: '10px',
            border: '1px solid var(--clr-glass-border)', background: 'rgba(255, 255, 255, 0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '8px',
                background: isCsv ? 'rgba(0, 120, 212, 0.15)' : 'rgba(16, 124, 65, 0.15)',
                color: isCsv ? 'var(--clr-secondary)' : '#107c41',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
              }}>
                {isCsv ? <FaFileCsv /> : <FaFileExcel />}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--clr-text-primary)' }}>{file.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)' }}>
                  {(file.size / 1024).toFixed(1)} KB {isParsing && '· parsing…'}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--clr-alert-red)' }}
              onClick={resetFile}
            >
              <FaTrashAlt style={{ marginRight: '5px' }} /> Remove
            </button>
          </div>
        )}

        {/* Validation summary + preview */}
        {parsedRows.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{
              display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 14px', borderRadius: '8px',
              background: 'rgba(0, 90, 158, 0.04)', border: '1px solid var(--clr-glass-border)'
            }}>
              <div style={{ display: 'flex', gap: '16px', fontSize: '0.82rem' }}>
                <span>Total Rows: <strong>{parsedRows.length}</strong></span>
                <span style={{ color: '#107c41', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FaCheckCircle /> Valid: <strong>{validCount}</strong>
                </span>
                {validationErrors.length > 0 && (
                  <span style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FaExclamationTriangle /> Needs Attention: <strong>{validationErrors.length}</strong>
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '4px', fontSize: '0.76rem' }}>
                {[
                  ['all', `All (${parsedRows.length})`],
                  ['valid', `Valid (${validCount})`],
                  ['invalid', `Issues (${validationErrors.length})`]
                ].map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    className={filterMode === mode ? 'btn-primary' : 'btn-secondary'}
                    style={{ padding: '4px 10px' }}
                    onClick={() => setFilterMode(mode)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {validationErrors.length > 0 && !uploadResult && (
              <div style={{ fontSize: '0.78rem', color: '#92400e' }}>
                Rows with issues are skipped. Only the {validCount} valid row(s) will be imported.
              </div>
            )}

            <div style={{
              border: '1px solid var(--clr-glass-border)', borderRadius: '8px',
              overflowX: 'auto', maxHeight: '260px', background: '#ffffff'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, background: 'var(--clr-neutral-base)', borderBottom: '1px solid var(--clr-glass-border)' }}>
                  <tr>
                    <th style={{ padding: '8px 12px' }}>Row</th>
                    <th style={{ padding: '8px 12px' }}>Status</th>
                    <th style={{ padding: '8px 12px' }}>Teacher</th>
                    <th style={{ padding: '8px 12px' }}>Email</th>
                    <th style={{ padding: '8px 12px' }}>Phone</th>
                    <th style={{ padding: '8px 12px' }}>Class / Subject</th>
                    <th style={{ padding: '8px 12px' }}>Issues / Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((r) => (
                    <tr
                      key={r._rowNum}
                      style={{ borderBottom: '1px solid #f1f5f9', background: r._isValid ? 'transparent' : 'rgba(239, 68, 68, 0.05)' }}
                    >
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--clr-text-muted)' }}>#{r._rowNum}</td>
                      <td style={{ padding: '8px 12px' }}>
                        {r._isValid ? (
                          <span style={{ color: '#107c41', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                            <FaCheckCircle /> OK
                          </span>
                        ) : (
                          <span style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                            <FaTimesCircle /> Invalid
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{r.TCHR_NM || '-'}</td>
                      <td style={{ padding: '8px 12px' }}>{r.TCHR_EMAIL || '-'}</td>
                      <td style={{ padding: '8px 12px' }}>{r.TCHR_CONTACT_NO || '-'}</td>
                      <td style={{ padding: '8px 12px' }}>
                        {r.class_name || '-'}{r.subject_name ? ` / ${r.subject_name}` : ''}
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: '0.75rem', color: r._isValid ? 'var(--clr-text-muted)' : '#dc2626' }}>
                        {r._errors?.join(', ') || 'Ready for import'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Server response */}
        {uploadResult && (
          <div style={{
            padding: '14px 18px', borderRadius: '8px',
            border: '1px solid rgba(16, 124, 65, 0.3)', background: 'rgba(16, 124, 65, 0.08)', fontSize: '0.82rem'
          }}>
            <div style={{ fontWeight: 700, color: '#107c41', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <FaCheckCircle /> Upload Finished
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '8px' }}>
              <span>Total Processed: <strong>{uploadResult.totalProcessed}</strong></span>
              <span style={{ color: '#107c41' }}>Successfully Added: <strong>{uploadResult.successCount}</strong></span>
              {uploadResult.failedCount > 0 && (
                <span style={{ color: '#dc2626' }}>Failed: <strong>{uploadResult.failedCount}</strong></span>
              )}
            </div>
            {uploadResult.failures?.length > 0 && (
              <div style={{ borderTop: '1px solid rgba(16, 124, 65, 0.2)', paddingTop: '8px' }}>
                <div style={{ fontWeight: 600, color: '#dc2626', marginBottom: '4px' }}>Rejections:</div>
                <ul style={{ margin: 0, paddingLeft: '18px', color: '#dc2626' }}>
                  {uploadResult.failures.map((f, idx) => (
                    <li key={idx}>Row #{f.row} ({f.name}): {f.reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}