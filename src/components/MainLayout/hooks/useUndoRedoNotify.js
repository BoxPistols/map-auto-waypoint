import { useCallback } from 'react'

/**
 * Undo / Redo の薄いラッパー。成功時にトースト通知を出す。
 */
export function useUndoRedoNotify({ undo, redo, showNotification }) {
  const handleUndo = useCallback(() => {
    if (undo()) {
      showNotification('元に戻しました (Undo)')
    }
  }, [undo, showNotification])

  const handleRedo = useCallback(() => {
    if (redo()) {
      showNotification('やり直しました (Redo)')
    }
  }, [redo, showNotification])

  return { handleUndo, handleRedo }
}
