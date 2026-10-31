import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

/**
 * Table footer: "Showing X-Y of Z" + rows-per-page selector + prev/next paging.
 * Pair with the `usePagination` hook.
 */
export default function Pagination({
  page,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  itemLabel = 'items',
}) {
  if (totalItems === 0) return null

  return (
    <div
      className="flex items-center justify-between"
      style={{ marginTop: 'var(--sp-md)', paddingTop: 'var(--sp-md)', borderTop: '1px solid rgba(0,90,158,0.08)', flexWrap: 'wrap', gap: 'var(--sp-sm)' }}
    >
      <span className="text-muted" style={{ fontSize: '0.82rem' }}>
        Showing <strong style={{ color: 'var(--clr-text-primary)' }}>{startIndex}-{endIndex}</strong> of{' '}
        <strong style={{ color: 'var(--clr-text-primary)' }}>{totalItems}</strong> {itemLabel}
      </span>

      <div className="flex items-center gap-md" style={{ flexWrap: 'wrap' }}>
        <label className="flex items-center gap-sm" style={{ fontSize: '0.82rem', color: 'var(--clr-text-muted)' }}>
          Rows per page
          <select
            className="form-input"
            style={{ padding: '4px 8px', fontSize: '0.82rem', width: 'auto' }}
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            aria-label="Rows per page"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </label>

        <span className="text-muted" style={{ fontSize: '0.82rem' }}>
          Page <strong style={{ color: 'var(--clr-text-primary)' }}>{page}</strong> of{' '}
          <strong style={{ color: 'var(--clr-text-primary)' }}>{totalPages}</strong>
        </span>

        <div className="flex gap-sm">
          <button
            type="button"
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            disabled={page === 1}
            onClick={() => onPageChange(page - 1)}
          ><FaChevronLeft /> Prev</button>
          <button
            type="button"
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            disabled={page === totalPages}
            onClick={() => onPageChange(page + 1)}
          >Next <FaChevronRight /></button>
        </div>
      </div>
    </div>
  )
}