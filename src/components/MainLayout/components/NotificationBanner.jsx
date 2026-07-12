import { X } from 'lucide-react'

/**
 * 画面下部に表示する通知バナー
 * - notification.action 付きの場合はアクションボタン + 閉じるボタンを表示
 */
export default function NotificationBanner({ notification, hideNotification }) {
  if (!notification) return null

  return (
    <div className={`notification ${notification.type} ${notification.action ? 'has-action' : ''}`}>
      <span>{notification.message}</span>
      {notification.action && (
        <>
          <button
            className="notification-action"
            onClick={() => {
              notification.action.onClick()
              hideNotification()
            }}
          >
            {notification.action.label}
          </button>
          <button
            className="notification-close"
            onClick={() => hideNotification()}
            aria-label="閉じる"
          >
            <X size={14} />
          </button>
        </>
      )}
    </div>
  )
}
