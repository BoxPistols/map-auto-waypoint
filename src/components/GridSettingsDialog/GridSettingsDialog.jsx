import { useState, useMemo } from 'react'
import { X, Grid3X3, AlertTriangle, Info } from 'lucide-react'
import { estimateGridWaypointCount, calculatePolygonArea, formatArea } from '../../services/waypointGenerator'
import styles from './GridSettingsDialog.module.scss'

const GridSettingsDialog = ({ polygon, onConfirm, onCancel }) => {
  const [spacing, setSpacing] = useState(30)
  const [includeVertices, setIncludeVertices] = useState(true)

  // Calculate estimated waypoint count
  const estimatedCount = useMemo(() => {
    const gridCount = estimateGridWaypointCount(polygon, spacing)
    const vertexCount = includeVertices ? polygon.geometry.coordinates[0].length - 1 : 0
    return {
      grid: gridCount,
      vertex: vertexCount,
      total: gridCount + vertexCount
    }
  }, [polygon, spacing, includeVertices])

  // Calculate polygon area
  const area = useMemo(() => calculatePolygonArea(polygon), [polygon])

  // Warning thresholds
  const isHighCount = estimatedCount.total > 200
  const isVeryHighCount = estimatedCount.total > 500

  // Suggested spacing based on area
  const suggestedSpacings = useMemo(() => {
    const areaHa = area / 10000
    if (areaHa < 1) return [10, 20, 30]
    if (areaHa < 5) return [20, 30, 50]
    if (areaHa < 20) return [30, 50, 100]
    return [50, 100, 200]
  }, [area])

  const handleConfirm = () => {
    onConfirm({
      spacing,
      includeVertices,
      estimatedCount: estimatedCount.total
    })
  }

  return (
    <div className={styles.dialog}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <Grid3X3 size={20} />
          <h3>グリッドWaypoint設定</h3>
        </div>
        <button className={styles.closeButton} onClick={onCancel}>
          <X size={18} />
        </button>
      </div>

      <div className={styles.content}>
        {/* Polygon info */}
        <div className={styles.polygonInfo}>
          <div
            className={styles.colorDot}
            style={{ backgroundColor: polygon.color }}
          />
          <span className={styles.polygonName}>{polygon.name}</span>
          <span className={styles.polygonArea}>({formatArea(area)})</span>
        </div>

        {/* Spacing setting */}
        <div className={styles.settingGroup}>
          <label className={styles.label}>
            グリッド間隔
            <span className={styles.unit}>(メートル)</span>
          </label>

          <div className={styles.spacingInput}>
            <input
              type="number"
              min="5"
              max="500"
              step="5"
              value={spacing}
              onChange={(e) => setSpacing(Math.max(5, parseInt(e.target.value) || 5))}
              className={styles.numberInput}
            />
            <span className={styles.inputUnit}>m</span>
          </div>

          <div className={styles.spacingPresets}>
            {suggestedSpacings.map(s => (
              <button
                key={s}
                className={`${styles.presetButton} ${spacing === s ? styles.active : ''}`}
                onClick={() => setSpacing(s)}
              >
                {s}m
              </button>
            ))}
          </div>

          <input
            type="range"
            min="5"
            max="200"
            step="5"
            value={spacing}
            onChange={(e) => setSpacing(parseInt(e.target.value))}
            className={styles.slider}
          />
          <div className={styles.sliderLabels}>
            <span>5m (密)</span>
            <span>200m (粗)</span>
          </div>
        </div>

        {/* Include vertices option */}
        <div className={styles.settingGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={includeVertices}
              onChange={(e) => setIncludeVertices(e.target.checked)}
            />
            <span>頂点Waypointも含める</span>
          </label>
        </div>

        {/* Preview */}
        <div className={styles.preview}>
          <h4>生成プレビュー</h4>
          <div className={styles.countGrid}>
            <div className={styles.countItem}>
              <span className={styles.countLabel}>グリッド</span>
              <span className={styles.countValue}>{estimatedCount.grid}</span>
            </div>
            {includeVertices && (
              <div className={styles.countItem}>
                <span className={styles.countLabel}>頂点</span>
                <span className={styles.countValue}>{estimatedCount.vertex}</span>
              </div>
            )}
            <div className={`${styles.countItem} ${styles.total}`}>
              <span className={styles.countLabel}>合計</span>
              <span className={`${styles.countValue} ${isVeryHighCount ? styles.danger : isHighCount ? styles.warning : ''}`}>
                {estimatedCount.total}
              </span>
            </div>
          </div>

          {/* Warnings */}
          {isVeryHighCount && (
            <div className={`${styles.alert} ${styles.danger}`}>
              <AlertTriangle size={16} />
              <span>
                Waypoint数が非常に多いです。<br />
                パフォーマンスに影響する可能性があります。<br />
                間隔を大きくすることを推奨します。
              </span>
            </div>
          )}
          {isHighCount && !isVeryHighCount && (
            <div className={`${styles.alert} ${styles.warning}`}>
              <Info size={16} />
              <span>
                Waypoint数が多めです。<br />
                必要に応じて間隔を調整してください。
              </span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.actions}>
        <button className={styles.cancelButton} onClick={onCancel}>
          キャンセル
        </button>
        <button
          className={styles.confirmButton}
          onClick={handleConfirm}
          disabled={estimatedCount.total === 0}
        >
          <Grid3X3 size={16} />
          {estimatedCount.total} Waypoint生成
        </button>
      </div>
    </div>
  )
}

export default GridSettingsDialog
