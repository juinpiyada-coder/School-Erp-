import React, { useState, useRef, useMemo } from 'react'
import * as XLSX from 'xlsx'
import {
  FaUpload,
  FaFileExcel,
  FaFileCsv,
  FaDownload,
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

const SAMPLE_CSV_HEADERS = [
  'Student Name*',
  'Class Name*',
  'Section Name*',
  'Roll Number',
  'Gender (M/F/Other)*',
  'Date of Birth (YYYY-MM-DD)*',
  'Aadhar Number',
  'Student Email',
  'Student Phone*',
  'Address',
  'City',
  'State',
  'Pincode',
  'Country',
  'Guardian Name*',
  'Guardian Phone*',
  'Guardian Email',
  'Relation With Guardian',
  'Branch ID'
]

const SAMPLE_ROWS = [
  [
    'Aarav Sharma',
    'Grade 10',
    'Section A',
    '101',
    'M',
    '2010-04-12',
    '334455667788',
    'aarav.s@example.com',
    '9876543210',
    'Flat 402, Lotus Towers',
    'Mumbai',
    'Maharashtra',
    '400001',
    'India',
    'Rajesh Sharma',
    '9876543211',
    'rajesh.s@example.com',
    'Father',
    ''
  ],
  [
    'Ananya Patel',
    'Grade 10',
    'Section B',
    '102',
    'F',
    '2010-09-21',
    '887766554433',
    'ananya.p@example.com',
    '9876501234',
    '12 Greenfield Society',
    'Ahmedabad',
    'Gujarat',
    '380015',
    'India',
    'Bhavna Patel',
    '9876501235',
    'bhavna.p@example.com',
    'Mother',
    ''
  ]
]

export default function StudentBulkUploadModal({
  isOpen,
  onClose,
  branches = [],
  classes = [],
  sessions = [],
  currentUser = {},
  onSuccess
}) {
  const fileInputRef = useRef(null)
  const [selectedBranch, setSelectedBranch] = useState('')
  const [file, setFile] = useState(null)
  const [parsedRows, setParsedRows] = useState([])
  const [validationErrors, setValidationErrors] = useState([])
  const [isParsing, setIsParsing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [filterMode, setFilterMode] = useState('all') // 'all' | 'valid' | 'invalid'

  // Determine user permissions
  const userRole = String(currentUser?.role_id || currentUser?.user_role || currentUser?.role || '').toUpperCase()
  const isSchoolAdmin = ['R_SCHOOLADMIN', 'SCHOOL_ADMIN', 'SUPER_ADMIN'].includes(userRole)
  const isBranchAdmin = userRole.includes('BRANCH') && !userRole.includes('SUPER')
  const userBranchId = currentUser?.branch_id || currentUser?.user_branch_id || currentUser?.userId || ''

  // Effective branch
  const effectiveBranch = isBranchAdmin ? userBranchId : (selectedBranch || branches[0]?.id || branches[0]?.SCHL_BR_ID || '')

  // Available classes & sessions for the current effective branch
  const branchClasses = useMemo(() => {
    if (!effectiveBranch) return classes
    return classes.filter(c => !c.branchId || String(c.branchId) === String(effectiveBranch))
  }, [classes, effectiveBranch])

  const branchSessions = useMemo(() => {
    if (!effectiveBranch) return sessions
    return sessions.filter(s => !s.branchId || String(s.branchId) === String(effectiveBranch))
  }, [sessions, effectiveBranch])

  // Reset state on close
  const handleClose = () => {
    setFile(null)
    setParsedRows([])
    setValidationErrors([])
    setUploadResult(null)
    onClose()
  }

  // Download Sample Template (Excel or CSV)
  const handleDownloadTemplate = (type = 'xlsx') => {
    try {
      // Use real branch classes if available for seamless import
      let sampleData = [...SAMPLE_ROWS]
      if (branchClasses.length > 0) {
        const c1 = branchClasses[0]?.name || 'Grade 10'
        const c2 = branchClasses[1]?.name || c1
        sampleData = [
          [
            'Aarav Sharma',
            c1,
            'Section A',
            '101',
            'M',
            '2010-04-12',
            '334455667788',
            'aarav.s@example.com',
            '9876543210',
            'Flat 402, Lotus Towers',
            'Mumbai',
            'Maharashtra',
            '400001',
            'India',
            'Rajesh Sharma',
            '9876543211',
            'rajesh.s@example.com',
            'Father',
            effectiveBranch
          ],
          [
            'Ananya Patel',
            c2,
            'Section B',
            '102',
            'F',
            '2010-09-21',
            '887766554433',
            'ananya.p@example.com',
            '9876501234',
            '12 Greenfield Society',
            'Ahmedabad',
            'Gujarat',
            '380015',
            'India',
            'Bhavna Patel',
            '9876501235',
            'bhavna.p@example.com',
            'Mother',
            effectiveBranch
          ]
        ]
      }

      const wsData = [SAMPLE_CSV_HEADERS, ...sampleData]
      const ws = XLSX.utils.aoa_to_sheet(wsData)
      ws['!cols'] = SAMPLE_CSV_HEADERS.map(() => ({ wch: 20 }))

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Students_Template')

      if (type === 'csv') {
        XLSX.writeFile(wb, 'student_bulk_import_template.csv', { bookType: 'csv' })
      } else {
        XLSX.writeFile(wb, 'student_bulk_import_template.xlsx', { bookType: 'xlsx' })
      }
      toast.info(`Downloaded student ${type.toUpperCase()} template`)
    } catch (err) {
      toast.error('Failed to generate template: ' + err.message)
    }
  }

  // Parse Uploaded File
  const handleFileChange = (e) => {
    const uploadedFile = e.target.files?.[0]
    if (!uploadedFile) return
    processFile(uploadedFile)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      processFile(droppedFile)
    }
  }

  const processFile = (inputFile) => {
    const validExts = ['.xlsx', '.xls', '.csv']
    const hasValidExt = validExts.some((ext) => inputFile.name.toLowerCase().endsWith(ext))
    if (!hasValidExt) {
      toast.error('Please upload a valid Excel (.xlsx, .xls) or CSV file.')
      return
    }

    setFile(inputFile)
    setIsParsing(true)
    setUploadResult(null)

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsName = wb.SheetNames[0]
        const ws = wb.Sheets[wsName]
        const jsonData = XLSX.utils.sheet_to_json(ws, { defval: '' })

        if (!jsonData || jsonData.length === 0) {
          toast.warning('The uploaded sheet is empty.')
          setParsedRows([])
          setIsParsing(false)
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

  // Client-side row validation
  const validateRows = (rows) => {
    const validated = []
    const errors = []

    rows.forEach((row, idx) => {
      const rowNum = idx + 2
      const name = String(row['Student Name*'] || row['Student Name'] || row['name'] || '').trim()
      const className = String(row['Class Name*'] || row['Class Name'] || row['grade'] || '').trim()
      const sectionName = String(row['Section Name*'] || row['Section Name'] || row['section'] || '').trim()
      const gender = String(row['Gender (M/F/Other)*'] || row['Gender'] || row['gender'] || '').trim()
      const dob = String(row['Date of Birth (YYYY-MM-DD)*'] || row['Date of Birth'] || row['dob'] || '').trim()
      const phone = String(row['Student Phone*'] || row['Student Phone'] || row['phone'] || '').trim()
      const guardianName = String(row['Guardian Name*'] || row['Guardian Name'] || row['guardianName'] || '').trim()
      const guardianPhone = String(row['Guardian Phone*'] || row['Guardian Phone'] || row['guardianPhone'] || '').trim()
      const aadhar = String(row['Aadhar Number'] || row['aadhar'] || '').trim()
      const targetBranch = String(row['Branch ID'] || row['Target Branch ID'] || effectiveBranch).trim()

      const rowErrors = []
      if (!name) rowErrors.push('Missing Student Name')
      if (!className) rowErrors.push('Missing Class Name')
      if (!phone) rowErrors.push('Missing Student Phone')
      if (!guardianName) rowErrors.push('Missing Guardian Name')
      if (aadhar && aadhar.length !== 12) rowErrors.push('Aadhar must be 12 digits')

      const isValid = rowErrors.length === 0
      if (!isValid) {
        errors.push({ row: rowNum, name: name || 'Unnamed', errors: rowErrors })
      }

      validated.push({
        _rowNum: rowNum,
        _isValid: isValid,
        _errors: rowErrors,
        STU_NM: name,
        class_name: className,
        section_name: sectionName,
        STU_GENDER: gender || 'M',
        STU_DOB: dob,
        STU_CONTACTNO: phone,
        STU_EMAILID: String(row['Student Email'] || '').trim(),
        STU_AADHAR: aadhar,
        roll_number: String(row['Roll Number'] || '').trim(),
        STU_ADDRESS: String(row['Address'] || '').trim(),
        STU_CITY: String(row['City'] || '').trim(),
        STU_STATE: String(row['State'] || '').trim(),
        STU_PIN: String(row['Pincode'] || '').trim(),
        STU_COUNTRY: String(row['Country'] || 'India').trim(),
        guardianName,
        guardianPhone,
        guardianEmail: String(row['Guardian Email'] || '').trim(),
        relationWithGuardian: String(row['Relation With Guardian'] || 'Parent').trim(),
        branch_id: targetBranch
      })
    })

    setParsedRows(validated)
    setValidationErrors(errors)
  }

  // Filtered rows for preview
  const displayRows = useMemo(() => {
    if (filterMode === 'valid') return parsedRows.filter((r) => r._isValid)
    if (filterMode === 'invalid') return parsedRows.filter((r) => !r._isValid)
    return parsedRows
  }, [parsedRows, filterMode])

  // Submit to Backend API
  const handleSubmitUpload = async () => {
    if (!parsedRows || parsedRows.length === 0) {
      toast.warning('Please select and parse a file first.')
      return
    }

    if (!effectiveBranch && isSchoolAdmin) {
      toast.warning('Please choose a Target Branch before submitting.')
      return
    }

    setIsSubmitting(true)
    setUploadResult(null)

    try {
      const payload = {
        branch_id: effectiveBranch,
        students: parsedRows.map((r) => {
          const { _rowNum, _isValid, _errors, ...rest } = r
          return rest
        })
      }

      const res = await axios.post('/student/bulk-upload', payload)

      if (res.data?.success) {
        const resData = res.data.data
        setUploadResult(resData)
        toast.success(
          `Bulk Upload Completed! Successfully imported ${resData.successCount} of ${resData.totalProcessed} students.`
        )
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Bulk Enrol Students (Excel / CSV)"
      subtitle="Upload student spreadsheet with automatic parent linking and multi-tenant isolation"
      size="lg"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', width: '100%' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleClose}
          >
            {uploadResult ? 'Done' : 'Cancel'}
          </button>
          {!uploadResult && (
            <button
              type="button"
              className="btn-primary"
              disabled={isSubmitting || parsedRows.length === 0}
              onClick={handleSubmitUpload}
            >
              {isSubmitting ? (
                <>
                  <FaSpinner className="animate-spin" style={{ marginRight: '6px' }} /> Processing...
                </>
              ) : (
                <>
                  <FaUpload style={{ marginRight: '6px' }} /> Import {parsedRows.length} Students
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
              ? `You are importing students strictly into your assigned branch (${userBranchId}). Cross-branch entries will be securely rejected.`
              : 'As School Admin, you can choose the default branch for this sheet or specify branch IDs per row.'}
          </div>
        </div>

        {/* Branch Selection & Template Actions */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: '12px'
        }}>
          <div className="form-group" style={{ margin: 0, flex: '1 1 240px' }}>
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
                onChange={(e) => setSelectedBranch(e.target.value)}
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

          {/* Download Templates Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => handleDownloadTemplate('xlsx')}
              style={{ color: '#107c41', borderColor: 'rgba(16, 124, 65, 0.3)' }}
            >
              <FaFileExcel style={{ marginRight: '6px', color: '#107c41' }} /> Excel Template
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => handleDownloadTemplate('csv')}
            >
              <FaFileCsv style={{ marginRight: '6px', color: 'var(--clr-secondary)' }} /> CSV Template
            </button>
          </div>
        </div>

        {/* Existing Classes and Sections in this Branch (Helpful Reference) */}
        {branchClasses && branchClasses.length > 0 && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            background: 'rgba(0,0,0,0.02)',
            border: '1px solid rgba(0,0,0,0.08)',
            fontSize: '0.78rem'
          }}>
            <div style={{ fontWeight: 600, color: 'var(--clr-text-secondary)', marginBottom: '6px' }}>
              Classes in this Branch:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {branchClasses.map((cls, idx) => (
                <span
                  key={idx}
                  style={{
                    background: '#e0f2fe',
                    color: '#0369a1',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontWeight: 600,
                    fontSize: '0.74rem'
                  }}
                >
                  {cls.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Drag and Drop Upload Area */}
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
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: 'rgba(0, 90, 158, 0.1)',
              color: 'var(--clr-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              margin: '0 auto 12px auto'
            }}>
              <FaUpload />
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--clr-text-primary)', marginBottom: '4px' }}>
              Click to browse or drag and drop your spreadsheet here
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--clr-text-muted)' }}>
              Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv) up to 10MB
            </div>
          </div>
        ) : (
          <div style={{
            padding: '14px 18px',
            borderRadius: '10px',
            border: '1px solid var(--clr-glass-border)',
            background: 'rgba(255, 255, 255, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: file.name.endsWith('.csv') ? 'rgba(0, 120, 212, 0.15)' : 'rgba(16, 124, 65, 0.15)',
                color: file.name.endsWith('.csv') ? 'var(--clr-secondary)' : '#107c41',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>
                {file.name.endsWith('.csv') ? <FaFileCsv /> : <FaFileExcel />}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--clr-text-primary)' }}>{file.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)' }}>{(file.size / 1024).toFixed(1)} KB</div>
              </div>
            </div>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--clr-alert-red)' }}
              onClick={() => {
                setFile(null)
                setParsedRows([])
                setValidationErrors([])
                setUploadResult(null)
              }}
            >
              <FaTrashAlt style={{ marginRight: '5px' }} /> Remove
            </button>
          </div>
        )}

        {/* Live Validation Filter & Summary */}
        {parsedRows.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(0, 90, 158, 0.04)',
              border: '1px solid var(--clr-glass-border)'
            }}>
              <div style={{ display: 'flex', gap: '16px', fontSize: '0.82rem' }}>
                <span>Total Rows: <strong>{parsedRows.length}</strong></span>
                <span style={{ color: '#107c41', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FaCheckCircle /> Valid: <strong>{parsedRows.filter(r => r._isValid).length}</strong>
                </span>
                {validationErrors.length > 0 && (
                  <span style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FaExclamationTriangle /> Needs Attention: <strong>{validationErrors.length}</strong>
                  </span>
                )}
              </div>

              {/* Filter Tabs */}
              <div style={{ display: 'flex', gap: '4px', fontSize: '0.76rem' }}>
                <button
                  type="button"
                  className={filterMode === 'all' ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '4px 10px' }}
                  onClick={() => setFilterMode('all')}
                >
                  All ({parsedRows.length})
                </button>
                <button
                  type="button"
                  className={filterMode === 'valid' ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '4px 10px' }}
                  onClick={() => setFilterMode('valid')}
                >
                  Valid ({parsedRows.filter(r => r._isValid).length})
                </button>
                <button
                  type="button"
                  className={filterMode === 'invalid' ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '4px 10px' }}
                  onClick={() => setFilterMode('invalid')}
                >
                  Issues ({validationErrors.length})
                </button>
              </div>
            </div>

            {/* Validation Table Preview */}
            <div style={{
              border: '1px solid var(--clr-glass-border)',
              borderRadius: '8px',
              overflowX: 'auto',
              maxHeight: '260px',
              background: '#ffffff'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                <thead style={{
                  position: 'sticky',
                  top: 0,
                  background: 'var(--clr-neutral-base)',
                  borderBottom: '1px solid var(--clr-glass-border)'
                }}>
                  <tr>
                    <th style={{ padding: '8px 12px' }}>Row</th>
                    <th style={{ padding: '8px 12px' }}>Status</th>
                    <th style={{ padding: '8px 12px' }}>Student Name</th>
                    <th style={{ padding: '8px 12px' }}>Class / Section</th>
                    <th style={{ padding: '8px 12px' }}>Phone</th>
                    <th style={{ padding: '8px 12px' }}>Guardian</th>
                    <th style={{ padding: '8px 12px' }}>Issues / Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((r, i) => (
                    <tr
                      key={i}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: r._isValid ? 'transparent' : 'rgba(239, 68, 68, 0.05)'
                      }}
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
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{r.STU_NM || '-'}</td>
                      <td style={{ padding: '8px 12px' }}>{r.class_name} {r.section_name && `(${r.section_name})`}</td>
                      <td style={{ padding: '8px 12px' }}>{r.STU_CONTACTNO || '-'}</td>
                      <td style={{ padding: '8px 12px' }}>{r.guardianName || '-'}</td>
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

        {/* Server Response Summary */}
        {uploadResult && (
          <div style={{
            padding: '14px 18px',
            borderRadius: '8px',
            border: '1px solid rgba(16, 124, 65, 0.3)',
            background: 'rgba(16, 124, 65, 0.08)',
            fontSize: '0.82rem'
          }}>
            <div style={{ fontWeight: 700, color: '#107c41', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <FaCheckCircle /> Upload Finished
            </div>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '8px' }}>
              <span>Total Processed: <strong>{uploadResult.totalProcessed}</strong></span>
              <span style={{ color: '#107c41' }}>Successfully Enrolled: <strong>{uploadResult.successCount}</strong></span>
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
