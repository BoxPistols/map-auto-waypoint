import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import styles from './FacilityPopup.module.scss'

// 稼働状況マップ（コンポーネント外で定義して再利用）
const OPERATIONAL_STATUS_MAP = {
  operational: { label: '運転中', color: '#dc2626', bgColor: '#fee2e2' },
  stopped: { label: '停止中', color: '#f97316', bgColor: '#ffedd5' },
  decommissioning: { label: '廃炉作業中', color: '#eab308', bgColor: '#fef3c7' },
  decommissioned: { label: '廃炉完了', color: '#6b7280', bgColor: '#f3f4f6' },
}

// 施設タイプラベルマップ
const FACILITY_TYPE_LABELS = {
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

// ゾーンタイプマップ
const ZONE_INFO_MAP = {
  red: { label: 'レッドゾーン', color: '#dc2626', bgColor: '#fee2e2' },
  yellow: { label: 'イエローゾーン', color: '#eab308', bgColor: '#fef3c7' }
}

// ヘルパー関数（コンポーネント外で定義）
const getOperationalStatusInfo = (status) => {
  return OPERATIONAL_STATUS_MAP[status] || { label: status || '-', color: '#6b7280', bgColor: '#f3f4f6' }
}

const getFacilityTypeLabel = (type) => {
  return FACILITY_TYPE_LABELS[type] || type
}

const getZoneInfo = (zone) => {
  return ZONE_INFO_MAP[zone] || { label: zone, color: '#6b7280', bgColor: '#f3f4f6' }
}

/**
 * FacilityPopup - 施設詳細情報のポップアップ
 * @param {Object} facility - 施設情報
 * @param {number} screenX - ポップアップのX座標
 * @param {number} screenY - ポップアップのY座標
 * @param {Function} onClose - 閉じるボタンのコールバック
 */
const FacilityPopup = ({ facility, screenX, screenY, onClose }) => {
  const popupRef = useRef(null)
  const [position, setPosition] = useState({ left: screenX, top: screenY })

  // propsの更新に合わせて初期位置をリセット
  useEffect(() => {
    setPosition({ left: screenX, top: screenY })
  }, [screenX, screenY])

  // 画面端の検出と位置調整
  useEffect(() => {
    if (popupRef.current && facility) {
      const rect = popupRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      let left = screenX
      let top = screenY

      // 右端からはみ出る場合
      if (left + rect.width > viewportWidth) {
        left = viewportWidth - rect.width - 20
      }
      
      // 左端からはみ出る場合
      if (left < 10) left = 10

      // 下端からはみ出る場合
      if (top + rect.height > viewportHeight) {
        top = viewportHeight - rect.height - 20
      }

      // 上端からはみ出る場合
      if (top < 10) top = 10

      setPosition({ left, top })
    }
  }, [screenX, screenY, facility])

  if (!facility) return null

  const statusInfo = facility.operationalStatus ? getOperationalStatusInfo(facility.operationalStatus) : null
  const zoneInfo = getZoneInfo(facility.zone)

  return (
    <div
      ref={popupRef}
      className={styles.facilityPopup}
      style={{
        left: `${position.left}px`,
        top: `${position.top}px`
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

        {facility.coordinates && facility.coordinates.length >= 2 && (
          <div className={styles.row}>
            <span className={styles.label}>座標:</span>
            <span className={styles.value}>
              {facility.coordinates[1].toFixed(6)}, {facility.coordinates[0].toFixed(6)}
            </span>
          </div>
        )}

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
