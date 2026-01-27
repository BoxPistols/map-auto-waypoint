/**
 * MapTooltip Component
 * Tooltip for displaying information on hover over map features
 */

import { useEffect, useState, useRef } from 'react'
import { formatDateToJST } from '../../utils/formatters'
import styles from './MapTooltip.module.scss'

/**
 * MapTooltip Component
 * @param {Object} props
 * @param {boolean} props.isVisible - Whether tooltip is visible
 * @param {Object} props.position - { x, y } position for tooltip
 * @param {Object} props.data - Data to display in tooltip
 * @param {string} props.type - 'waypoint' or 'polygon'
 */
export const MapTooltip = ({ isVisible, position, data, type }) => {
  const tooltipRef = useRef(null)
  const [adjustedPosition, setAdjustedPosition] = useState(position)

  useEffect(() => {
    if (!isVisible || !tooltipRef.current || !position) return

    // Adjust position to keep tooltip in viewport
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

    // Check left boundary
    if (x < MARGIN) {
      x = MARGIN
    }

    // Check top boundary
    if (y < MARGIN) {
      y = MARGIN
    }

    setAdjustedPosition({ x, y })
  }, [isVisible, position])

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
              <span className={styles.icon}>📍</span>
              <span className={styles.title}>WP #{data.index}</span>
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
              <span className={styles.icon}>🗺️</span>
              <span className={styles.title}>{data.name}</span>
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
