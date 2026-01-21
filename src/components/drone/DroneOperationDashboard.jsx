/**
 * 飛行安全性チェッカー
 * 地点の飛行可否を総合評価
 */

import { useState, useMemo } from 'react'
import { X, Wind, CloudRain, Signal, RefreshCw, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'
import FlightPlanChecker from './FlightPlanChecker'
import styles from './DroneOperationDashboard.module.scss'

/**
 * @param {Object} props
 * @param {Object} [props.selectedPoint] - 選択された地点 { lat, lng }
 * @param {Function} [props.onClose] - 閉じるボタンのコールバック
 * @param {boolean} [props.darkMode] - ダークモード
 * @param {Object} [props.layerVisibility] - レイヤー表示状態
 * @param {Function} [props.onToggleLayer] - レイヤートグルコールバック
 */
export default function DroneOperationDashboard({
  selectedPoint,
  onClose,
  darkMode = false,
  layerVisibility = {},
  onToggleLayer
}) {
  const [showHelp, setShowHelp] = useState(false)
  const [expanded, setExpanded] = useState(true)

  // 有効な座標かチェック
  const hasValidPoint = useMemo(() => {
    return selectedPoint &&
      typeof selectedPoint.lat === 'number' &&
      typeof selectedPoint.lng === 'number' &&
      !isNaN(selectedPoint.lat) &&
      !isNaN(selectedPoint.lng)
  }, [selectedPoint])

  return (
    <div className={`${styles.dashboard} ${darkMode ? styles.dark : ''}`}>
      {/* ヘッダー */}
      <div className={styles.header}>
        <h3 className={styles.title}>飛行安全性チェッカー</h3>
        <div className={styles.headerActions}>
          <button
            className={styles.iconButton}
            onClick={() => setExpanded(!expanded)}
            title={expanded ? '折りたたむ' : '展開する'}
          >
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          <button
            className={styles.iconButton}
            onClick={() => setShowHelp(!showHelp)}
            title="ヘルプ"
          >
            <HelpCircle size={18} />
          </button>
          {onClose && (
            <button
              className={styles.iconButton}
              onClick={onClose}
              title="閉じる"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <>
          {/* ヘルプセクション */}
          {showHelp && (
            <div className={styles.helpSection}>
              <h4>使い方</h4>
              <ol>
                <li>地図上で確認したい地点をクリック</li>
                <li>安全性評価が自動で表示されます</li>
                <li>レイヤーを切り替えて詳細を確認</li>
                <li>飛行可能かどうかを確認</li>
              </ol>
            </div>
          )}

          {/* 地点安全評価 */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>地点安全評価</h4>
            {hasValidPoint ? (
              <FlightPlanChecker
                lat={selectedPoint.lat}
                lng={selectedPoint.lng}
                darkMode={darkMode}
              />
            ) : (
              <div className={styles.noPoint}>
                <p>地図上で地点を選択してください</p>
                <p className={styles.hint}>Shift+クリックで地点を選択</p>
              </div>
            )}
          </div>

          {/* レイヤー切り替え */}
          {onToggleLayer && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>オーバーレイ表示</h4>
              <div className={styles.layerToggles}>
                <button
                  className={`${styles.layerButton} ${layerVisibility.showWind ? styles.active : ''}`}
                  onClick={() => onToggleLayer('showWind')}
                >
                  <Wind size={16} />
                  <span>風速</span>
                </button>
                <button
                  className={`${styles.layerButton} ${layerVisibility.showRainCloud ? styles.active : ''}`}
                  onClick={() => onToggleLayer('showRainCloud')}
                >
                  <CloudRain size={16} />
                  <span>雨雲</span>
                </button>
                <button
                  className={`${styles.layerButton} ${layerVisibility.showGeoFeatures ? styles.active : ''}`}
                  onClick={() => onToggleLayer('showGeoFeatures')}
                >
                  <Signal size={16} />
                  <span>LTE</span>
                </button>
              </div>
            </div>
          )}

          {/* 座標表示 */}
          {hasValidPoint && (
            <div className={styles.coordinates}>
              <span>緯度: {selectedPoint.lat.toFixed(6)}</span>
              <span>経度: {selectedPoint.lng.toFixed(6)}</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
