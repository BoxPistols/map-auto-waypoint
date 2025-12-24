import { exportToJSON, exportToCSV, exportPolygonsToGeoJSON, exportFullBackup } from '../../utils/exporters'
import { exportAllData } from '../../utils/storage'
import styles from './ExportPanel.module.scss'

const ExportPanel = ({ waypoints = [], polygons = [], onClose }) => {
  const handleExportWaypointsJSON = () => {
    if (waypoints.length === 0) {
      alert('エクスポートするWaypointがありません')
      return
    }
    exportToJSON(waypoints)
  }

  const handleExportWaypointsCSV = () => {
    if (waypoints.length === 0) {
      alert('エクスポートするWaypointがありません')
      return
    }
    exportToCSV(waypoints)
  }

  const handleExportPolygonsGeoJSON = () => {
    if (polygons.length === 0) {
      alert('エクスポートするポリゴンがありません')
      return
    }
    exportPolygonsToGeoJSON(polygons)
  }

  const handleExportBackup = () => {
    const data = exportAllData()
    exportFullBackup(data)
  }

  return (
    <div className={styles.exportPanel}>
      <div className={styles.header}>
        <h3>エクスポート</h3>
        <button className={styles.closeButton} onClick={onClose}>×</button>
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <h4>Waypointエクスポート</h4>
          <p className={styles.count}>
            {waypoints.length > 0
              ? `${waypoints.length} Waypointsを出力`
              : 'Waypointがありません'}
          </p>
          <div className={styles.buttons}>
            <button
              className={styles.exportButton}
              onClick={handleExportWaypointsJSON}
              disabled={waypoints.length === 0}
            >
              <span className={styles.icon}>📄</span>
              JSON形式
            </button>
            <button
              className={styles.exportButton}
              onClick={handleExportWaypointsCSV}
              disabled={waypoints.length === 0}
            >
              <span className={styles.icon}>📊</span>
              CSV形式
            </button>
          </div>
        </div>

        <div className={styles.section}>
          <h4>ポリゴンエクスポート</h4>
          <p className={styles.count}>
            {polygons.length > 0
              ? `${polygons.length} ポリゴンを出力`
              : 'ポリゴンがありません'}
          </p>
          <div className={styles.buttons}>
            <button
              className={styles.exportButton}
              onClick={handleExportPolygonsGeoJSON}
              disabled={polygons.length === 0}
            >
              <span className={styles.icon}>🗺️</span>
              GeoJSON形式
            </button>
          </div>
        </div>

        <div className={styles.section}>
          <h4>フルバックアップ</h4>
          <p className={styles.hint}>
            すべてのデータ（ポリゴン、Waypoint、履歴）を<br />
            1つのファイルにエクスポートします
          </p>
          <div className={styles.buttons}>
            <button
              className={`${styles.exportButton} ${styles.backupButton}`}
              onClick={handleExportBackup}
            >
              <span className={styles.icon}>💾</span>
              バックアップを作成
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExportPanel
