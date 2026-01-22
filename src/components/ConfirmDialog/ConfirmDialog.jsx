/**
 * 確認ダイアログコンポーネント
 * window.confirm() の代替としてカスタムUIを提供
 */

import { useEffect, useRef, useCallback } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import styles from './ConfirmDialog.module.scss'

/**
 * @param {Object} props
 * @param {boolean} props.isOpen - ダイアログの表示状態
 * @param {string} [props.title] - ダイアログのタイトル
 * @param {string} props.message - 確認メッセージ
 * @param {string} [props.confirmText] - 確認ボタンのテキスト
 * @param {string} [props.cancelText] - キャンセルボタンのテキスト
 * @param {'danger' | 'warning' | 'info'} [props.variant] - ダイアログのタイプ
 * @param {function} props.onConfirm - 確認時のコールバック
 * @param {function} props.onCancel - キャンセル時のコールバック
 */
export default function ConfirmDialog({
  isOpen,
  title = '確認',
  message,
  confirmText = '確認',
  cancelText = 'キャンセル',
  variant = 'warning',
  onConfirm,
  onCancel
}) {
  const dialogRef = useRef(null)
  const confirmButtonRef = useRef(null)

  // ESCキーでキャンセル
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onCancel()
    }
  }, [onCancel])

  // フォーカス管理
  useEffect(() => {
    if (isOpen) {
      // ダイアログが開いたら確認ボタンにフォーカス
      confirmButtonRef.current?.focus()
      document.addEventListener('keydown', handleKeyDown)
      // スクロールを無効化
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleKeyDown])

  // オーバーレイクリックでキャンセル
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className={styles.overlay}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className={styles.dialog} ref={dialogRef}>
        <div className={`${styles.header} ${styles[variant]}`}>
          <AlertTriangle size={20} />
          <h2 id="confirm-dialog-title" className={styles.title}>{title}</h2>
          <button
            className={styles.closeButton}
            onClick={onCancel}
            aria-label="閉じる"
          >
            <X size={18} />
          </button>
        </div>

        <div className={styles.body}>
          <p className={styles.message}>{message}</p>
        </div>

        <div className={styles.footer}>
          <button
            className={styles.cancelButton}
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            ref={confirmButtonRef}
            className={`${styles.confirmButton} ${styles[variant]}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
