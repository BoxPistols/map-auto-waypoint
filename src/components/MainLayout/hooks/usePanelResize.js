import { useState, useRef, useCallback } from 'react'

/**
 * サイドバーパネルのドラッグでリサイズする hook
 *
 * @returns {{
 *   panelContentRef: React.RefObject,
 *   panelHeight: number | null,
 *   setPanelHeight: (height:number|null) => void,
 *   handleResizeStart: (e:MouseEvent) => void,
 * }}
 */
export function usePanelResize() {
  const [panelHeight, setPanelHeight] = useState(null) // null = auto
  const panelContentRef = useRef(null)
  const isResizingRef = useRef(false)

  const handleResizeStart = useCallback((e) => {
    e.preventDefault()
    isResizingRef.current = true
    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'

    const startY = e.clientY
    const startHeight = panelContentRef.current?.offsetHeight || 200

    const handleMouseMove = (moveEvent) => {
      if (!isResizingRef.current) return
      const deltaY = moveEvent.clientY - startY
      const newHeight = Math.max(100, Math.min(600, startHeight + deltaY))
      setPanelHeight(newHeight)
    }

    const handleMouseUp = () => {
      isResizingRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [])

  return {
    panelContentRef,
    panelHeight,
    setPanelHeight,
    handleResizeStart,
  }
}
