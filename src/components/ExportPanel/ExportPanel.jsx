import { useState, useMemo, useEffect } from 'react'
import { FileJson, FileSpreadsheet, Map, Download, X, Eye, ChevronLeft, Plane, Mountain } from 'lucide-react'
import { exportToJSON, exportToCSV, exportPolygonsToGeoJSON, exportFullBackup, exportToNOTAM, generateNOTAMPreview, getPolygonOrderFromWaypoints } from '../../utils/exporters'
import { exportAllData } from '../../utils/storage'
import styles from './ExportPanel.module.scss'

// Generate preview data for different formats
const generateWaypointJSONPreview = (waypoints) => {
  return waypoints.map((wp, index) => ({
    number: index + 1,
    latitude: wp.lat,
    longitude: wp.lng,
    elevation: wp.elevation || null,
    polygonName: wp.polygonName || '',
    type: wp.type || 'vertex'
  }))
}

const generateWaypointCSVPreview = (waypoints) => {
  const headers = ['番号', '緯度', '経度', '標高', 'ポリゴン名', '種別']
  const rows = waypoints.map((wp, index) => [
    index + 1,
    wp.lat.toFixed(6),
    wp.lng.toFixed(6),
    wp.elevation ? wp.elevation.toFixed(1) : '-',
    wp.polygonName || '',
    wp.type === 'manual' ? '手動' : wp.type === 'grid' ? 'グリッド' : '頂点'
  ])
  return { headers, rows }
}

const generatePolygonGeoJSONPreview = (polygons) => {
  return {
    type: 'FeatureCollection',
    features: polygons.map(polygon => ({
      type: 'Feature',
      id: polygon.id,
      properties: {
        name: polygon.name,
        color: polygon.color,
        createdAt: polygon.createdAt
      },
      geometry: polygon.geometry
    }))
  }
}

const ExportPanel = ({ waypoints = [], polygons = [], onClose }) => {
  const [previewMode, setPreviewMode] = useState(null) // null | 'waypoint-json' | 'waypoint-csv' | 'waypoint-notam' | 'polygon-geojson' | 'backup'
  const [notamAltitudes, setNotamAltitudes] = useState({}) // { [polygonId]: number }

  // Get polygon list for NOTAM altitude input
  const notamPolygons = useMemo(() => {
    return getPolygonOrderFromWaypoints(waypoints, polygons)
  }, [waypoints, polygons])

  // Initialize altitudes when entering NOTAM mode
  useEffect(() => {
    if (previewMode === 'waypoint-notam') {
      const initialAltitudes = {}
      notamPolygons.forEach(p => {
        if (notamAltitudes[p.id] === undefined) {
          initialAltitudes[p.id] = ''
        }
      })
      if (Object.keys(initialAltitudes).length > 0) {
        setNotamAltitudes(prev => ({ ...prev, ...initialAltitudes }))
      }
    }
  }, [previewMode, notamPolygons])

  // Update altitude for a polygon
  const handleAltitudeChange = (polygonId, value) => {
    const numValue = value === '' ? '' : parseInt(value) || ''
    setNotamAltitudes(prev => ({ ...prev, [polygonId]: numValue }))
  }

  // Generate preview data based on mode
  const previewData = useMemo(() => {
    switch (previewMode) {
      case 'waypoint-json':
        return JSON.stringify(generateWaypointJSONPreview(waypoints), null, 2)
      case 'waypoint-csv':
        return generateWaypointCSVPreview(waypoints)
      case 'waypoint-notam':
        return generateNOTAMPreview(waypoints, polygons, notamAltitudes)
      case 'polygon-geojson':
        return JSON.stringify(generatePolygonGeoJSONPreview(polygons), null, 2)
      case 'backup':
        return JSON.stringify(exportAllData(), null, 2)
      default:
        return null
    }
  }, [previewMode, waypoints, polygons, notamAltitudes])

  const handleExportWaypointsJSON = () => {
    if (waypoints.length === 0) return
    exportToJSON(waypoints)
  }

  const handleExportWaypointsCSV = () => {
    if (waypoints.length === 0) return
    exportToCSV(waypoints)
  }

  const handleExportPolygonsGeoJSON = () => {
    if (polygons.length === 0) return
    exportPolygonsToGeoJSON(polygons)
  }

  const handleExportBackup = () => {
    const data = exportAllData()
    exportFullBackup(data)
  }

  const handleExportNOTAM = () => {
    if (waypoints.length === 0) return
    exportToNOTAM(waypoints, polygons, notamAltitudes)
  }

  // Preview mode title
  const getPreviewTitle = () => {
    switch (previewMode) {
      case 'waypoint-json': return 'Waypoint JSON プレビュー'
      case 'waypoint-csv': return 'Waypoint CSV プレビュー'
      case 'waypoint-notam': return 'NOTAM形式 プレビュー（度分秒）'
      case 'polygon-geojson': return 'ポリゴン GeoJSON プレビュー'
      case 'backup': return 'バックアップ プレビュー'
      default: return ''
    }
  }

  // Render preview content
  const renderPreview = () => {
    if (previewMode === 'waypoint-csv' && previewData) {
      const { headers, rows } = previewData
      return (
        <div className={styles.csvPreview}>
          <table>
            <thead>
              <tr>
                {headers.map((h, i) => <th key={i}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 50).map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => <td key={j}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 50 && (
            <p className={styles.truncateNote}>
              ... 他 {rows.length - 50} 件（プレビューは最初の50件のみ表示）
            </p>
          )}
        </div>
      )
    }

    // NOTAM format - plain text with DMS coordinates and altitude input
    if (previewMode === 'waypoint-notam' && previewData) {
      return (
        <div className={styles.notamPreview}>
          {/* Altitude input section */}
          <div className={styles.altitudeInputSection}>
            <h4>
              <Mountain size={16} />
              各範囲の海抜高度を入力
            </h4>
            <div className={styles.altitudeInputs}>
              {notamPolygons.map((polygon, index) => (
                <div key={polygon.id} className={styles.altitudeRow}>
                  <div
                    className={styles.altitudeColorDot}
                    style={{ backgroundColor: polygon.color }}
                  />
                  <span className={styles.altitudeLabel}>
                    範囲{index + 1}: {polygon.name}
                  </span>
                  <div className={styles.altitudeInputWrapper}>
                    <input
                      type="number"
                      min="0"
                      max="9999"
                      placeholder="高度"
                      value={notamAltitudes[polygon.id] || ''}
                      onChange={(e) => handleAltitudeChange(polygon.id, e.target.value)}
                      className={styles.altitudeInput}
                    />
                    <span className={styles.altitudeUnit}>m</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className={styles.notamContent}>
            <pre>{previewData}</pre>
          </div>
        </div>
      )
    }

    return (
      <div className={styles.jsonPreview}>
        <pre>{previewData}</pre>
      </div>
    )
  }

  // Preview mode UI
  if (previewMode) {
    return (
      <div className={styles.exportPanel}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={() => setPreviewMode(null)}>
            <ChevronLeft size={18} />
          </button>
          <h3>{getPreviewTitle()}</h3>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.previewContent}>
          {renderPreview()}
        </div>

        <div className={styles.previewActions}>
          <button
            className={styles.downloadButton}
            onClick={() => {
              switch (previewMode) {
                case 'waypoint-json': handleExportWaypointsJSON(); break
                case 'waypoint-csv': handleExportWaypointsCSV(); break
                case 'waypoint-notam': handleExportNOTAM(); break
                case 'polygon-geojson': handleExportPolygonsGeoJSON(); break
                case 'backup': handleExportBackup(); break
              }
            }}
          >
            <Download size={16} />
            ダウンロード
          </button>
        </div>
      </div>
    )
  }

  // Default export selection UI
  return (
    <div className={styles.exportPanel}>
      <div className={styles.header}>
        <h3>エクスポート</h3>
        <button className={styles.closeButton} onClick={onClose}>
          <X size={18} />
        </button>
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
              onClick={() => setPreviewMode('waypoint-json')}
              disabled={waypoints.length === 0}
            >
              <Eye size={16} />
              <FileJson size={16} />
              JSON
            </button>
            <button
              className={styles.exportButton}
              onClick={() => setPreviewMode('waypoint-csv')}
              disabled={waypoints.length === 0}
            >
              <Eye size={16} />
              <FileSpreadsheet size={16} />
              CSV
            </button>
            <button
              className={`${styles.exportButton} ${styles.notamButton}`}
              onClick={() => setPreviewMode('waypoint-notam')}
              disabled={waypoints.length === 0}
              data-tooltip="NOTAM通知用（度分秒形式）"
            >
              <Eye size={16} />
              <Plane size={16} />
              NOTAM
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
              onClick={() => setPreviewMode('polygon-geojson')}
              disabled={polygons.length === 0}
            >
              <Eye size={16} />
              <Map size={16} />
              GeoJSON
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
              onClick={() => setPreviewMode('backup')}
            >
              <Eye size={16} />
              <Download size={16} />
              バックアップ
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExportPanel
