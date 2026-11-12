/**
 * Empty-state placeholder for a table or list: icon, title, short subtitle,
 * and an optional CTA button. Render it as the sole row/child in place of
 * the normal rows when there's nothing to show.
 *
 * @param {React.ComponentType} icon    a react-icons component, e.g. FaUserFriends
 * @param {string} title                short heading, e.g. "No students found"
 * @param {string} subtitle             one line of supporting text
 * @param {string} [ctaLabel]           optional button label, e.g. "Add Student"
 * @param {Function} [onCtaClick]       optional button click handler
 */
export default function EmptyState({ icon: Icon, title, subtitle, ctaLabel, onCtaClick }) {
  return (
    <div className="empty-state">
      {Icon && <div className="empty-state-icon" aria-hidden="true"><Icon /></div>}
      <div className="empty-state-title">{title}</div>
      {subtitle && <div className="empty-state-subtitle">{subtitle}</div>}
      {ctaLabel && onCtaClick && (
        <button type="button" className="btn-primary empty-state-cta" onClick={onCtaClick}>
          {ctaLabel}
        </button>
      )}
    </div>
  )
}