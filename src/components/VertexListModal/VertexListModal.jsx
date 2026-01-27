/**
 * Vertex List Modal Component
 * Display polygon vertices with WP numbers and coordinates
 */

import { useCallback } from 'react'
import { X, Copy, CheckCircle } from 'lucide-react'
import { useState } from 'react'
import styles from './VertexListModal.module.scss'

const VertexListModal = ({ polygon, onClose }) => {
  const [copiedIndex, setCopiedIndex] = useState(null)
  const [allCopied, setAllCopied] = useState(false)

  if (!polygon) return null

  const coordinates = polygon.coordinates || []

  // Copy single coordinate
  const handleCopyCoordinate = useCallback((coord, index) => {
    const coordStr = `${coord.lat.toFixed(6)}, ${coord.lng.toFixed(6)}`
    navigator.clipboard.writeText(coordStr)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }, [])

  // Copy all coordinates
  const handleCopyAll = useCallback(() => {
    const coordsText = coordinates
      .map((coord, idx) => `WP #${idx + 1}: ${coord.lat.toFixed(6)}, ${coord.lng.toFixed(6)}`)
      .join('\n')
    navigator.clipboard.writeText(coordsText)
    setAllCopied(true)
    setTimeout(() => setAllCopied(false), 2000)
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
