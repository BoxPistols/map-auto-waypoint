import { useState, useCallback } from 'react'
import {
  polygonToWaypoints,
  generateAllWaypoints,
  getPolygonCenter,
  generateGridWaypoints,
  generatePerimeterWaypoints,
  reindexWaypoints,
} from '../../../services/waypointGenerator'
import { getWaypointNumberingMode } from '../../../services/settingsService'
import { calculateZoomForBounds } from '../utils/mapZoom'

/**
 * ポリゴン関連の CRUD ハンドラ群を提供する hook
 */
export function usePolygonOperations({
  polygons,
  setPolygons,
  waypoints,
  setWaypoints,
  selectedPolygonId,
  setSelectedPolygonId,
  setDrawMode,
  setCenter,
  setZoom,
  setLastSearchResult,
  setShowFlightRequirements,
  setActivePanel,
  setShowRouteOptimizer,
  showNotification,
  showConfirm,
}) {
  // 編集中ポリゴン
  const [editingPolygon, setEditingPolygon] = useState(null)
  // Grid generation 表示用ポリゴン
  const [showGridSettings, setShowGridSettings] = useState(null)

  // ポリゴン作成
  const handlePolygonCreate = useCallback((polygon) => {
    setPolygons(prev => [...prev, polygon])
    setDrawMode(false)
    showNotification('ポリゴンを作成しました')
  }, [setPolygons, setDrawMode, showNotification])

  // ポリゴン更新（geometry のみ）
  const handlePolygonUpdate = useCallback((feature) => {
    setPolygons(prev => prev.map(p =>
      p.id === feature.id ? { ...p, geometry: feature.geometry } : p
    ))
  }, [setPolygons])

  // ポリゴン削除
  const handlePolygonDelete = useCallback((id) => {
    setPolygons(prev => prev.filter(p => p.id !== id))
    setWaypoints(prev => reindexWaypoints(prev.filter(w => w.polygonId !== id), { mode: getWaypointNumberingMode() }))
    if (selectedPolygonId === id) {
      setSelectedPolygonId(null)
    }
    showNotification('ポリゴンを削除しました')
  }, [selectedPolygonId, setPolygons, setWaypoints, setSelectedPolygonId, showNotification])

  // ポリゴン名称変更
  const handlePolygonRename = useCallback((id, name) => {
    setPolygons(prev => prev.map(p =>
      p.id === id ? { ...p, name } : p
    ))
    setWaypoints(prev => prev.map(w =>
      w.polygonId === id ? { ...w, polygonName: name } : w
    ))
  }, [setPolygons, setWaypoints])

  // Waypointリンクトグル
  const handleToggleWaypointLink = useCallback((id) => {
    setPolygons(prev => prev.map(p =>
      p.id === id ? { ...p, waypointLinked: p.waypointLinked === false ? true : false } : p
    ))
  }, [setPolygons])

  // 形状編集開始
  const handleEditPolygonShape = useCallback((polygon) => {
    setEditingPolygon(polygon)
    setSelectedPolygonId(polygon.id)
    setDrawMode(false) // Disable draw mode when editing
    showNotification('ポリゴンを編集中です。頂点をドラッグして変更、または外側をクリックで完了。')
  }, [setSelectedPolygonId, setDrawMode, showNotification])

  // 形状編集完了
  const handlePolygonEditComplete = useCallback((updatedFeature) => {
    setPolygons(prev => {
      const updated = prev.map(p =>
        p.id === updatedFeature.id ? { ...p, geometry: updatedFeature.geometry } : p
      )

      const polygon = updated.find(p => p.id === updatedFeature.id)

      // 連動ON時はWaypointを種別と件数を保ったまま再生成
      if (polygon && polygon.waypointLinked !== false) {
        setWaypoints(prevWaypoints => {
          const existingWaypoints = prevWaypoints.filter(w => w.polygonId === polygon.id)
          const otherWaypoints = prevWaypoints.filter(w => w.polygonId !== polygon.id)

          if (existingWaypoints.length === 0) {
            return prevWaypoints
          }

          const waypointType = existingWaypoints[0]?.type || 'vertex'
          const waypointCount = existingWaypoints.length

          let newWaypoints = []
          const updatedPolygon = { ...polygon, geometry: updatedFeature.geometry }

          if (waypointType === 'perimeter') {
            newWaypoints = generatePerimeterWaypoints(updatedPolygon, waypointCount)
          } else if (waypointType === 'grid') {
            newWaypoints = polygonToWaypoints(updatedPolygon)
          } else {
            newWaypoints = polygonToWaypoints(updatedPolygon)
          }

          let index = otherWaypoints.length + 1
          const reindexedNew = newWaypoints.map(wp => ({ ...wp, index: index++ }))

          showNotification(`ポリゴンを更新し、${reindexedNew.length} Waypointを再生成しました`)
          return [...otherWaypoints, ...reindexedNew]
        })
      } else {
        showNotification('ポリゴンを更新しました')
      }

      return updated
    })
  }, [setPolygons, setWaypoints, showNotification])

  // 編集終了
  const handleFinishEditing = useCallback(() => {
    setEditingPolygon(null)
  }, [])

  // サイドバーからの選択（カメラ移動 + 飛行要件パネル表示）
  const handlePolygonSelect = useCallback((polygon) => {
    setSelectedPolygonId(polygon.id)
    const polyCenter = getPolygonCenter(polygon)
    if (polyCenter) {
      setCenter(polyCenter)
      const appropriateZoom = calculateZoomForBounds(polygon.geometry)
      setZoom(appropriateZoom)
    }
    setLastSearchResult(null)
    setShowFlightRequirements(true)
  }, [setSelectedPolygonId, setCenter, setZoom, setLastSearchResult, setShowFlightRequirements])

  // マップ上での選択 (Zoom/Centerを変更しない)
  const handlePolygonSelectFromMap = useCallback((polygonId) => {
    setSelectedPolygonId(polygonId)
  }, [setSelectedPolygonId])

  // Waypoint生成 (単一ポリゴン)
  const handleGenerateWaypoints = useCallback(async (polygon, options = {}) => {
    const { includeGrid = false } = options

    if (includeGrid) {
      setShowGridSettings(polygon)
      return
    }

    const existingVertexWaypoints = waypoints.filter(
      w => w.polygonId === polygon.id && w.type === 'vertex'
    )

    if (existingVertexWaypoints.length > 0) {
      const confirmed = await showConfirm({
        title: 'Waypoint再生成',
        message: '既存のWaypointがあります。ポリゴンの頂点位置から再生成しますか？（現在のWaypoint位置は失われます）',
        confirmText: '再生成',
        cancelText: 'キャンセル',
        variant: 'warning'
      })
      if (!confirmed) {
        return
      }
    }

    const newWaypoints = polygonToWaypoints(polygon)

    setWaypoints(prev => reindexWaypoints([
      ...prev.filter(w => w.polygonId !== polygon.id),
      ...newWaypoints
    ], { mode: getWaypointNumberingMode() }))
    showNotification(`${newWaypoints.length} Waypointを生成しました`)
    setActivePanel('waypoints')
  }, [waypoints, setWaypoints, showNotification, showConfirm, setActivePanel])

  // Grid設定確定
  const handleGridSettingsConfirm = useCallback((settings) => {
    const polygon = showGridSettings
    if (!polygon) return

    const { spacing, includeVertices } = settings

    let newWaypoints = []

    if (includeVertices) {
      const vertexWaypoints = polygonToWaypoints(polygon)
      newWaypoints.push(...vertexWaypoints)
    }

    const gridWaypoints = generateGridWaypoints(polygon, spacing)
    newWaypoints.push(...gridWaypoints)

    setWaypoints(prev => reindexWaypoints([
      ...prev.filter(w => w.polygonId !== polygon.id),
      ...newWaypoints
    ], { mode: getWaypointNumberingMode() }))

    setShowGridSettings(null)
    setActivePanel('waypoints')

    if (newWaypoints.length >= 2) {
      showNotification(
        `${newWaypoints.length} Waypointを生成しました`,
        'info',
        {
          label: 'ルートを最適化',
          onClick: () => setShowRouteOptimizer(true),
        }
      )
    } else {
      showNotification(`${newWaypoints.length} Waypointを生成しました（${spacing}m間隔）`)
    }
  }, [showGridSettings, setWaypoints, showNotification, setActivePanel, setShowRouteOptimizer])

  // 全ポリゴンからWaypoint生成
  const handleGenerateAllWaypoints = useCallback(() => {
    if (polygons.length === 0) return
    const newWaypoints = generateAllWaypoints(polygons)
    setWaypoints(newWaypoints)
    setActivePanel('waypoints')

    if (newWaypoints.length >= 2) {
      showNotification(
        `${newWaypoints.length} Waypointを生成しました`,
        'info',
        {
          label: 'ルートを最適化',
          onClick: () => setShowRouteOptimizer(true),
        }
      )
    } else {
      showNotification(`${newWaypoints.length} Waypointを生成しました`)
    }
  }, [polygons, setWaypoints, showNotification, setActivePanel, setShowRouteOptimizer])

  return {
    editingPolygon,
    setEditingPolygon,
    showGridSettings,
    setShowGridSettings,
    handlePolygonCreate,
    handlePolygonUpdate,
    handlePolygonDelete,
    handlePolygonRename,
    handleToggleWaypointLink,
    handleEditPolygonShape,
    handlePolygonEditComplete,
    handleFinishEditing,
    handlePolygonSelect,
    handlePolygonSelectFromMap,
    handleGenerateWaypoints,
    handleGridSettingsConfirm,
    handleGenerateAllWaypoints,
  }
}
