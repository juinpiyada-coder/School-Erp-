/**
 * Renders placeholder <tr> rows with shimmering bars, sized to match a
 * data-table's column count. Drop inside a <tbody> while `loading` is true
 * so the header (and any sticky toolbar above it) stays visible instead of
 * the whole table flashing to a blank spinner screen.
 *
 * @param {number} columns  how many <td> cells per row (match your <thead>)
 * @param {number} rows     how many skeleton rows to show (default 5)
 */
export default function TableSkeleton({ columns, rows = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={`skeleton-row-${r}`} aria-hidden="true">
          {Array.from({ length: columns }).map((__, c) => (
            <td key={`skeleton-cell-${r}-${c}`}>
              <span
                className="skeleton-bar"
                style={{
                  // vary widths a little so rows don't look like a solid block
                  width: c === 0 ? '80%' : `${55 + ((r * 13 + c * 19) % 35)}%`,
                  animationDelay: `${(r * 0.06).toFixed(2)}s`,
                }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}