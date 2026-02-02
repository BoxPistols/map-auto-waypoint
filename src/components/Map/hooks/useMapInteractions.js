import { useState, useRef } from 'react'

/**
 * マップ上のユーザーインタラクション状態を管理するカスタムフック
 * （コンテキストメニュー、ツールチップ、選択など）
 *
 * @returns {Object} インタラクション状態とセッター
 */
export const useMapInteractions = () => {
  // 範囲選択状態
  const [selectionBox, setSelectionBox] = useState(null) // {startX, startY, endX, endY}
  const [selectedWaypointIds, setSelectedWaypointIds] = useState(new Set())
  const [isSelecting, setIsSelecting] = useState(false)

  // コンテキストメニュー
  const [contextMenu, setContextMenu] = useState(null) // { isOpen, position, waypoint }
  const [polygonContextMenu, setPolygonContextMenu] = useState(null) // { isOpen, position, polygon }
  const [vertexListModal, setVertexListModal] = useState(null) // { polygon }

  // ツールチップ
  const [tooltip, setTooltip] = useState(null) // { isVisible, position, data, type }
  const hoverTimeoutRef = useRef(null)
  const isWaypointHoveringRef = useRef(false)

  // 施設ポップアップ
  const [facilityPopup, setFacilityPopup] = useState(null) // { facility, screenX, screenY }

  // 制限表面タイルの最終キー（再取得防止用）
  const lastRestrictionSurfaceKey = useRef(null)

  return {
    // 範囲選択
    selectionBox,
    setSelectionBox,
    selectedWaypointIds,
    setSelectedWaypointIds,
    isSelecting,
    setIsSelecting,

    // コンテキストメニュー
    contextMenu,
    setContextMenu,
    polygonContextMenu,
    setPolygonContextMenu,
    vertexListModal,
    setVertexListModal,

    // ツールチップ
    tooltip,
    setTooltip,
    hoverTimeoutRef,
    isWaypointHoveringRef,

    // 施設ポップアップ
    facilityPopup,
    setFacilityPopup,

    // その他
    lastRestrictionSurfaceKey,
  }
}
