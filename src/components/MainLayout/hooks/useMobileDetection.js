import { useState, useEffect, useCallback } from 'react'

/**
 * モバイル検出とフルマップモードを管理する hook
 *
 * - isMobile: 768px以下かどうか
 * - sidebarCollapsed / setSidebarCollapsed: サイドバー折りたたみ状態(localStorage永続化)
 * - toggleSidebar: 折りたたみトグル
 * - fullMapMode / toggleFullMapMode: フルマップモードトグル
 * - setShowChat 引数は フルマップ突入時に閉じる用
 */
export function useMobileDetection({ onEnterFullMapMode } = {}) {
  // Mobile detection
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768)

  // フルマップモード状態
  const [fullMapMode, setFullMapMode] = useState(false)

  // Sidebar collapsed (mobile 既定は折りたたみ)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed')
    if (window.innerWidth <= 768) return true
    return saved === 'true'
  })

  // モバイル検出 (resize listener)
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)
      // Auto-collapse sidebar when switching to mobile
      if (mobile && !sidebarCollapsed) {
        setSidebarCollapsed(true)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [sidebarCollapsed])

  // サイドバーのトグル
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      const newValue = !prev
      localStorage.setItem('sidebarCollapsed', String(newValue))
      return newValue
    })
  }, [])

  // フルマップモードのトグル
  const toggleFullMapMode = useCallback(() => {
    setFullMapMode(prev => {
      if (!prev) {
        // フルマップモードに入る時
        setSidebarCollapsed(true)
        if (onEnterFullMapMode) onEnterFullMapMode()
      }
      return !prev
    })
  }, [onEnterFullMapMode])

  return {
    isMobile,
    sidebarCollapsed,
    setSidebarCollapsed,
    toggleSidebar,
    fullMapMode,
    setFullMapMode,
    toggleFullMapMode,
  }
}
