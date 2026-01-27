/**
 * Vertex List Modal Component
 * Display polygon vertices with WP numbers and coordinates
 */

import { useCallback, useState, useEffect, useRef } from 'react'
import { X, Copy, CheckCircle } from 'lucide-react'
import { extractPolygonCoordinates } from '../../utils/geometry'
import styles from './VertexListModal.module.scss'

const VertexListModal = ({ polygon, onClose }) => {
  const [copiedIndex, setCopiedIndex] = useState(null)
  const [allCopied, setAllCopied] = useState(false)
  const timeoutIdRef = useRef(null)

  if (!polygon) return null

  // Extract coordinates from GeoJSON geometry
  const coordinates = extractPolygonCoordinates(polygon.geometry)

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current)
      }
    }
  }, [])

  // Copy single coordinate
  const handleCopyCoordinate = useCallback((coord, index) => {
    const coordStr = `${coord.lat.toFixed(6)}, ${coord.lng.toFixed(6)}`
    
    navigator.clipboard.writeText(coordStr)
      .then(() => {
        setCopiedIndex(index)
        if (timeoutIdRef.current) {
          clearTimeout(timeoutIdRef.current)
        }
        timeoutIdRef.current = setTimeout(() => {
          setCopiedIndex(null)
          timeoutIdRef.current = null
        }, 2000)
      })
      .catch((err) => {
        console.error('Failed to copy coordinate:', err)
      })
  }, [])

  // Copy all coordinates
  const handleCopyAll = useCallback(() => {
    const coordsText = coordinates
      .map((coord, idx) => `WP #${idx + 1}: ${coord.lat.toFixed(6)}, ${coord.lng.toFixed(6)}`)
      .join('\n')
    
    navigator.clipboard.writeText(coordsText)
      .then(() => {
        setAllCopied(true)
        if (timeoutIdRef.current) {
          clearTimeout(timeoutIdRef.current)
        }
        timeoutIdRef.current = setTimeout(() => {
          setAllCopied(false)
          timeoutIdRef.current = null
        }, 2000)
      })
      .catch((err) => {
        console.error('Failed to copy all coordinates:', err)
      })
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
                  {coord.lat.toFixed(6)}, {coord.lng.toFixed(6)}
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
