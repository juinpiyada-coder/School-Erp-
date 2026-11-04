import { useEffect, useMemo, useState } from 'react'

/**
 * Client-side pagination for a table/list.
 *
 * @param {Array} items          the full (already filtered/sorted) array to paginate
 * @param {number} initialPageSize  rows-per-page to start with (default 10)
 * @returns {{
 *   pageItems: Array,       slice of `items` for the current page
 *   page: number,           current page (1-indexed)
 *   setPage: Function,
 *   pageSize: number,
 *   setPageSize: Function,  changing this resets to page 1
 *   totalPages: number,
 *   totalItems: number,
 *   startIndex: number,     1-indexed position of first row on this page (0 if empty)
 *   endIndex: number        1-indexed position of last row on this page
 * }}
 */
export default function usePagination(items, initialPageSize = 10) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)

  const totalItems = items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  // Keep page in range whenever the underlying data set, filter result,
  // or page size changes (e.g. a search narrows results to fewer pages).
  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [totalPages, page])

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, page, pageSize])

  const startIndex = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
  const endIndex = Math.min(page * pageSize, totalItems)

  return {
    pageItems,
    page,
    setPage,
    pageSize,
    setPageSize: (size) => { setPageSize(size); setPage(1) },
    totalPages,
    totalItems,
    startIndex,
    endIndex,
  }
}