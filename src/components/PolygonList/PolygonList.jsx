import { useState } from 'react'
import { MapPin, Grid3X3, Pencil, Trash2, PenTool, Link2, Unlink2 } from 'lucide-react'
import { calculatePolygonArea, calculatePolygonPerimeter, formatArea, formatDistance } from '../../services/waypointGenerator'
import styles from './PolygonList.module.scss'

const PolygonList = ({
  polygons = [],
  selectedPolygonId,
  onSelect,
  onDelete,
  onRename,
  onEditShape,
  onToggleWaypointLink,
  onGenerateWaypoints,
  onGenerateAllWaypoints
}) => {
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')

  const handleStartEdit = (polygon) => {
    setEditingId(polygon.id)
    setEditingName(polygon.name)
  }

  const handleSaveEdit = () => {
    if (editingId && editingName.trim()) {
      onRename?.(editingId, editingName.trim())
    }
    setEditingId(null)
    setEditingName('')
  }

  const handleKeyDown = (e) => {
    // IME変換中は無視（日本語入力の確定Enterでsubmitしないように）
    if (e.nativeEvent.isComposing || e.keyCode === 229) {
      return
    }
    if (e.key === 'Enter') {
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      setEditingId(null)
      setEditingName('')
    }
  }

  if (polygons.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>ポリゴンがありません</p>
        <p className={styles.hint}>
          描画モードを有効にして地図上でポリゴンを描画するか、<br />
          GeoJSON/KMLファイルをインポートしてください
        </p>
      </div>
    )
  }

  return (
    <div className={styles.polygonList}>
      <div className={styles.header}>
        <span className={styles.count}>{polygons.length} エリア</span>
        {polygons.length > 0 && (
          <button
            className={styles.generateAllButton}
            onClick={() => onGenerateAllWaypoints?.()}
          >
            全てWaypoint生成
          </button>
        )}
      </div>

      <ul className={styles.list}>
        {polygons.map((polygon, index) => {
          const area = calculatePolygonArea(polygon)
          const perimeter = calculatePolygonPerimeter(polygon)
          const isSelected = polygon.id === selectedPolygonId
          const isEditing = polygon.id === editingId

          return (
            <li
              key={polygon.id}
              className={`${styles.item} ${isSelected ? styles.selected : ''} ${isEditing ? styles.editing : ''}`}
              onClick={() => !isEditing && onSelect?.(polygon)}
            >
              {/* Top row: color indicator + action buttons */}
              <div className={styles.topRow}>
                <div className={styles.colorIndicator} style={{ backgroundColor: polygon.color }} />
                <div className={styles.actions}>
                  <button
                    className={styles.actionButton}
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditShape?.(polygon)
                    }}
                    data-tooltip="形状を編集"
                    data-tooltip-pos="bottom"
                  >
                    <PenTool size={14} />
                  </button>
                  <button
                    className={`${styles.actionButton} ${polygon.waypointLinked !== false ? styles.linkedButton : ''}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleWaypointLink?.(polygon.id)
                    }}
                    data-tooltip={polygon.waypointLinked !== false ? 'Waypoint同期: ON' : 'Waypoint同期: OFF'}
                    data-tooltip-pos="bottom"
                  >
                    {polygon.waypointLinked !== false ? <Link2 size={14} /> : <Unlink2 size={14} />}
                  </button>
                  <button
                    className={styles.actionButton}
                    onClick={(e) => {
                      e.stopPropagation()
                      onGenerateWaypoints?.(polygon)
                    }}
                    data-tooltip="頂点Waypoint生成"
                    data-tooltip-pos="bottom"
                  >
                    <MapPin size={14} />
                  </button>
                  <button
                    className={styles.actionButton}
                    onClick={(e) => {
                      e.stopPropagation()
                      onGenerateWaypoints?.(polygon, { includeGrid: true })
                    }}
                    data-tooltip="グリッド間隔を設定してWaypoint生成"
                    data-tooltip-pos="bottom"
                  >
                    <Grid3X3 size={14} />
                  </button>
                  <button
                    className={styles.actionButton}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStartEdit(polygon)
                    }}
                    data-tooltip="名前を編集"
                    data-tooltip-pos="bottom"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className={`${styles.actionButton} ${styles.deleteButton}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm(`「${polygon.name}」を削除しますか？`)) {
                        onDelete?.(polygon.id)
                      }
                    }}
                    data-tooltip="削除"
                    data-tooltip-pos="bottom"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Content: name + stats */}
              <div className={styles.content}>
                <div className={styles.nameRow}>
                  <span className={styles.index}>{index + 1}.</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={handleSaveEdit}
                      className={styles.nameInput}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span
                      className={styles.name}
                      onDoubleClick={(e) => {
                        e.stopPropagation()
                        handleStartEdit(polygon)
                      }}
                    >
                      {polygon.name}
                    </span>
                  )}
                </div>

                <div className={styles.stats}>
                  <span>面積: {formatArea(area)}</span>
                  <span>周長: {formatDistance(perimeter)}</span>
                  <span>頂点: {polygon.geometry.coordinates[0].length - 1}</span>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default PolygonList
