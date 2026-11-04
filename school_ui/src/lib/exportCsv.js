/**
 * Client-side CSV export. Builds a Blob from an array of objects and triggers
 * a download. Returns the number of rows written (0 when the list is empty).
 *
 * @param {Array<Object>} rows    array of flat objects
 * @param {string} filename       e.g. "students.csv"
 * @param {Object<string,string>} [columnMap]  displayName -> row key, e.g. {"Name":"name"}
 */
export function exportCsv(rows, filename, columnMap) {
  const keys = columnMap ? Object.values(columnMap) : rows.length ? Object.keys(rows[0]) : []
  const headers = columnMap ? Object.keys(columnMap) : keys

  const escape = (val) => {
    const str = val == null ? '' : String(val)
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`
    return str
  }

  const lines = [
    headers.map(escape).join(','),
    ...rows.map((row) => keys.map((k) => escape(row[k])).join(',')),
  ]

  if (rows.length === 0) return 0

  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  return rows.length
}
