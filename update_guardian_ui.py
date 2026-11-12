with open(r'c:\Users\Admin\Downloads\school_erp (1)\school_ui\src\pages\dashboards\GuardianDashboard.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_calc = """          const totalSessions = summary.reduce((acc, s) => acc + (s.totalSessions || 0), 0)
          const totalPresent = summary.reduce((acc, s) => acc + (s.presentSessions || 0), 0)
          const overallPercentage = totalSessions > 0
            ? Math.round((totalPresent * 100) / totalSessions)
            : (summary.length > 0 ? 100 : null)
          setOverallStats(overallPercentage !== null ? { overallPercentage } : null)"""

new_calc = """          const totalSessions = summary.reduce((acc, s) => acc + (s.totalSessions || 0), 0)
          const totalPresent = summary.reduce((acc, s) => acc + (s.presentSessions || 0), 0)
          const overallPercentage = totalSessions > 0
            ? Math.round((totalPresent * 100) / totalSessions)
            : (summary.length > 0 ? 0 : null)
          setOverallStats(overallPercentage !== null ? { overallPercentage } : null)"""

old_val = """              <div className="metric-value">
                {overallStats?.overallPercentage !== undefined ? `${overallStats.overallPercentage}%` : 'Recorded'}
              </div>"""

new_val = """              <div className="metric-value">
                {overallStats?.overallPercentage !== undefined ? `${overallStats.overallPercentage}%` : '0%'}
              </div>"""

text_norm = text.replace('\r\n', '\n')
old_calc_norm = old_calc.replace('\r\n', '\n')
new_calc_norm = new_calc.replace('\r\n', '\n')
old_val_norm = old_val.replace('\r\n', '\n')
new_val_norm = new_val.replace('\r\n', '\n')

assert old_calc_norm in text_norm, 'old_calc not found'
text_norm = text_norm.replace(old_calc_norm, new_calc_norm, 1)

assert old_val_norm in text_norm, 'old_val not found'
text_norm = text_norm.replace(old_val_norm, new_val_norm, 1)

with open(r'c:\Users\Admin\Downloads\school_erp (1)\school_ui\src\pages\dashboards\GuardianDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(text_norm)

print('GuardianDashboard.jsx updated successfully')

