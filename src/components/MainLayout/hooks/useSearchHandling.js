import { useCallback } from 'react'
import { saveSearchHistory } from '../../../utils/storage'
import { searchAddress } from '../../../services/geocoding'
import { getWaypointNumberingMode } from '../../../services/settingsService'
import {
  generatePerimeterWaypoints,
  reindexWaypoints,
  getPolygonCenter,
} from '../../../services/waypointGenerator'
import { createPolygonFromSearchResult } from '../../../services/polygonGenerator'
import { calculateZoomForBounds } from '../utils/mapZoom'

/**
 * 検索処理関連の hook
 *
 * - handleSearch: 検索クエリで住所を検索し、最初の結果へカメラ移動
 * - handleSearchSelect: 検索結果から選択された場所へ移動 + 飛行要件パネルを開く
 * - handleGeneratePolygon: 検索結果からポリゴンを生成しウェイポイントを配置
 */
export function useSearchHandling({
  setCenter,
  setZoom,
  setLastSearchResult,
  setShowFlightRequirements,
  setPolygons,
  setWaypoints,
  setShowRouteOptimizer,
  showNotification,
}) {
  const handleSearch = useCallback(async (query) => {
    const results = await searchAddress(query)
    if (results.length > 0) {
      const first = results[0]
      saveSearchHistory(query, results)
      setCenter({ lat: first.lat, lng: first.lng })
      setZoom(14)
      showNotification(`「${first.displayName.split(',')[0]}」を表示しました`)
    } else {
      showNotification('検索結果が見つかりませんでした', 'warning')
    }
  }, [showNotification, setCenter, setZoom])

  const handleSearchSelect = useCallback((result) => {
    if (!result) return
    setCenter({ lat: result.lat, lng: result.lng })
    setZoom(14)
    setLastSearchResult(result)
    setShowFlightRequirements(true)
    showNotification(`「${result.displayName.split(',')[0]}」を表示しました`)
  }, [showNotification, setCenter, setZoom, setLastSearchResult, setShowFlightRequirements])

  const handleGeneratePolygon = useCallback((searchResult, options = {}) => {
    if (!searchResult) return
    const { waypointCount = 8 } = options
    const polygon = createPolygonFromSearchResult(searchResult, options)
    setPolygons(prev => [...prev, polygon])

    // Use generatePerimeterWaypoints to distribute waypoints evenly along the perimeter
    const newWaypoints = generatePerimeterWaypoints(polygon, waypointCount)
    setWaypoints(prev => reindexWaypoints([...prev, ...newWaypoints], { mode: getWaypointNumberingMode() }))

    const polyCenter = getPolygonCenter(polygon.geometry)
    if (polyCenter) {
      setCenter(polyCenter)
      const appropriateZoom = calculateZoomForBounds(polygon.geometry)
      setZoom(appropriateZoom)
    }

    if (newWaypoints.length >= 2) {
      showNotification(
        `ポリゴンとWaypoint(${newWaypoints.length}個)を生成しました`,
        'info',
        {
          label: 'ルートを最適化',
          onClick: () => setShowRouteOptimizer(true),
        }
      )
    } else {
      showNotification(`ポリゴンとWaypoint(${newWaypoints.length}個)を生成しました`)
    }
  }, [setPolygons, setWaypoints, showNotification, setCenter, setZoom, setShowRouteOptimizer])

  return { handleSearch, handleSearchSelect, handleGeneratePolygon }
}
