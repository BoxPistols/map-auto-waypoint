import { useEffect } from 'react'
import { JAPAN_OVERVIEW_CENTER, JAPAN_OVERVIEW_ZOOM } from '../utils/constants'

/**
 * グローバルキーボードショートカット
 *
 * 対応キー:
 *   - Cmd/Ctrl+K: 検索フォーム展開
 *   - Cmd/Ctrl+Shift+K: 設定モーダル
 *   - Cmd/Ctrl+Shift+D: テーマトグル
 *   - Cmd/Ctrl+/ または ?: ヘルプ
 *   - Cmd/Ctrl+Z / Cmd/Ctrl+Shift+Z: Undo/Redo
 *   - ESC: 編集キャンセル
 *   - 0: 日本全国俯瞰 ⇔ 元の位置
 *   - S/P/W/C/L/O/F/V: 各種パネル/モード
 */
export function useKeyboardShortcuts(params) {
  const {
    handleUndo,
    handleRedo,
    sidebarCollapsed,
    setSidebarCollapsed,
    setActivePanel,
    setShowChat,
    setShowFlightRequirements,
    setShowWeatherForecast,
    setFullMapMode,
    setShowApiSettings,
    setShowHelp,
    setIsSearchExpanded,
    toggleTheme,
    editingPolygon,
    setEditingPolygon,
    showNotification,
    selectedPolygonId,
    polygons,
    handleEditPolygonShape,
    savedViewState,
    setSavedViewState,
    center,
    zoom,
    setCenter,
    setZoom,
  } = params

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd+K (Mac) or Ctrl+K (Win) for Search - must be before input check
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsSearchExpanded(true)
        return
      }

      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return
      }

      // Cmd+Shift+K (Mac) or Ctrl+Shift+K (Win) for Settings modal
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setShowApiSettings(prev => !prev)
        return
      }

      // Cmd+Shift+D (Mac) or Ctrl+Shift+D (Win) for Theme toggle
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        toggleTheme()
        return
      }

      // Cmd+/ (Mac) or Ctrl+/ (Win) for Help
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        setShowHelp(prev => !prev)
        return
      }

      // ? key
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        setShowHelp(prev => !prev)
        return
      }

      // Cmd+Z (Mac) or Ctrl+Z (Win) for Undo
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          handleRedo()
        } else {
          handleUndo()
        }
        return
      }

      // ESC key - cancel editing mode
      if (e.key === 'Escape' && editingPolygon) {
        e.preventDefault()
        setEditingPolygon(null)
        showNotification('編集をキャンセルしました')
        return
      }

      // Single key shortcuts
      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        // [0] key: Japan overview ⇔ Return to saved position
        if (e.key === '0') {
          e.preventDefault()
          if (savedViewState) {
            // 2nd press: Return to saved position
            setCenter(savedViewState.center)
            setZoom(savedViewState.zoom)
            setSavedViewState(null)
            showNotification('元の位置に戻りました')
          } else {
            // 1st press: Save current position and show Japan overview
            setSavedViewState({ center, zoom })
            setCenter(JAPAN_OVERVIEW_CENTER)
            setZoom(JAPAN_OVERVIEW_ZOOM)
            showNotification('日本全国俯瞰表示（もう一度 [0] で戻る）')
          }
          return
        }

        switch (e.key.toLowerCase()) {
          case 's': // Toggle sidebar
            e.preventDefault()
            setSidebarCollapsed(prev => {
              const newValue = !prev
              localStorage.setItem('sidebarCollapsed', String(newValue))
              return newValue
            })
            break
          case 'p': // Switch to Polygon panel
            e.preventDefault()
            setActivePanel('polygons')
            if (sidebarCollapsed) setSidebarCollapsed(false)
            break
          case 'w': // Switch to Waypoint panel
            e.preventDefault()
            setActivePanel('waypoints')
            if (sidebarCollapsed) setSidebarCollapsed(false)
            break
          case 'c': // Toggle Chat
            e.preventDefault()
            setShowChat(prev => !prev)
            break
          case 'l': // Toggle Flight Requirements
            e.preventDefault()
            setShowFlightRequirements(prev => !prev)
            break
          case 'o': // Toggle Weather Forecast
            e.preventDefault()
            setShowWeatherForecast(prev => !prev)
            break
          // TODO: Issue #39 - 安全性チェッカーのエラー解決後に復活
          // case 'k': // Toggle Safety Checker
          //   e.preventDefault()
          //   setShowDroneDashboard(prev => !prev)
          //   break
          case 'f': // Toggle Full Map Mode
            e.preventDefault()
            setFullMapMode(prev => {
              if (!prev) {
                setSidebarCollapsed(true)
                setShowChat(false)
              }
              return !prev
            })
            break
          case 'v': // Edit polygon shape
            e.preventDefault()
            if (selectedPolygonId) {
              const polygon = polygons.find(p => p.id === selectedPolygonId)
              if (polygon) {
                handleEditPolygonShape(polygon)
              }
            }
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    handleUndo,
    handleRedo,
    sidebarCollapsed,
    setSidebarCollapsed,
    setActivePanel,
    setShowChat,
    setShowFlightRequirements,
    setShowWeatherForecast,
    setFullMapMode,
    setShowApiSettings,
    setShowHelp,
    setIsSearchExpanded,
    toggleTheme,
    editingPolygon,
    setEditingPolygon,
    showNotification,
    selectedPolygonId,
    polygons,
    handleEditPolygonShape,
    savedViewState,
    setSavedViewState,
    center,
    zoom,
    setCenter,
    setZoom,
  ])
}
