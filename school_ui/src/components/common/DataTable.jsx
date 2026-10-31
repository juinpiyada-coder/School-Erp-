import { motion } from 'framer-motion'
import { FaDownload } from 'react-icons/fa'
import Pagination from './Pagination'
import SortableTh from './SortableTh'
import TableSkeleton from './TableSkeleton'
import EmptyState from '../EmptyState'
import { exportCsv } from '../../lib/exportCsv'

/**
 * Reusable data table that wires together sortable headers, loading skeletons,
 * an empty-state placeholder, pagination, and CSV export — so list pages don't
 * keep duplicating the same table scaffolding.
 *
 * @param {Array} columns       [{ label, sortKey?, accessor?, exportKey?, render?(row), className? }]
 * @param {Array} rows          already-filtered array
 * @param {boolean} loading
 * @param {string} search       current search text (for empty-state messaging)
 * @param {Function} [onClearSearch]
 * @param {string} [emptyTitle]        when rows empty and no search
 * @param {string} [emptySubtitle]
 * @param {string} [emptyCtaLabel]
 * @param {Function} [onEmptyCta]
 * @param {string} [emptyIcon]         a react-icons component
 * @param {object} [emptyIconProps]
 * @param {string} [exportFilename]
 * @param {object} [exportColumnMap]   displayName -> key
 * @param {string} [itemLabel]         "students", "teachers", ...
 * @param {Array} [actions]            [{ label, icon, onClick(row), title?, disabled?(row) }]
 * @param {object} [pagination]        spread from usePagination: { page, totalPages, totalItems, startIndex, endIndex, pageSize, setPage, setPageSize }
 */
export default function DataTable({
  columns,
  rows,
  loading,
  search = '',
  onClearSearch,
  emptyTitle = 'No records yet',
  emptySubtitle = 'Nothing to show here yet.',
  emptyCtaLabel,
  onEmptyCta,
  emptyIcon,
  exportFilename,
  exportColumnMap,
  itemLabel = 'records',
  actions = [],
  pagination,
  sortConfig,
  requestSort,
}) {
  const colCount = columns.length + (actions.length ? 1 : 0)

  const handleExport = () => {
    const map = exportColumnMap || Object.fromEntries(columns.filter(c => c.exportKey).map(c => [c.label, c.exportKey]))
    exportCsv(rows, exportFilename || `${itemLabel}.csv`, Object.keys(map).length ? map : undefined)
  }

  return (
    <motion.div
      className="glass-panel page-card"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="table-container" tabIndex={0} aria-label={`${itemLabel} table (scroll horizontally if needed)`}>
        <table className="data-table data-table-card" aria-label={`${itemLabel} table`}>
          <thead>
            <tr>
              {columns.map((col) =>
                col.sortKey ? (
                  <SortableTh
                    key={col.label}
                    label={col.label}
                    sortKey={col.sortKey}
                    accessor={col.accessor}
                    sortConfig={sortConfig}
                    onSort={requestSort}
                    style={col.style}
                  />
                ) : (
                  <th key={col.label} scope="col" style={col.style}>{col.label}</th>
                )
              )}
              {actions.length > 0 && <th scope="col">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton columns={colCount} rows={6} />
            ) : (
              <>
                {rows.map((row, i) => (
                  <tr key={row.id ?? i}>
                    {columns.map((col) => (
                      <td key={col.label} className={col.className} style={col.style} data-label={col.label}>
                        {col.render ? col.render(row, i) : row[col.exportKey ?? col.sortKey ?? col.key] ?? 'N/A'}
                      </td>
                    ))}
                    {actions.length > 0 && (
                      <td data-label="Actions" className="data-table-actions">
                        <div className="flex gap-sm">
                          {actions.map((action) => (
                            <button
                              key={action.label}
                              type="button"
                              className="btn-icon"
                              aria-label={action.ariaLabel?.(row) ?? `${action.label} ${row.name || row.id || ''}`}
                              title={action.title?.(row) ?? action.label}
                              onClick={() => action.onClick(row)}
                              disabled={action.disabled?.(row)}
                            >
                              {action.icon}
                            </button>
                          ))}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={colCount} className="data-table-empty">
                      {search ? (
                        <EmptyState
                          icon={emptyIcon}
                          title={emptyTitle}
                          subtitle={`No ${itemLabel} match "${search}". Try a different search term.`}
                          ctaLabel="Clear search"
                          onCtaClick={onClearSearch}
                        />
                      ) : (
                        <EmptyState
                          icon={emptyIcon}
                          title={emptyTitle}
                          subtitle={emptySubtitle}
                          ctaLabel={emptyCtaLabel}
                          onCtaClick={onEmptyCta}
                        />
                      )}
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          startIndex={pagination.startIndex}
          endIndex={pagination.endIndex}
          pageSize={pagination.pageSize}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
          itemLabel={itemLabel}
        />
      )}

      {exportFilename && (
        <div className="table-toolbar-footer">
          <button type="button" className="btn-secondary" onClick={handleExport} disabled={rows.length === 0}>
            <FaDownload /> Export CSV
          </button>
        </div>
      )}
    </motion.div>
  )
}
