import { useCallback } from 'react'
import { reindexWaypoints } from '../../../services/waypointGenerator'
import { getWaypointNumberingMode } from '../../../services/settingsService'

/**
 * マップクリック / 外部ファイルインポート関連の薄いハンドラ
 *
 * - handleMapClick: Shift+click 時のみ手動Waypoint追加
 * - handleImport: 外部からインポートしたポリゴンを追加
 */
export function useMapInteractions({
  drawMode,
  setWaypoints,
  setPolygons,
  showNotification,
}) {
  const handleMapClick = useCallback((latlng, e) => {
    if (!drawMode && e?.originalEvent?.shiftKey) {
      const newWaypoint = {
        id: crypto.randomUUID(),
        lat: latlng.lat,
        lng: latlng.lng,
        index: 0, // Will be reindexed
        polygonId: null,
        polygonName: '手動追加',
        type: 'manual'
      }
      setWaypoints(prev => reindexWaypoints([...prev, newWaypoint], { mode: getWaypointNumberingMode() }))
      showNotification('Waypointを追加しました')
    }
  }, [drawMode, setWaypoints, showNotification])

  const handleImport = useCallback((importedPolygons) => {
    setPolygons(prev => [...prev, ...importedPolygons])
    showNotification(`${importedPolygons.length} ポリゴンをインポートしました`)
  }, [setPolygons, showNotification])

  return { handleMapClick, handleImport }
}
