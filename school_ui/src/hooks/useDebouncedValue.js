import { useEffect, useState } from 'react'

/**
 * Returns a debounced copy of `value` that only updates after `delay` ms
 * have passed without `value` changing. Used to avoid re-filtering large
 * tables (Students, Teachers, Parents, ...) on every keystroke.
 *
 * @param {*} value   the live, fast-changing value (e.g. a search string)
 * @param {number} delay  debounce delay in ms (default 300)
 */
export default function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}