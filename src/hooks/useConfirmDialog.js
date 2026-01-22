/**
 * 確認ダイアログ用カスタムフック
 * Promise ベースで window.confirm() の代替を提供
 */

import { useState, useCallback } from 'react'

/**
 * @typedef {Object} ConfirmDialogOptions
 * @property {string} [title] - ダイアログのタイトル
 * @property {string} message - 確認メッセージ
 * @property {string} [confirmText] - 確認ボタンのテキスト
 * @property {string} [cancelText] - キャンセルボタンのテキスト
 * @property {'danger' | 'warning' | 'info'} [variant] - ダイアログのタイプ
 */

/**
 * 確認ダイアログを管理するフック
 * @returns {Object} confirmDialog state and showConfirm function
 */
export const useConfirmDialog = () => {
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    title: '確認',
    message: '',
    confirmText: '確認',
    cancelText: 'キャンセル',
    variant: 'warning',
    resolve: null
  })

  /**
   * 確認ダイアログを表示
   * @param {ConfirmDialogOptions} options - ダイアログオプション
   * @returns {Promise<boolean>} ユーザーの選択結果
   */
  const showConfirm = useCallback((options) => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        title: options.title || '確認',
        message: options.message,
        confirmText: options.confirmText || '確認',
        cancelText: options.cancelText || 'キャンセル',
        variant: options.variant || 'warning',
        resolve
      })
    })
  }, [])

  const handleConfirm = useCallback(() => {
    if (dialogState.resolve) {
      dialogState.resolve(true)
    }
    setDialogState(prev => ({ ...prev, isOpen: false, resolve: null }))
  }, [dialogState.resolve])

  const handleCancel = useCallback(() => {
    if (dialogState.resolve) {
      dialogState.resolve(false)
    }
    setDialogState(prev => ({ ...prev, isOpen: false, resolve: null }))
  }, [dialogState.resolve])

  return {
    dialogState: {
      isOpen: dialogState.isOpen,
      title: dialogState.title,
      message: dialogState.message,
      confirmText: dialogState.confirmText,
      cancelText: dialogState.cancelText,
      variant: dialogState.variant
    },
    showConfirm,
    handleConfirm,
    handleCancel
  }
}
