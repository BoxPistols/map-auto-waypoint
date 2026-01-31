/**
 * MapTooltip Component
 * Tooltip for displaying information on hover over map features
 */

import { useState, useRef, useLayoutEffect, useEffect } from 'react'
import { X } from 'lucide-react'
import { formatDateToJST } from '../../utils/formatters'
import styles from './MapTooltip.module.scss'

/**
 * MapTooltip Component
 * @param {Object} props
 * @param {boolean} props.isVisible - Whether tooltip is visible
 * @param {Object} props.position - { x, y } position for tooltip
 * @param {Object} props.data - Data to display in tooltip
 * @param {string} props.type - 'waypoint' or 'polygon'
 * @param {Function} props.onClose - Callback to close tooltip
 */
export const MapTooltip = ({ isVisible, position, data, type, onClose }) => {
  const tooltipRef = useRef(null)
  const [adjustedPosition, setAdjustedPosition] = useState(position)

  // ESCキーで閉じる
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        if (onClose) {
          onClose()
        }
      }
    }

    if (isVisible) {
      window.addEventListener('keydown', handleKeyDown, true) // capture phase
      return () => {
        window.removeEventListener('keydown', handleKeyDown, true)
      }
    }
  }, [isVisible, onClose])

  // Calculate and update position after DOM mount to ensure tooltip stays in viewport
  useLayoutEffect(() => {
    if (tooltipRef.current && position) {
      const rect = tooltipRef.current.getBoundingClientRect()
      const MARGIN = 10
      const OFFSET_X = 15
      const OFFSET_Y = 15

      let x = position.x + OFFSET_X
      let y = position.y + OFFSET_Y

      // Check right boundary
      if (x + rect.width > window.innerWidth - MARGIN) {
        x = position.x - rect.width - OFFSET_X
      }

      // Check bottom boundary
      if (y + rect.height > window.innerHeight - MARGIN) {
        y = position.y - rect.height - OFFSET_Y
      }

      // Check left boundary after right adjustment
      if (x < MARGIN) {
        x = position.x + OFFSET_X
        if (x + rect.width > window.innerWidth - MARGIN) {
          x = Math.max(MARGIN, window.innerWidth - rect.width - MARGIN)
        }
      }

      // Check top boundary after bottom adjustment
      if (y < MARGIN) {
        y = position.y + OFFSET_Y
        if (y + rect.height > window.innerHeight - MARGIN) {
          y = Math.max(MARGIN, window.innerHeight - rect.height - MARGIN)
        }
      }

      setAdjustedPosition({ x, y })
    }
  }, [position, isVisible])

  if (!isVisible || !data) return null

  return (
    <div
      ref={tooltipRef}
      className={styles.tooltip}
      style={{
        position: 'fixed',
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
        zIndex: 9999
      }}
    >
      <div className={styles.content}>
        {type === 'waypoint' && (
          <>
            <div className={styles.header}>
              <div className={styles.headerLeft}>
                <span className={styles.icon}>📍</span>
                <span className={styles.title}>WP #{data.index}</span>
              </div>
              {onClose && (
                <div className={styles.headerActions}>
                  <kbd className={styles.escHint}>ESC</kbd>
                  <button
                    className={styles.closeButton}
                    onClick={onClose}
                    aria-label="閉じる (ESCキー)"
                    title="閉じる (ESCキー)"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
            {data.polygonName && (
              <div className={styles.row}>
                <span className={styles.label}>エリア:</span>
                <span className={styles.value}>{data.polygonName}</span>
              </div>
            )}
            <div className={styles.row}>
              <span className={styles.label}>座標:</span>
              <span className={styles.value}>
                {data.lat?.toFixed(6)}, {data.lng?.toFixed(6)}
              </span>
            </div>
            {data.elevation !== undefined && data.elevation !== null && (
              <div className={styles.row}>
                <span className={styles.label}>標高:</span>
                <span className={styles.value}>{data.elevation}m</span>
              </div>
            )}
            {Array.isArray(data.airspaceRestrictions) && data.airspaceRestrictions.length > 0 && (
              <div className={styles.row}>
                <span className={styles.label}>飛行制限:</span>
                <span className={styles.value}>
                  {data.airspaceRestrictions.map((r, idx) => (
                    r && (
                      <span
                        key={idx}
                        style={{
                          color: r.color || '#10b981',
                          fontWeight: r.type !== 'NORMAL' ? '600' : '400',
                          marginRight: idx < data.airspaceRestrictions.length - 1 ? '4px' : '0'
                        }}
                      >
                        {r.icon || ''} {r.label || '不明'}
                        {idx < data.airspaceRestrictions.length - 1 && ', '}
                      </span>
                    )
                  ))}
                </span>
              </div>
            )}
            {data.createdAt && (
              <div className={styles.row}>
                <span className={styles.label}>作成:</span>
                <span className={styles.value}>{formatDateToJST(data.createdAt)}</span>
              </div>
            )}
          </>
        )}

        {type === 'polygon' && (
          <>
            <div className={styles.header}>
              <div className={styles.headerLeft}>
                <span className={styles.icon}>🗺️</span>
                <span className={styles.title}>{data.name}</span>
              </div>
              {onClose && (
                <div className={styles.headerActions}>
                  <kbd className={styles.escHint}>ESC</kbd>
                  <button
                    className={styles.closeButton}
                    onClick={onClose}
                    aria-label="閉じる (ESCキー)"
                    title="閉じる (ESCキー)"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
            {data.waypointCount !== undefined && (
              <div className={styles.row}>
                <span className={styles.label}>Waypoint数:</span>
                <span className={styles.value}>{data.waypointCount}個</span>
              </div>
            )}
            {data.area !== undefined && (
              <div className={styles.row}>
                <span className={styles.label}>面積:</span>
                <span className={styles.value}>{data.area.toFixed(2)} m²</span>
              </div>
            )}
            {data.createdAt && (
              <div className={styles.row}>
                <span className={styles.label}>作成:</span>
                <span className={styles.value}>{formatDateToJST(data.createdAt)}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default MapTooltip
