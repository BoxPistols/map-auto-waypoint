import { X } from 'lucide-react'
import styles from './FacilityPopup.module.scss'

/**
 * FacilityPopup - 施設詳細情報のポップアップ
 * @param {Object} facility - 施設情報
 * @param {number} screenX - ポップアップのX座標
 * @param {number} screenY - ポップアップのY座標
 * @param {Function} onClose - 閉じるボタンのコールバック
 */
const FacilityPopup = ({ facility, screenX, screenY, onClose }) => {
  if (!facility) return null

  // 稼働状況のラベルと色を取得
  const getOperationalStatusInfo = (status) => {
    switch (status) {
      case 'operational':
        return { label: '運転中', color: '#dc2626', bgColor: '#fee2e2' }
      case 'stopped':
        return { label: '停止中', color: '#f97316', bgColor: '#ffedd5' }
      case 'decommissioning':
        return { label: '廃炉作業中', color: '#eab308', bgColor: '#fef3c7' }
      case 'decommissioned':
        return { label: '廃炉完了', color: '#6b7280', bgColor: '#f3f4f6' }
      default:
        return { label: status || '-', color: '#6b7280', bgColor: '#f3f4f6' }
    }
  }

  // 施設タイプのラベルを取得
  const getFacilityTypeLabel = (type) => {
    const labels = {
      government: '政府機関',
      imperial: '皇室関連',
      nuclear: '原子力施設',
      defense: '防衛施設',
      foreign_mission: '外国公館',
      prefecture: '都道府県庁',
      police: '警察施設',
      prison: '刑務所・拘置所',
      military_jsdf: '自衛隊施設',
      energy: 'エネルギー施設',
      water: '水道施設',
      infrastructure: '重要インフラ',
      airport: '空港'
    }
    return labels[type] || type
  }

  // ゾーンタイプのラベルと色を取得
  const getZoneInfo = (zone) => {
    if (zone === 'red') {
      return { label: 'レッドゾーン', color: '#dc2626', bgColor: '#fee2e2' }
    } else if (zone === 'yellow') {
      return { label: 'イエローゾーン', color: '#eab308', bgColor: '#fef3c7' }
    }
    return { label: zone, color: '#6b7280', bgColor: '#f3f4f6' }
  }

  const statusInfo = facility.operationalStatus ? getOperationalStatusInfo(facility.operationalStatus) : null
  const zoneInfo = getZoneInfo(facility.zone)

  return (
    <div
      className={styles.facilityPopup}
      style={{
        left: `${screenX}px`,
        top: `${screenY}px`
      }}
    >
      <div className={styles.header}>
        <h3 className={styles.title}>{facility.name}</h3>
        <button
          className={styles.closeButton}
          onClick={onClose}
          aria-label="閉じる"
        >
          <X size={16} />
        </button>
      </div>

      <div className={styles.content}>
        {facility.nameEn && (
          <div className={styles.row}>
            <span className={styles.label}>英語名:</span>
            <span className={styles.value}>{facility.nameEn}</span>
          </div>
        )}

        <div className={styles.row}>
          <span className={styles.label}>種類:</span>
          <span className={styles.value}>{getFacilityTypeLabel(facility.type)}</span>
        </div>

        <div className={styles.row}>
          <span className={styles.label}>区分:</span>
          <span
            className={styles.badge}
            style={{
              color: zoneInfo.color,
              backgroundColor: zoneInfo.bgColor
            }}
          >
            {zoneInfo.label}
          </span>
        </div>

        <div className={styles.row}>
          <span className={styles.label}>半径:</span>
          <span className={styles.value}>{(facility.radiusKm * 1000).toFixed(0)}m</span>
        </div>

        {statusInfo && (
          <div className={styles.row}>
            <span className={styles.label}>稼働状況:</span>
            <span
              className={styles.badge}
              style={{
                color: statusInfo.color,
                backgroundColor: statusInfo.bgColor
              }}
            >
              {statusInfo.label}
            </span>
          </div>
        )}

        {facility.reactorCount && (
          <div className={styles.row}>
            <span className={styles.label}>原子炉数:</span>
            <span className={styles.value}>{facility.reactorCount}基</span>
          </div>
        )}

        {facility.capacity && (
          <div className={styles.row}>
            <span className={styles.label}>出力:</span>
            <span className={styles.value}>{facility.capacity}</span>
          </div>
        )}

        {facility.operator && (
          <div className={styles.row}>
            <span className={styles.label}>事業者:</span>
            <span className={styles.value}>{facility.operator}</span>
          </div>
        )}

        {facility.category && (
          <div className={styles.row}>
            <span className={styles.label}>カテゴリー:</span>
            <span className={styles.value}>{facility.category}</span>
          </div>
        )}

        {facility.source && (
          <div className={styles.row}>
            <span className={styles.label}>情報源:</span>
            <span className={styles.value}>{facility.source}</span>
          </div>
        )}

        <div className={styles.row}>
          <span className={styles.label}>座標:</span>
          <span className={styles.value}>
            {facility.coordinates[1].toFixed(6)}, {facility.coordinates[0].toFixed(6)}
          </span>
        </div>

        {facility.description && (
          <div className={styles.description}>
            <span className={styles.label}>備考:</span>
            <p>{facility.description}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default FacilityPopup
