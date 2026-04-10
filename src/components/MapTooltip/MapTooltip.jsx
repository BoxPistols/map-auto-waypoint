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
  // 配置計算結果を1つの state にまとめることで setState カスケードを回避
  const [layout, setLayout] = useState({
    position: position || { x: 0, y: 0 },
    arrowDir: 'none',
    isPositioned: false,
  })
  const adjustedPosition = layout.position
  const arrowDir = layout.arrowDir
  const isPositioned = layout.isPositioned

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

  // 矢印付き配置ロジック（CoordinateDisplay準拠）
  // ホバー位置から右横→左横→下とフォールバック
  useLayoutEffect(() => {
    if (tooltipRef.current && position) {
      const rect = tooltipRef.current.getBoundingClientRect()
      const MARGIN = 16
      const ARROW_SIZE = 8
      const GAP = 12

      const panelWidth = rect.width || 280
      const panelHeight = rect.height || 120

      // デフォルト: ホバー位置の右横に配置
      let x = position.x + ARROW_SIZE + GAP
      let y = position.y - panelHeight / 2
      let dir = 'left' // 矢印はパネルの左側（ホバー位置を指す）

      // 右に収まらない場合: 左横に配置
      if (x + panelWidth > window.innerWidth - MARGIN) {
        x = position.x - panelWidth - ARROW_SIZE - GAP
        dir = 'right' // 矢印はパネルの右側
      }

      // 左にも収まらない場合: 下に配置
      if (x < MARGIN) {
        x = Math.max(MARGIN, position.x - panelWidth / 2)
        y = position.y + ARROW_SIZE + GAP
        dir = 'top' // 矢印はパネルの上側
      }

      // 上下の画面外補正
      if (y < MARGIN) {
        y = MARGIN
      } else if (y + panelHeight > window.innerHeight - MARGIN) {
        y = window.innerHeight - panelHeight - MARGIN
      }

      // DOM計測後の位置確定のため useLayoutEffect + setState は canonical パターン
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLayout({
        position: { x, y },
        arrowDir: dir,
        isPositioned: true,
      })
    }
  }, [position, isVisible])

  if (!isVisible || !data || !position) return null

  return (
    <div
      ref={tooltipRef}
      className={styles.tooltip}
      style={{
        position: 'fixed',
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
        zIndex: 9999,
        opacity: isPositioned ? 1 : 0
      }}
    >
      {arrowDir !== 'none' && (
        <div className={`${styles.arrow} ${styles[arrowDir]}`} />
      )}
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
