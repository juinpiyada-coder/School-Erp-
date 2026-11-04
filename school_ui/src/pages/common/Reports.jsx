import { useState, useEffect } from 'react'
import axios from '../../lib/axios'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { FaUsers, FaChalkboardTeacher, FaBuilding, FaLayerGroup, FaDownload, FaPrint } from 'react-icons/fa'
import { CHART_PALETTE } from '../../lib/chartColors'
import { exportCsv } from '../../lib/exportCsv'
import { ApiErrorState } from '../../components/common/ErrorBoundary'

const COLORS = CHART_PALETTE;

export default function Reports() {
  const [overview, setOverview] = useState(null)
  const [studentsByBranch, setStudentsByBranch] = useState([])
  const [teachersByBranch, setTeachersByBranch] = useState([])
  const [branches, setBranches] = useState([])
  const [selectedBranch, setSelectedBranch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    fetchOverview()
  }, [selectedBranch])

  async function fetchInitialData() {
    try {
      setError('')
      const [studentsRes, teachersRes, branchesRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/reports/students-by-branch`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/reports/teachers-by-branch`),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/academic/branches`)
      ])

      setStudentsByBranch(studentsRes.data.data || [])
      setTeachersByBranch(teachersRes.data.data || [])
      
      const branchList = Array.isArray(branchesRes.data) ? branchesRes.data : branchesRes.data?.data || []
      setBranches(branchList)
    } catch (err) {
      console.error('Failed to load initial reports data', err)
      setError('Couldn\u2019t load report data from the server.')
    }
  }

  async function fetchOverview() {
    setLoading(true)
    try {
      setError('')
      const url = selectedBranch 
        ? `${import.meta.env.VITE_API_BASE_URL}/reports/overview?branch_id=${selectedBranch}`
        : `${import.meta.env.VITE_API_BASE_URL}/reports/overview`
        
      const overviewRes = await axios.get(url)
      setOverview(overviewRes.data.data)
    } catch (err) {
      console.error('Failed to load overview', err)
      setError('Couldn\u2019t load the report overview.')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    const rows = studentsByBranch.map((branch) => {
      const teacherData = teachersByBranch.find(t => t.name === branch.name)
      const teacherCount = teacherData ? parseInt(teacherData.value) : 0
      const studentCount = parseInt(branch.value)
      return {
        Branch: branch.name,
        'Total Students': studentCount,
        'Total Teachers': teacherCount,
        'Student:Teacher Ratio': teacherCount > 0 ? (studentCount / teacherCount).toFixed(1) : String(studentCount),
      }
    })
    exportCsv(rows, `branch-report${selectedBranch ? `-${selectedBranch}` : ''}.csv`)
  }

  if (loading && !overview) {
    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '300px' }}>
            <h3>Loading Reports...</h3>
        </div>
    )
  }

  if (error) {
    return <ApiErrorState message={error} onRetry={() => { fetchInitialData(); fetchOverview() }} />
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '20px' }}>
      <div className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">School Network Reports</h1>
          <p className="page-subtitle">Overview of enrollment and staff distribution</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }} className="no-print">
          <select 
            className="form-control"
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            style={{ width: '250px' }}
            aria-label="Filter reports by branch"
          >
            <option value="">All Branches</option>
            {branches.map(b => (
              <option key={b.SCHL_BR_ID || b.schl_br_id} value={b.SCHL_BR_ID || b.schl_br_id}>
                {b.SCHL_BR_NM || b.schl_br_nm}
              </option>
            ))}
          </select>
          <button type="button" className="btn-secondary" onClick={handleExport} disabled={studentsByBranch.length === 0}>
            <FaDownload /> Export CSV
          </button>
          <button type="button" className="btn-secondary" onClick={() => window.print()}>
            <FaPrint /> Print
          </button>
        </div>
      </div>

      {/* Print-only header with report metadata */}
      <div className="print-only print-report-title">School Network Reports</div>
      <div className="print-only print-report-subtitle">
        Enrollment and staff distribution overview
      </div>
      <div className="print-only print-meta">
        <span><strong>Generated:</strong> {new Date().toLocaleString()}</span>
        <span><strong>Branch filter:</strong> {selectedBranch ? (branches.find(b => String(b.SCHL_BR_ID || b.schl_br_id) === String(selectedBranch))?.SCHL_BR_NM || selectedBranch) : 'All Branches'}</span>
      </div>

      {/* Summary Metrics */}
      <div className="grid-auto-md" style={{ gap: '20px', marginBottom: '24px' }}>
        <div className="glass-panel metric-card" style={{ display: 'flex', alignItems: 'center', padding: '20px' }}>
          <div style={{ background: 'rgba(52, 152, 219, 0.1)', color: '#3498db', padding: '15px', borderRadius: '50%', marginRight: '15px', display: 'flex' }}>
            <FaUsers size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: '#666', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Students</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{overview?.total_students || 0}</div>
          </div>
        </div>
        
        <div className="glass-panel metric-card" style={{ display: 'flex', alignItems: 'center', padding: '20px' }}>
          <div style={{ background: 'rgba(46, 204, 113, 0.1)', color: '#2ecc71', padding: '15px', borderRadius: '50%', marginRight: '15px', display: 'flex' }}>
            <FaChalkboardTeacher size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: '#666', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Teachers</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{overview?.total_teachers || 0}</div>
          </div>
        </div>

        <div className="glass-panel metric-card" style={{ display: 'flex', alignItems: 'center', padding: '20px' }}>
          <div style={{ background: 'rgba(155, 89, 182, 0.1)', color: '#9b59b6', padding: '15px', borderRadius: '50%', marginRight: '15px', display: 'flex' }}>
            <FaBuilding size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: '#666', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Branches</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{overview?.total_branches || 0}</div>
          </div>
        </div>

        <div className="glass-panel metric-card" style={{ display: 'flex', alignItems: 'center', padding: '20px' }}>
          <div style={{ background: 'rgba(230, 126, 34, 0.1)', color: '#e67e22', padding: '15px', borderRadius: '50%', marginRight: '15px', display: 'flex' }}>
            <FaLayerGroup size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: '#666', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Classes</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{overview?.total_classes || 0}</div>
          </div>
        </div>
      </div>

      <div className="grid-auto-xl" style={{ gap: '24px', marginBottom: '24px' }}>
        {/* Student Enrollment Chart */}
        <div className="glass-panel page-card">
          <h3 style={{ fontWeight: 'bold', marginBottom: '16px', color: 'var(--clr-primary, #005a9e)' }}>Student Enrollment by Branch</h3>
          <div style={{ height: 320, width: '100%' }}>
            {studentsByBranch.filter(b => Number(b.value) > 0).length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={studentsByBranch.filter(b => Number(b.value) > 0)} margin={{ top: 20, right: 20, left: -10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0, 90, 158, 0.08)" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: 'var(--clr-text-secondary, #475569)', fontSize: 11 }} 
                    angle={-25}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis 
                    allowDecimals={false}
                    tick={{ fill: 'var(--clr-text-muted, #64748b)', fontSize: 11 }} 
                  />
                  <RechartsTooltip 
                    cursor={{ fill: 'rgba(0, 90, 158, 0.04)' }} 
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', color: '#0f172a', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} 
                  />
                  <Bar dataKey="value" fill="#005a9e" radius={[4, 4, 0, 0]} name="Students" maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--clr-text-muted)', fontSize: '0.88rem' }}>No student enrollment data registered yet</div>
            )}
          </div>
        </div>

        {/* Teacher Distribution Chart */}
        <div className="glass-panel page-card">
          <h3 style={{ fontWeight: 'bold', marginBottom: '16px', color: 'var(--clr-primary, #005a9e)' }}>Teacher Distribution by Branch</h3>
          <div style={{ height: 320, width: '100%' }}>
            {teachersByBranch.filter(t => Number(t.value) > 0).length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={teachersByBranch.filter(t => Number(t.value) > 0).map(t => ({ ...t, value: Number(t.value) }))}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                    nameKey="name"
                  >
                    {teachersByBranch.filter(t => Number(t.value) > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', color: '#0f172a', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} 
                  />
                  <Legend verticalAlign="bottom" height={40} iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--clr-text-muted)', fontSize: '0.88rem' }}>No teacher distribution data registered yet</div>
            )}
          </div>
        </div>
      </div>
      
      {/* Detailed Table */}
      <div className="glass-panel">
        <div style={{ padding: '20px' }}>
          <h3 style={{ fontWeight: 'bold', marginBottom: '16px', color: 'var(--color-primary)' }}>Branch Detailed Report</h3>
          <div className="table-container">
            <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>Branch Name</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>Total Students</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>Total Teachers</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>Student:Teacher Ratio</th>
                </tr>
              </thead>
              <tbody>
                {studentsByBranch.map((branch, i) => {
                  const teacherData = teachersByBranch.find(t => t.name === branch.name);
                  const teacherCount = teacherData ? parseInt(teacherData.value) : 0;
                  const studentCount = parseInt(branch.value);
                  const ratio = teacherCount > 0 ? (studentCount / teacherCount).toFixed(1) : studentCount;
                  
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{branch.name}</td>
                      <td style={{ padding: '12px' }}>{studentCount}</td>
                      <td style={{ padding: '12px' }}>{teacherCount}</td>
                      <td style={{ padding: '12px' }}>
                        <span className={`badge ${ratio > 30 ? 'badge-danger' : 'badge-success'}`}>
                          {ratio}:1
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
