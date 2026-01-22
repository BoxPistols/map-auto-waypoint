/**
 * 飛行計画チェッカー
 * 指定座標の飛行可能性を総合判定
 */

import { useMemo } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'
import { useOperationSafety, getSafetyLevelColor, getSafetyLevelText } from '../../lib/hooks'
import { latLngToMeshCode } from '../../lib/utils/meshCode'
import styles from './FlightPlanChecker.module.scss'

const SEVERITY_ICONS = {
  critical: XCircle,
  warning: AlertTriangle,
  info: Info
}

const SEVERITY_COLORS = {
  critical: '#ef4444',
  warning: '#f97316',
  info: '#3b82f6'
}

/**
 * @param {Object} props
 * @param {number} props.lat - 緯度
 * @param {number} props.lng - 経度
 * @param {boolean} [props.darkMode] - ダークモード
 * @param {boolean} [props.compact] - コンパクト表示
 */
export default function FlightPlanChecker({ lat, lng, darkMode = false, compact = false }) {
  // メッシュコードを計算
  const meshCode = useMemo(() => {
    try {
      return latLngToMeshCode(lat, lng)
    } catch {
      return null
    }
  }, [lat, lng])

  // 安全性評価
  const safety = useOperationSafety(lat, lng, meshCode)

  // reasonsが配列であることを保証（防御的コーディング）
  const safeReasons = Array.isArray(safety?.reasons) ? safety.reasons : []

  if (safety?.loading) {
    return (
      <div className={`${styles.container} ${darkMode ? styles.dark : ''}`}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>安全性を確認中...</span>
        </div>
      </div>
    )
  }

  if (safety?.error) {
    return (
      <div className={`${styles.container} ${darkMode ? styles.dark : ''}`}>
        <div className={styles.error}>
          <XCircle size={20} />
          <span>エラー: {safety.error}</span>
        </div>
      </div>
    )
  }

  const StatusIcon = safety?.canFly ? CheckCircle : XCircle
  const statusColor = getSafetyLevelColor(safety?.safetyLevel ?? 'prohibited')
  const statusText = getSafetyLevelText(safety?.safetyLevel ?? 'prohibited')

  return (
    <div className={`${styles.container} ${darkMode ? styles.dark : ''} ${compact ? styles.compact : ''}`}>
      {/* メインステータス */}
      <div className={styles.mainStatus} style={{ borderColor: statusColor }}>
        <StatusIcon
          size={compact ? 24 : 32}
          style={{ color: statusColor }}
        />
        <div className={styles.statusText}>
          <span className={styles.flyStatus} style={{ color: statusColor }}>
            {safety?.canFly ? '飛行可能' : '飛行不可'}
          </span>
          <span className={styles.levelBadge} style={{ backgroundColor: statusColor }}>
            {statusText}
          </span>
        </div>
      </div>

      {/* 詳細理由 */}
      {!compact && safeReasons.length > 0 && (
        <div className={styles.reasons}>
          <h4 className={styles.reasonsTitle}>詳細</h4>
          <ul className={styles.reasonsList}>
            {safeReasons.map((reason, index) => {
              const Icon = SEVERITY_ICONS[reason.severity] || Info
              const color = SEVERITY_COLORS[reason.severity] || '#6b7280'
              return (
                <li key={index} className={styles.reasonItem}>
                  <Icon size={16} style={{ color, flexShrink: 0 }} />
                  <span className={styles.reasonMessage}>{reason.message}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* 次の安全時間帯 */}
      {!safety?.canFly && safety?.nextSafeWindow && !compact && (
        <div className={styles.nextWindow}>
          <span className={styles.nextWindowLabel}>次の飛行可能時間帯:</span>
          <span className={styles.nextWindowTime}>
            {safety?.nextSafeWindow?.toLocaleString('ja-JP', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>
      )}

      {/* 気象データサマリー */}
      {!compact && safety?.weatherData && (
        <div className={styles.weatherSummary}>
          <div className={styles.weatherItem}>
            <span className={styles.weatherLabel}>風速</span>
            <span className={styles.weatherValue}>
              {safety?.weatherData?.windSpeed?.toFixed(1) || '-'} m/s
            </span>
          </div>
          <div className={styles.weatherItem}>
            <span className={styles.weatherLabel}>降水確率</span>
            <span className={styles.weatherValue}>
              {safety?.weatherData?.precipitationProbability ?? 0}%
            </span>
          </div>
          <div className={styles.weatherItem}>
            <span className={styles.weatherLabel}>気温</span>
            <span className={styles.weatherValue}>
              {safety?.weatherData?.temperature?.toFixed(1) || '-'}°C
            </span>
          </div>
        </div>
      )}

      {/* 飛行可能時間 */}
      {!compact && safety?.flightWindowData?.flightAllowedNow && (
        <div className={styles.flightWindow}>
          <span className={styles.flightWindowLabel}>薄明終了まで</span>
          <span className={styles.flightWindowTime}>
            {safety?.flightWindowData?.minutesRemaining ?? '-'}分
          </span>
        </div>
      )}
    </div>
  )
}
