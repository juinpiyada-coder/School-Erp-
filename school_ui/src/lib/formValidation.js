/**
 * Scrolls to and focuses the first invalid field after a failed form
 * submission, so the user immediately lands on what needs fixing instead
 * of hunting through the form for a red-bordered input.
 *
 * @param {Object} errors     the errors object just computed (key -> message)
 * @param {Object} fieldRefs  a ref map of { [fieldName]: HTMLElement | null },
 *                            e.g. a `useRef({})` populated via
 *                            `ref={(el) => (fieldRefs.current.name = el)}`
 * @param {string[]} [order]  optional field order to check first (matches
 *                            validation order); falls back to the errors
 *                            object's own key order
 */
export function scrollToFirstError(errors, fieldRefs, order) {
  const keys = order && order.length ? order.filter((k) => errors[k]) : Object.keys(errors)
  const firstKey = keys[0]
  if (!firstKey) return

  const el = fieldRefs?.[firstKey]
  if (!el) return

  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  // Delay the focus slightly so it lands after the scroll starts, not before.
  window.setTimeout(() => el.focus?.(), 250)
}