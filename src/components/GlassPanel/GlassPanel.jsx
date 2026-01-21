/**
 * GlassPanel Component
 * Reusable glassmorphism panel base for all UI panels
 * Provides consistent styling and behavior across the application
 */

import { useEffect } from 'react'
import PropTypes from 'prop-types'
import styles from './GlassPanel.module.scss'

/**
 * Glassmorphism Panel Component
 *
 * @example
 * ```jsx
 * <GlassPanel
 *   title="Map Information"
 *   onClose={() => setIsOpen(false)}
 *   width="360px"
 *   bottom={20}
 *   right={20}
 *   footer={<p>Data is stored locally</p>}
 * >
 *   <div>Panel content here</div>
 * </GlassPanel>
 * ```
 */
export const GlassPanel = ({
  title,
  children,
  onClose,
  width = 'auto',
  maxHeight = '80vh',
  bottom = 20,
  right = 20,
  left,
  top,
  footer,
  className,
  style,
  headerActions
}) => {
  const parseSize = (value) => {
    if (typeof value === 'number') return `${value}px`
    return String(value)
  }

  // ESCキーで閉じる
  useEffect(() => {
    if (!onClose) return

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const positionStyle = {}
  if (bottom !== undefined) positionStyle.bottom = parseSize(bottom)
  if (right !== undefined) positionStyle.right = parseSize(right)
  if (left !== undefined) positionStyle.left = parseSize(left)
  if (top !== undefined) positionStyle.top = parseSize(top)

  return (
    <div
      className={`${styles.container} ${className || ''}`}
      style={{
        width: parseSize(width),
        maxHeight: parseSize(maxHeight),
        ...positionStyle,
        ...style
      }}
    >
      {/* Header */}
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {headerActions}
          {onClose && (
            <button
              onClick={onClose}
              className={styles.closeButton}
              aria-label="閉じる (Escキーでも閉じられます)"
            >
              ×
              <span className={styles.tooltip}>Esc</span>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>{children}</div>

      {/* Footer */}
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  )
}

GlassPanel.propTypes = {
  /** Panel title */
  title: PropTypes.string.isRequired,
  /** Panel content */
  children: PropTypes.node.isRequired,
  /** Callback when close button is clicked */
  onClose: PropTypes.func,
  /** Panel width (default: auto) */
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  /** Panel max height (default: 80vh) */
  maxHeight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  /** Position from bottom (default: 20px) */
  bottom: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  /** Position from right (default: 20px) */
  right: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  /** Position from left */
  left: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  /** Position from top */
  top: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  /** Footer content (optional) */
  footer: PropTypes.node,
  /** Additional CSS class */
  className: PropTypes.string,
  /** Additional inline styles */
  style: PropTypes.object,
  /** Custom header actions (appears before close button) */
  headerActions: PropTypes.node
}

export default GlassPanel
