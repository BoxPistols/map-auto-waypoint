import styles from './WaypointList.module.scss'

const WaypointList = ({
  waypoints = [],
  onSelect,
  onDelete,
  onClear
}) => {
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

  return (
    <div className={styles.waypointList}>
      <div className={styles.header}>
        <span className={styles.count}>{waypoints.length} Waypoints</span>
        <button
          className={styles.clearButton}
          onClick={() => {
            if (confirm('すべてのWaypointを削除しますか？')) {
              onClear?.()
            }
          }}
        >
          クリア
        </button>
      </div>

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
                  </div>
                  <span className={styles.type}>
                    {wp.type === 'grid' ? 'グリッド' : wp.type === 'manual' ? '手動' : '頂点'}
                  </span>
                  <button
                    className={styles.deleteButton}
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete?.(wp.id)
                    }}
                    title="削除"
                  >
                    ×
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
