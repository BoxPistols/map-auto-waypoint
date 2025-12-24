import { useState } from 'react'
import { calculatePolygonArea, calculatePolygonPerimeter, formatArea, formatDistance } from '../../services/waypointGenerator'
import styles from './PolygonList.module.scss'

const PolygonList = ({
  polygons = [],
  selectedPolygonId,
  onSelect,
  onDelete,
  onRename,
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
              className={`${styles.item} ${isSelected ? styles.selected : ''}`}
              onClick={() => !isEditing && onSelect?.(polygon)}
            >
              <div className={styles.colorIndicator} style={{ backgroundColor: polygon.color }} />

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

              <div className={styles.actions}>
                <button
                  className={styles.actionButton}
                  onClick={(e) => {
                    e.stopPropagation()
                    onGenerateWaypoints?.(polygon)
                  }}
                  title="Waypoint生成"
                >
                  📍
                </button>
                <button
                  className={styles.actionButton}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleStartEdit(polygon)
                  }}
                  title="名前を編集"
                >
                  ✏️
                </button>
                <button
                  className={`${styles.actionButton} ${styles.deleteButton}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(`「${polygon.name}」を削除しますか？`)) {
                      onDelete?.(polygon.id)
                    }
                  }}
                  title="削除"
                >
                  🗑️
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default PolygonList
