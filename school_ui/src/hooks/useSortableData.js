import { useMemo, useState } from 'react'

/**
 * Click-to-sort for a table/list. Cycles asc -> desc -> unsorted on repeated
 * clicks of the same column, and defaults new columns to asc.
 *
 * @param {Array} items            the (already filtered) array to sort
 * @param {{key:string,direction:'asc'|'desc',accessor?:Function}|null} initialConfig
 * @returns {{
 *   sortedItems: Array,
 *   sortConfig: {key:string,direction:'asc'|'desc',accessor?:Function}|null,
 *   requestSort: (key: string, accessor?: Function) => void
 * }}
 */
export default function useSortableData(items, initialConfig = null) {
  const [sortConfig, setSortConfig] = useState(initialConfig)

  const sortedItems = useMemo(() => {
    if (!sortConfig) return items
    const { key, direction, accessor } = sortConfig
    const getValue = accessor || ((item) => item[key])

    return [...items].sort((a, b) => {
      let av = getValue(a)
      let bv = getValue(b)
      if (av == null) av = ''
      if (bv == null) bv = ''
      if (typeof av === 'string') av = av.toLowerCase()
      if (typeof bv === 'string') bv = bv.toLowerCase()

      if (av < bv) return direction === 'asc' ? -1 : 1
      if (av > bv) return direction === 'asc' ? 1 : -1
      return 0
    })
  }, [items, sortConfig])

  const requestSort = (key, accessor) => {
    setSortConfig((prev) => {
      if (prev && prev.key === key) {
        // asc -> desc -> unsorted
        if (prev.direction === 'asc') return { key, direction: 'desc', accessor }
        return null
      }
      return { key, direction: 'asc', accessor }
    })
  }

  return { sortedItems, sortConfig, requestSort }
}