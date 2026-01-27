/**
 * Vertex List Modal Component
 * Display polygon vertices with WP numbers and coordinates
 */

import { useCallback, useState, useEffect, useRef } from 'react'
import { X, Copy, CheckCircle } from 'lucide-react'
import { copyToClipboard, formatDecimalCoordinate } from '../../utils/formatters'
import styles from './VertexListModal.module.scss'

const VertexListModal = ({ polygon, onClose }) => {
  const [copiedIndex, setCopiedIndex] = useState(null)
  const [allCopied, setAllCopied] = useState(false)
  const copyTimeoutRef = useRef(null)
  const allCopyTimeoutRef = useRef(null)

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current)
      }
      if (allCopyTimeoutRef.current) {
        clearTimeout(allCopyTimeoutRef.current)
      }
    }
  }, [])

  if (!polygon) return null

  // Extract coordinates from GeoJSON geometry
  // For Polygon geometry: coordinates[0] is the outer ring
  let coordinates = []
  if (polygon.geometry && polygon.geometry.type === 'Polygon' && polygon.geometry.coordinates) {
    const ring = polygon.geometry.coordinates[0]
    // Convert [lng, lat] to { lat, lng } and exclude the last point (which duplicates the first)
    coordinates = ring.slice(0, -1).map(([lng, lat]) => ({ lat, lng }))
  }

  // Copy single coordinate
  const handleCopyCoordinate = useCallback((coord, index) => {
    const coordStr = formatDecimalCoordinate(coord.lat, coord.lng)
    const success = copyToClipboard(coordStr)

    if (success) {
      setCopiedIndex(index)
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current)
      }
      copyTimeoutRef.current = setTimeout(() => setCopiedIndex(null), 2000)
    }
  }, [])

  // Copy all coordinates
  const handleCopyAll = useCallback(() => {
    const coordsText = coordinates
      .map((coord, idx) => `WP #${idx + 1}: ${formatDecimalCoordinate(coord.lat, coord.lng)}`)
      .join('\n')
    const success = copyToClipboard(coordsText)

    if (success) {
      setAllCopied(true)
      if (allCopyTimeoutRef.current) {
        clearTimeout(allCopyTimeoutRef.current)
      }
      allCopyTimeoutRef.current = setTimeout(() => setAllCopied(false), 2000)
    }
  }, [coordinates])

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h3 className={styles.title}>
            {polygon.name} - Waypoint頂点一覧
          </h3>
          <button 
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="閉じる"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          <div className={styles.info}>
            <span>頂点数: {coordinates.length}個</span>
          </div>

          <div className={styles.vertexList}>
            {coordinates.map((coord, index) => (
              <div key={index} className={styles.vertexItem}>
                <div className={styles.vertexNumber}>WP #{index + 1}</div>
                <div className={styles.coordinates}>
                  {formatDecimalCoordinate(coord.lat, coord.lng)}
                </div>
                <button
                  className={styles.copyBtn}
                  onClick={() => handleCopyCoordinate(coord, index)}
                  title="座標をコピー"
                >
                  {copiedIndex === index ? (
                    <CheckCircle size={16} className={styles.checkIcon} />
                  ) : (
                    <Copy size={16} />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button 
            className={styles.copyAllBtn}
            onClick={handleCopyAll}
          >
            {allCopied ? (
              <>
                <CheckCircle size={18} />
                コピー済み
              </>
            ) : (
              <>
                <Copy size={18} />
                全座標をコピー
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default VertexListModal
