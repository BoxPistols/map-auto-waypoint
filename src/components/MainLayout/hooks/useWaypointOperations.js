import { useState, useCallback } from 'react'
import { reindexWaypoints } from '../../../services/waypointGenerator'
import { getWaypointNumberingMode } from '../../../services/settingsService'
import { addElevationToWaypoints } from '../../../services/elevation'

/**
 * Waypoint 関連の CRUD ハンドラ群を提供する hook
 */
export function useWaypointOperations({
  polygons,
  setPolygons,
  waypoints,
  setWaypoints,
  setSelectedPolygonId,
  setEditingPolygon,
  setDrawMode,
  setCenter,
  setZoom,
  showNotification,
}) {
  // 標高取得関連
  const [isLoadingElevation, setIsLoadingElevation] = useState(false)
  const [elevationProgress, setElevationProgress] = useState(null)

  // 最適化ルート
  const [optimizedRoute, setOptimizedRoute] = useState(null)

  // 標高取得
  const handleFetchElevation = useCallback(async () => {
    if (waypoints.length === 0) return
    setIsLoadingElevation(true)
    setElevationProgress({ current: 0, total: waypoints.length })

    try {
      const waypointsWithElevation = await addElevationToWaypoints(
        waypoints,
        (current, total) => setElevationProgress({ current, total })
      )
      setWaypoints(waypointsWithElevation)
      showNotification('標高データを取得しました')
    } catch (error) {
      console.error('Elevation fetch error:', error)
      showNotification('標高取得に失敗しました', 'error')
    } finally {
      setIsLoadingElevation(false)
      setElevationProgress(null)
    }
  }, [waypoints, setWaypoints, showNotification])

  // 最適化ルートを適用
  const handleApplyOptimizedRoute = useCallback((result) => {
    if (!result || !result.orderedWaypoints) return

    const reorderedWaypoints = result.orderedWaypoints.map((wp, idx) => ({
      ...wp,
      index: idx + 1,
    }))

    setWaypoints(reorderedWaypoints)
    setOptimizedRoute(result)
    showNotification(`最適ルートを適用しました（${result.totalFlights}フライト）`)
  }, [setWaypoints, showNotification])

  // ホームポイント移動
  const handleHomePointMove = useCallback((newPosition) => {
    if (!optimizedRoute) return
    setOptimizedRoute(prev => ({
      ...prev,
      homePoint: newPosition
    }))
    showNotification('ホームポイントを移動しました')
  }, [optimizedRoute, showNotification])

  // サイドバーからのWaypoint選択 - 親ポリゴンを編集モードに入る
  const handleWaypointSelect = useCallback((waypoint) => {
    setCenter({ lat: waypoint.lat, lng: waypoint.lng })
    setZoom(14)

    if (waypoint.polygonId) {
      const parentPolygon = polygons.find(p => p.id === waypoint.polygonId)
      if (parentPolygon) {
        setEditingPolygon(parentPolygon)
        setSelectedPolygonId(parentPolygon.id)
        setDrawMode(false)
        showNotification(`「${parentPolygon.name}」を編集中`)
      }
    }
  }, [polygons, setSelectedPolygonId, setEditingPolygon, setDrawMode, setCenter, setZoom, showNotification])

  // マップ上でWaypointクリック - 親ポリゴンを選択のみ（編集モード入らない）
  const handleWaypointClickOnMap = useCallback((waypoint) => {
    if (waypoint.polygonId) {
      setSelectedPolygonId(waypoint.polygonId)
    }
  }, [setSelectedPolygonId])

  // Waypoint削除（reindex付き）
  const handleWaypointDelete = useCallback((id) => {
    setWaypoints(prev => {
      const filtered = prev.filter(w => w.id !== id)
      return reindexWaypoints(filtered, { mode: getWaypointNumberingMode() })
    })
    showNotification('Waypointを削除しました（番号再整理済）')
  }, [setWaypoints, showNotification])

  // 一括削除
  const handleWaypointsBulkDelete = useCallback((ids) => {
    const idSet = new Set(ids)
    setWaypoints(prev => {
      const filtered = prev.filter(w => !idSet.has(w.id))
      return reindexWaypoints(filtered, { mode: getWaypointNumberingMode() })
    })
    showNotification(`${ids.length} 個のWaypointを削除しました（番号再整理済）`)
  }, [setWaypoints, showNotification])

  // Waypoint移動 - ポリゴン形状も追従更新
  const handleWaypointMove = useCallback((id, newLat, newLng) => {
    const waypoint = waypoints.find(w => w.id === id)

    const updatedWaypoints = waypoints.map(w =>
      w.id === id ? { ...w, lat: newLat, lng: newLng, elevation: null } : w
    )
    setWaypoints(updatedWaypoints)

    // manual / grid は ポリゴン更新スキップ
    if (!waypoint || !waypoint.polygonId || waypoint.type === 'manual' || waypoint.type === 'grid') {
      return
    }

    // grid/manual を除いたWaypointのみでポリゴン再構築
    const polygonWaypoints = updatedWaypoints
      .filter(w => w.polygonId === waypoint.polygonId && w.type !== 'grid' && w.type !== 'manual')
      .sort((a, b) => a.index - b.index)

    if (polygonWaypoints.length < 3) return

    const newCoords = polygonWaypoints.map(w => [w.lng, w.lat])
    newCoords.push([polygonWaypoints[0].lng, polygonWaypoints[0].lat])

    setPolygons(prev => prev.map(p => {
      if (p.id !== waypoint.polygonId) return p

      return {
        ...p,
        geometry: {
          ...p.geometry,
          coordinates: [newCoords]
        }
      }
    }))
  }, [waypoints, setWaypoints, setPolygons])

  // Waypoint更新 (名前/座標等の編集)
  const handleWaypointUpdate = useCallback((id, updateData) => {
    setWaypoints(prev => prev.map(w =>
      w.id === id ? { ...w, ...updateData } : w
    ))
    showNotification('Waypointを更新しました')
  }, [setWaypoints, showNotification])

  // Waypoint 全消去
  const handleWaypointClear = useCallback(() => {
    setWaypoints([])
    showNotification('すべてのWaypointを削除しました')
  }, [setWaypoints, showNotification])

  return {
    isLoadingElevation,
    elevationProgress,
    optimizedRoute,
    setOptimizedRoute,
    handleFetchElevation,
    handleApplyOptimizedRoute,
    handleHomePointMove,
    handleWaypointSelect,
    handleWaypointClickOnMap,
    handleWaypointDelete,
    handleWaypointsBulkDelete,
    handleWaypointMove,
    handleWaypointUpdate,
    handleWaypointClear,
  }
}
