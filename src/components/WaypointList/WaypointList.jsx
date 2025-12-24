import { useState } from 'react'
import { Trash2, Mountain, RefreshCw, Settings2 } from 'lucide-react'
import { formatElevation } from '../../services/elevation'
import styles from './WaypointList.module.scss'

const WaypointList = ({
  waypoints = [],
  onSelect,
  onDelete,
  onClear,
  onFetchElevation,
  onRegenerateGrid,
  gridSpacing = 30,
  onGridSpacingChange,
  isLoadingElevation = false,
  elevationProgress = null
}) => {
  const [showSettings, setShowSettings] = useState(false)
  if (waypoints.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>Waypointがありません</p>
        <p className={styles.hint}>
          ポリゴンから Waypoint を生成するか、<br />
          地図上でクリックして追加してください
        </p>
      </div>
    )
  }

  // Group waypoints by polygon
  const groupedWaypoints = waypoints.reduce((acc, wp) => {
    const key = wp.polygonName || 'その他'
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(wp)
    return acc
  }, {})

  const hasGridWaypoints = waypoints.some(wp => wp.type === 'grid')

  return (
    <div className={styles.waypointList}>
      <div className={styles.header}>
        <span className={styles.count}>{waypoints.length} Waypoints</span>
        <div className={styles.headerActions}>
          <button
            className={styles.iconButton}
            onClick={() => setShowSettings(!showSettings)}
            title="設定"
          >
            <Settings2 size={16} />
          </button>
          <button
            className={styles.iconButton}
            onClick={onFetchElevation}
            disabled={isLoadingElevation || waypoints.length === 0}
            title="標高取得"
          >
            <Mountain size={16} />
          </button>
          <button
            className={styles.clearButton}
            onClick={() => {
              if (confirm('すべてのWaypointを削除しますか？')) {
                onClear?.()
              }
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* 進捗表示 */}
      {isLoadingElevation && elevationProgress && (
        <div className={styles.progress}>
          <div
            className={styles.progressBar}
            style={{ width: `${(elevationProgress.current / elevationProgress.total) * 100}%` }}
          />
          <span>標高取得中 {elevationProgress.current}/{elevationProgress.total}</span>
        </div>
      )}

      {/* 設定パネル */}
      {showSettings && (
        <div className={styles.settings}>
          <div className={styles.settingRow}>
            <label>グリッド間隔:</label>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={gridSpacing}
              onChange={(e) => onGridSpacingChange?.(Number(e.target.value))}
              className={styles.slider}
            />
            <span className={styles.sliderValue}>{gridSpacing}m</span>
          </div>
          {hasGridWaypoints && (
            <button
              className={styles.regenerateButton}
              onClick={onRegenerateGrid}
            >
              <RefreshCw size={14} />
              グリッド再生成
            </button>
          )}
        </div>
      )}

      <div className={styles.groups}>
        {Object.entries(groupedWaypoints).map(([groupName, groupWaypoints]) => (
          <div key={groupName} className={styles.group}>
            <div className={styles.groupHeader}>
              <span className={styles.groupName}>{groupName}</span>
              <span className={styles.groupCount}>{groupWaypoints.length}</span>
            </div>

            <ul className={styles.list}>
              {groupWaypoints.map((wp) => (
                <li
                  key={wp.id}
                  className={styles.item}
                  onClick={() => onSelect?.(wp)}
                >
                  <span className={`${styles.marker} ${wp.type === 'grid' ? styles.gridMarker : ''}`}>
                    {wp.index}
                  </span>
                  <div className={styles.coords}>
                    <span>{wp.lat.toFixed(6)}</span>
                    <span>{wp.lng.toFixed(6)}</span>
                    {wp.elevation !== undefined && (
                      <span className={styles.elevation}>
                        {formatElevation(wp.elevation)}
                      </span>
                    )}
                  </div>
                  <span className={styles.type}>
                    {wp.type === 'grid' ? 'グリッド' : wp.type === 'manual' ? '手動' : wp.type === 'perimeter' ? '外周' : '頂点'}
                  </span>
                  <button
                    className={styles.deleteButton}
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete?.(wp.id)
                    }}
                    title="削除"
                  >
                    <Trash2 size={12} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

export default WaypointList
