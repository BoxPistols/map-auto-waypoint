/**
 * useMapSelection Hook
 *
 * 選択ボックスによる複数ウェイポイント選択機能
 */

import { useState, useCallback, useEffect } from 'react'

/**
 * @param {Object} params
 * @param {React.RefObject} params.mapRef - Map reference
 * @param {Array} params.waypoints - Waypoint array
 * @param {boolean} params.drawMode - Drawing mode state
 * @param {Object|null} params.editingPolygon - Editing polygon state
 * @param {Function} params.onWaypointsBulkDelete - Bulk delete callback
 * @returns {Object} Selection state and handlers
 */
export const useMapSelection = ({
  mapRef,
  waypoints,
  drawMode,
  editingPolygon,
  onWaypointsBulkDelete
}) => {
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionBox, setSelectionBox] = useState(null)
  const [selectedWaypointIds, setSelectedWaypointIds] = useState(new Set())

  // Start selection box (Shift + drag)
  const handleSelectionStart = useCallback((e) => {
    if (!e.originalEvent.shiftKey || drawMode || editingPolygon) return

    setIsSelecting(true)
    const rect = e.target.getCanvas().getBoundingClientRect()
    const x = e.originalEvent.clientX - rect.left
    const y = e.originalEvent.clientY - rect.top
    setSelectionBox({ startX: x, startY: y, endX: x, endY: y })
    setSelectedWaypointIds(new Set())
  }, [drawMode, editingPolygon])

  // Move selection box
  const handleSelectionMove = useCallback((e) => {
    if (!selectionBox) return

    const rect = e.target.getCanvas().getBoundingClientRect()
    const x = e.originalEvent.clientX - rect.left
    const y = e.originalEvent.clientY - rect.top
    setSelectionBox(prev => prev ? { ...prev, endX: x, endY: y } : null)
  }, [selectionBox])

  // End selection and find waypoints within box
  const handleSelectionEnd = useCallback(() => {
    if (!selectionBox || !mapRef.current) {
      setIsSelecting(false)
      setSelectionBox(null)
      return
    }

    // Calculate selection bounds
    const map = mapRef.current.getMap()
    const minX = Math.min(selectionBox.startX, selectionBox.endX)
    const maxX = Math.max(selectionBox.startX, selectionBox.endX)
    const minY = Math.min(selectionBox.startY, selectionBox.endY)
    const maxY = Math.max(selectionBox.startY, selectionBox.endY)

    // Find waypoints within selection
    const selected = new Set()
    waypoints.forEach(wp => {
      const point = map.project([wp.lng, wp.lat])
      if (point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY) {
        selected.add(wp.id)
      }
    })

    setSelectedWaypointIds(selected)
    setIsSelecting(false)
    setSelectionBox(null)
  }, [selectionBox, waypoints, mapRef])

  // Keyboard handler for bulk delete (Delete/Backspace) and clear selection (Escape)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedWaypointIds.size > 0) {
        e.preventDefault()
        if (confirm(`選択した ${selectedWaypointIds.size} 個のWaypointを削除しますか?`)) {
          onWaypointsBulkDelete?.(Array.from(selectedWaypointIds))
          setSelectedWaypointIds(new Set())
        }
      }
      // Escape to clear selection
      if (e.key === 'Escape') {
        setSelectedWaypointIds(new Set())
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedWaypointIds, onWaypointsBulkDelete])

  return {
    isSelecting,
    selectionBox,
    selectedWaypointIds,
    setSelectedWaypointIds,
    handlers: {
      onMouseDown: handleSelectionStart,
      onMouseMove: handleSelectionMove,
      onMouseUp: handleSelectionEnd
    }
  }
}
