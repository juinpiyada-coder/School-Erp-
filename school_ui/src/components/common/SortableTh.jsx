import { FaSort, FaSortUp, FaSortDown } from 'react-icons/fa'

/**
 * A <th> that toggles sorting on click. Pair with the `useSortableData` hook —
 * pass its `sortConfig` and `requestSort` straight through.
 *
 * `sortKey` should match the property the row objects expose for that column.
 * For columns whose displayed value isn't a plain property (e.g. a computed
 * label), pass an `accessor` function instead: (row) => comparableValue.
 */
export default function SortableTh({ label, sortKey, accessor, sortConfig, onSort, style, ...props }) {
  const isActive = sortConfig?.key === sortKey
  const direction = isActive ? sortConfig.direction : null

  return (
    <th scope="col" style={style} {...props}>
      <button
        type="button"
        onClick={() => onSort(sortKey, accessor)}
        aria-label={`Sort by ${label}${direction ? `, currently ${direction === 'asc' ? 'ascending' : 'descending'}` : ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'none',
          border: 'none',
          padding: 0,
          font: 'inherit',
          fontWeight: 'inherit',
          color: 'inherit',
          cursor: 'pointer',
        }}
      >
        {label}
        {direction === 'asc' ? (
          <FaSortUp aria-hidden="true" />
        ) : direction === 'desc' ? (
          <FaSortDown aria-hidden="true" />
        ) : (
          <FaSort aria-hidden="true" style={{ opacity: 0.35 }} />
        )}
      </button>
    </th>
  )
}