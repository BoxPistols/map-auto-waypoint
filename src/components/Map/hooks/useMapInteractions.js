import { useState, useRef } from 'react'

/**
 * マップ上のユーザーインタラクション状態を管理するカスタムフック
 * （コンテキストメニュー、ツールチップ、選択など）
 *
 * @returns {Object} インタラクション状態とセッター
 */
export const useMapInteractions = () => {
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
