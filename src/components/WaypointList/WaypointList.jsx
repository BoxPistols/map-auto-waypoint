import { useState, useRef, useEffect } from 'react'
import { Trash2, Mountain, RefreshCw, Settings2, Pencil, Check, Route } from 'lucide-react'
import { formatElevation } from '../../services/elevation'
import styles from './WaypointList.module.scss'

const WaypointList = ({
  waypoints = [],
  onSelect,
  onDelete,
  onClear,
  onUpdate,
  onFetchElevation,
  onRegenerateGrid,
  gridSpacing = 30,
  onGridSpacingChange,
  isLoadingElevation = false,
  elevationProgress = null,
  onOpenRouteOptimizer,
}) => {
  const [showSettings, setShowSettings] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingField, setEditingField] = useState(null) // 'name' | 'lat' | 'lng' | 'index'
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef(null)

  // Focus input when editing starts
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingId, editingField])

  const startEdit = (wp, field) => {
    setEditingId(wp.id)
    setEditingField(field)
    if (field === 'name') {
      setEditValue(wp.polygonName || '')
    } else if (field === 'lat') {
      setEditValue(wp.lat.toFixed(6))
    } else if (field === 'lng') {
      setEditValue(wp.lng.toFixed(6))
    } else if (field === 'index') {
      setEditValue(String(wp.index))
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingField(null)
    setEditValue('')
  }

  const saveEdit = () => {
    if (!editingId || !editingField) return

    const wp = waypoints.find(w => w.id === editingId)
    if (!wp) return

    let updatedValue = editValue.trim()
    let updateData = {}

    if (editingField === 'name') {
      updateData = { polygonName: updatedValue || '名称なし' }
    } else if (editingField === 'lat') {
      const lat = parseFloat(updatedValue)
      if (isNaN(lat) || lat < -90 || lat > 90) {
        cancelEdit()
        return
      }
      updateData = { lat }
    } else if (editingField === 'lng') {
      const lng = parseFloat(updatedValue)
      if (isNaN(lng) || lng < -180 || lng > 180) {
        cancelEdit()
        return
      }
      updateData = { lng }
    } else if (editingField === 'index') {
      const index = parseInt(updatedValue)
      if (isNaN(index) || index < 1) {
        cancelEdit()
        return
      }
      updateData = { index }
    }

    onUpdate?.(editingId, updateData)
    cancelEdit()
  }

  const handleKeyDown = (e) => {
    // IME変換中は無視（日本語入力の確定Enterでsubmitしないように）
    if (e.nativeEvent.isComposing || e.keyCode === 229) {
      return
    }
    if (e.key === 'Enter') {
      saveEdit()
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }
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
            className={`${styles.iconButton} ${styles.routeButton}`}
            onClick={onOpenRouteOptimizer}
            disabled={waypoints.length < 2}
            data-tooltip="ルート最適化"
            data-tooltip-pos="bottom"
          >
            <Route size={16} />
          </button>
          <button
            className={styles.iconButton}
            onClick={() => setShowSettings(!showSettings)}
            data-tooltip="グリッド設定"
            data-tooltip-pos="bottom"
          >
            <Settings2 size={16} />
          </button>
          <button
            className={styles.iconButton}
            onClick={onFetchElevation}
            disabled={isLoadingElevation || waypoints.length === 0}
            data-tooltip="標高を取得（国土地理院API）"
            data-tooltip-pos="bottom"
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
            data-tooltip="全て削除"
            data-tooltip-pos="bottom"
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
            style={{
              width: `${(elevationProgress.current / elevationProgress.total) * 100}%`
            }}
          />
          <span>
            標高取得中 {elevationProgress.current}/{elevationProgress.total}
          </span>
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
              {groupWaypoints.map((wp) => {
                const isEditing = editingId === wp.id

                return (
                  <li
                    key={wp.id}
                    className={`${styles.item} ${isEditing ? styles.editing : ''}`}
                    onClick={() => !isEditing && onSelect?.(wp)}
                  >
                    {/* Index marker - editable */}
                    {isEditing && editingField === 'index' ? (
                      <input
                        ref={inputRef}
                        type="number"
                        min="1"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={saveEdit}
                        className={styles.indexInput}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span
                        className={`${styles.marker} ${wp.type === 'grid' ? styles.gridMarker : ''}`}
                        onDoubleClick={(e) => {
                          e.stopPropagation()
                          startEdit(wp, 'index')
                        }}
                        title="ダブルクリックで編集"
                      >
                        {wp.index}
                      </span>
                    )}

                    {/* Coordinates - editable */}
                    <div className={styles.coords}>
                      {isEditing && editingField === 'lat' ? (
                        <input
                          ref={inputRef}
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={handleKeyDown}
                          onBlur={saveEdit}
                          className={styles.coordInput}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span
                          className={styles.coordValue}
                          onDoubleClick={(e) => {
                            e.stopPropagation()
                            startEdit(wp, 'lat')
                          }}
                          title="緯度 (ダブルクリックで編集)"
                        >
                          {wp.lat.toFixed(6)}
                        </span>
                      )}

                      {isEditing && editingField === 'lng' ? (
                        <input
                          ref={inputRef}
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={handleKeyDown}
                          onBlur={saveEdit}
                          className={styles.coordInput}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span
                          className={styles.coordValue}
                          onDoubleClick={(e) => {
                            e.stopPropagation()
                            startEdit(wp, 'lng')
                          }}
                          title="経度 (ダブルクリックで編集)"
                        >
                          {wp.lng.toFixed(6)}
                        </span>
                      )}

                      {wp.elevation !== undefined && (
                        <span className={styles.elevation}>
                          {formatElevation(wp.elevation)}
                        </span>
                      )}
                    </div>

                    <span className={styles.type}>
                      {wp.type === 'grid' ? 'グリッド' : wp.type === 'manual' ? '手動' : wp.type === 'perimeter' ? '外周' : '頂点'}
                    </span>

                    {/* Edit button */}
                    <button
                      className={styles.editButton}
                      onClick={(e) => {
                        e.stopPropagation()
                        startEdit(wp, 'lat')
                      }}
                      title="座標を編集"
                    >
                      <Pencil size={12} />
                    </button>

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
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

export default WaypointList
