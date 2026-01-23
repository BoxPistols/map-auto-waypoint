import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, ChevronRight, Star } from 'lucide-react'
import styles from './ControlGroup.module.scss'

/**
 * ControlGroup - マップコントロールのグループ化コンポーネント
 * @param {string} id - グループID（localStorage用）
 * @param {React.ReactNode} icon - グループアイコン
 * @param {string} label - グループラベル
 * @param {React.ReactNode} children - 子要素（個別トグルボタン）
 * @param {boolean} defaultExpanded - 初期展開状態
 * @param {boolean} groupToggle - グループ全体のON/OFF機能を有効化
 * @param {boolean} groupEnabled - グループ全体の有効/無効状態
 * @param {Function} onGroupToggle - グループ全体のトグル時のコールバック
 * @param {boolean} favoritable - お気に入り機能を有効化
 * @param {boolean} isFavorite - お気に入り状態
 * @param {Function} onFavoriteToggle - お気に入りトグル時のコールバック
 */
const ControlGroup = ({
  id,
  icon,
  label,
  children,
  defaultExpanded = false,
  groupToggle = false,
  groupEnabled = false,
  onGroupToggle,
  favoritable = false,
  isFavorite = false,
  onFavoriteToggle
}) => {
  const storageKey = `controlGroup_${id}_expanded`

  // localStorageから初期状態を取得
  const getInitialExpanded = () => {
    const stored = localStorage.getItem(storageKey)
    return stored !== null ? stored === 'true' : defaultExpanded
  }

  const [isExpanded, setIsExpanded] = useState(getInitialExpanded)

  // 開閉状態をlocalStorageに保存
  useEffect(() => {
    localStorage.setItem(storageKey, isExpanded.toString())
  }, [isExpanded, storageKey])

  const toggleExpanded = () => {
    setIsExpanded(prev => !prev)
  }

  const handleGroupToggle = useCallback((e) => {
    e.stopPropagation()
    onGroupToggle?.(!groupEnabled)
  }, [groupEnabled, onGroupToggle])

  const handleFavoriteToggle = useCallback((e) => {
    e.stopPropagation()
    onFavoriteToggle?.(!isFavorite)
  }, [isFavorite, onFavoriteToggle])

  return (
    <div className={`${styles.controlGroup} ${isFavorite ? styles.favorite : ''}`}>
      <div className={styles.headerContainer}>
        <button
          className={`${styles.groupHeader} ${groupEnabled ? styles.groupActive : ''}`}
          onClick={toggleExpanded}
          data-tooltip={label}
          data-tooltip-pos="left"
        >
          <span className={styles.groupIcon}>{icon}</span>
          {label && <span className={styles.groupLabel}>{label}</span>}
          {groupToggle && (
            <input
              type="checkbox"
              className={styles.groupCheckbox}
              checked={groupEnabled}
              onChange={handleGroupToggle}
              onClick={(e) => e.stopPropagation()}
              title="グループ全体のON/OFF"
            />
          )}
          <span className={styles.chevron}>
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        </button>
        {favoritable && (
          <button
            className={`${styles.favoriteButton} ${isFavorite ? styles.active : ''}`}
            onClick={handleFavoriteToggle}
            data-tooltip={isFavorite ? 'お気に入り解除' : 'お気に入り'}
            data-tooltip-pos="left"
          >
            <Star size={14} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>

      {isExpanded && (
        <div className={styles.groupContent}>
          {children}
        </div>
      )}
    </div>
  )
}

export default ControlGroup
