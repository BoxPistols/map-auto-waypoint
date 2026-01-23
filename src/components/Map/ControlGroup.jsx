import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import styles from './ControlGroup.module.scss'

/**
 * ControlGroup - マップコントロールのグループ化コンポーネント
 * @param {string} id - グループID（localStorage用）
 * @param {React.ReactNode} icon - グループアイコン
 * @param {string} label - グループラベル
 * @param {React.ReactNode} children - 子要素（個別トグルボタン）
 * @param {boolean} defaultExpanded - 初期展開状態
 */
const ControlGroup = ({
  id,
  icon,
  label,
  children,
  defaultExpanded = false
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

  return (
    <div className={styles.controlGroup}>
      <button
        className={styles.groupHeader}
        onClick={toggleExpanded}
        data-tooltip={label}
        data-tooltip-pos="left"
      >
        <span className={styles.groupIcon}>{icon}</span>
        <span className={styles.chevron}>
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>

      {isExpanded && (
        <div className={styles.groupContent}>
          {children}
        </div>
      )}
    </div>
  )
}

export default ControlGroup
