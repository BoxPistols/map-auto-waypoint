import { useCallback } from 'react'
import { getSetting, isDIDAvoidanceModeEnabled } from '../../../services/settingsService'

/**
 * FlightAssistant のコールバック群を提供する hook
 *
 *  - onOptimizationUpdate: 最適化プランから DID/issue フラグを更新し、推奨オーバーレイを表示
 *  - onApplyPlan: 推奨プランの座標で waypoints / polygons を更新
 *  - onWaypointSelect: WP番号から該当ウェイポイントへ地図を寄せ、3秒ハイライト
 */
export function useFlightAssistantHandlers({
  waypoints,
  setWaypoints,
  setPolygons,
  setDidHighlightedWaypointIndices,
  setWaypointIssueFlagsById,
  setRecommendedWaypoints,
  setCenter,
  setZoom,
  setHighlightedWaypointIndex,
  showNotification,
}) {
  const onOptimizationUpdate = useCallback((optimizationPlan) => {
    // DIDハイライトは推奨オーバーレイとは独立に保持
    const didSet = new Set()
    /** @type {Record<string, { hasDID: boolean, hasAirport: boolean, hasProhibited: boolean, hasYellowZone: boolean }>} */
    const flagsById = {}
    const gaps = optimizationPlan?.waypointAnalysis?.gaps
    if (Array.isArray(gaps)) {
      for (const gap of gaps) {
        if (!gap?.issues) continue
        const types = new Set(gap.issues.map(i => i?.type).filter(Boolean))
        const hasDID = types.has('did')
        const hasAirport = types.has('airport')
        const hasProhibited = types.has('prohibited')
        const hasYellowZone = types.has('yellow_zone')

        if (hasDID && typeof gap.waypointIndex === 'number') didSet.add(gap.waypointIndex)
        if (typeof gap.waypointId === 'string') {
          flagsById[gap.waypointId] = { hasDID, hasAirport, hasProhibited, hasYellowZone }
        }
      }
    }
    setDidHighlightedWaypointIndices(prev => {
      const merged = new Set(prev)
      for (const index of didSet) {
        merged.add(index)
      }
      return merged
    })
    setWaypointIssueFlagsById(prev => {
      const merged = { ...prev }
      for (const [waypointId, nextFlags] of Object.entries(flagsById)) {
        const prevFlags = merged[waypointId] || {}
        merged[waypointId] = {
          hasDID: Boolean(prevFlags.hasDID || nextFlags.hasDID),
          hasAirport: Boolean(prevFlags.hasAirport || nextFlags.hasAirport),
          hasProhibited: Boolean(prevFlags.hasProhibited || nextFlags.hasProhibited),
          hasYellowZone: Boolean(prevFlags.hasYellowZone || nextFlags.hasYellowZone)
        }
      }
      return merged
    })

    // 推奨位置のオーバーレイ表示
    const didWarningOnly = getSetting('didWarningOnlyMode')
    const didAvoidance = isDIDAvoidanceModeEnabled()
    const warningOnlyMode = didWarningOnly && !didAvoidance

    const hasModified =
      Array.isArray(optimizationPlan?.recommendedWaypoints)
      && optimizationPlan.recommendedWaypoints.some(rw => rw?.modified)

    if (optimizationPlan?.hasIssues && optimizationPlan.recommendedWaypoints) {
      if (warningOnlyMode) {
        setRecommendedWaypoints(hasModified ? optimizationPlan.recommendedWaypoints : null)
      } else {
        setRecommendedWaypoints(optimizationPlan.recommendedWaypoints)
      }
    } else {
      setRecommendedWaypoints(null)
    }
  }, [setDidHighlightedWaypointIndices, setWaypointIssueFlagsById, setRecommendedWaypoints])

  const onApplyPlan = useCallback((plan) => {
    // 推奨プランを適用
    if (plan.waypoints && plan.waypoints.length > 0) {
      const updatedWaypoints = waypoints.map(wp => {
        const recommended = plan.waypoints.find(rw => rw.id === wp.id)
        if (recommended && recommended.modified) {
          return {
            ...wp,
            lat: recommended.lat,
            lng: recommended.lng,
            elevation: null // 座標が変わったので標高はリセット
          }
        }
        return wp
      })
      setWaypoints(updatedWaypoints)
    }

    // ポリゴンも更新（複数ポリゴン対応、単一の後方互換）
    if (plan.polygons && plan.polygons.length > 0) {
      setPolygons(prev => prev.map(p => {
        const updated = plan.polygons.find(rp => rp.id === p.id)
        return updated || p
      }))
    } else if (plan.polygon) {
      setPolygons(prev => prev.map(p =>
        p.id === plan.polygon.id ? plan.polygon : p
      ))
    }

    // オーバーレイをクリア
    setRecommendedWaypoints(null)
    setDidHighlightedWaypointIndices(new Set())
    setWaypointIssueFlagsById({})
    showNotification('プランを安全な位置に最適化しました', 'success')
  }, [waypoints, setWaypoints, setPolygons, setRecommendedWaypoints, setDidHighlightedWaypointIndices, setWaypointIssueFlagsById, showNotification])

  const onWaypointSelect = useCallback((wpIndex) => {
    // WP番号は1から始まる（表示用）、配列インデックスは0から
    const waypoint = waypoints.find(wp => wp.index === wpIndex) || waypoints[wpIndex - 1]
    if (waypoint) {
      setCenter({ lat: waypoint.lat, lng: waypoint.lng })
      setZoom(14)
      setHighlightedWaypointIndex(wpIndex)
      setTimeout(() => setHighlightedWaypointIndex(null), 3000)
      showNotification(`WP${wpIndex}にズームしました`, 'info')
    } else {
      showNotification(`WP${wpIndex}が見つかりません`, 'warning')
    }
  }, [waypoints, setCenter, setZoom, setHighlightedWaypointIndex, showNotification])

  return { onOptimizationUpdate, onApplyPlan, onWaypointSelect }
}
