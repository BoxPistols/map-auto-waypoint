/**
 * 安全性インジケーター
 * カラーコード化された安全レベル表示
 */

import styles from './SafetyIndicator.module.scss'

const LEVEL_COLORS = {
  safe: '#22c55e',
  caution: '#eab308',
  warning: '#f97316',
  danger: '#ef4444',
  prohibited: '#991b1b'
}

/**
 * @param {Object} props
 * @param {'safe' | 'caution' | 'warning' | 'danger' | 'prohibited'} props.level - 安全レベル
 * @param {string} props.label - ラベルテキスト
 * @param {string} [props.value] - オプションの値表示
 */
export default function SafetyIndicator({ level, label, value }) {
  const color = LEVEL_COLORS[level] || '#6b7280'

  return (
    <div className={styles.indicator}>
      <span
        className={styles.dot}
        style={{
          backgroundColor: color,
          boxShadow: `0 0 8px ${color}`
        }}
      />
      <span className={styles.label}>{label}</span>
      {value && <span className={styles.value}>{value}</span>}
    </div>
  )
}
