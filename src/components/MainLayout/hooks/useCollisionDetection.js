import { useEffect, useState } from 'react'
import {
  getDetailedCollisionResults,
  getDetailedCollisionResultsWithRestrictionSurfaces,
  checkWaypointsRestrictionSurfaces,
  checkAllWaypointsDID,
  checkAllPolygonsCollision,
} from '../../../services/riskService'

/**
 * 自動衝突検出 hook
 * RBush空間インデックス + DID GeoJSON による検出を waypoints / polygons の変化に応じて実行
 *
 * 返却:
 *  - waypointIssueFlagsById: { [waypointId]: { hasDID, hasAirport, hasProhibited, hasYellowZone } }
 *  - didHighlightedWaypointIndices: Set<number> (WP index)
 *  - pathCollisionResult: { isColliding, dangerSegments, intersectionPoints, affectedSegments } | null
 *  - polygonCollisionResult: 衝突結果 | null
 *  - setDidHighlightedWaypointIndices, setWaypointIssueFlagsById, setRecommendedWaypoints の setter は呼び出し側 (FlightAssistant 経由更新用) で利用するためエクスポート
 */
export function useCollisionDetection({ waypoints, polygons, didDataReady }) {
  // Per-waypoint issue flags (airport/prohibited/did) for marker highlighting
  const [waypointIssueFlagsById, setWaypointIssueFlagsById] = useState(() => ({}))
  // DID warning highlight (indices) - shown even when recommended overlay is suppressed
  const [didHighlightedWaypointIndices, setDidHighlightedWaypointIndices] = useState(() => new Set())
  // Path collision results (intersection points and affected segments)
  const [pathCollisionResult, setPathCollisionResult] = useState(null)
  // Polygon collision results (overlap areas)
  const [polygonCollisionResult, setPolygonCollisionResult] = useState(null)

  // ============================================
  // 自動衝突検出 (RBush空間インデックス + DID GeoJSON)
  // ============================================
  useEffect(() => {
    if (!waypoints || waypoints.length === 0) {
      setWaypointIssueFlagsById({})
      setDidHighlightedWaypointIndices(new Set())
      setPathCollisionResult(null)
      return
    }

    let cancelled = false

    const checkCollisions = async () => {
      try {
        // 1. 制限表面（kokuarea）による正確な空港判定を取得
        let restrictionSurfaceResults = null
        try {
          if (import.meta.env.DEV) {
            console.log(`[CollisionCheck] 制限表面チェック開始: ${waypoints.length}個のウェイポイント`)
          }
          restrictionSurfaceResults = await checkWaypointsRestrictionSurfaces(waypoints)
          if (import.meta.env.DEV) {
            const inSurfaceCount = Array.from(restrictionSurfaceResults.values()).filter(r => r.isInRestrictionSurface).length
            console.log(`[CollisionCheck] 制限表面チェック完了: ${inSurfaceCount}個が制限表面内`)
          }
        } catch (rsError) {
          console.warn('[CollisionCheck] 制限表面チェックエラー（円形判定にフォールバック）:', rsError)
        }

        if (cancelled) return

        // 2. RBush空間インデックス + 制限表面による空港・禁止区域検出
        const { results, byType } = restrictionSurfaceResults
          ? getDetailedCollisionResultsWithRestrictionSurfaces(waypoints, { restrictionSurfaceResults })
          : getDetailedCollisionResults(waypoints)

        const newFlags = {}
        const didSet = new Set()

        for (const [waypointId, result] of results.entries()) {
          if (result.isColliding) {
            const wp = waypoints.find(w => w.id === waypointId)
            // RBush空間インデックスにはDIDは含まれていないはず
            const hasDID = false
            const hasAirport = result.collisionType === 'AIRPORT' || result.collisionType === 'MILITARY'
            const hasProhibited = result.collisionType === 'RED_ZONE'
            const hasYellowZone = result.collisionType === 'YELLOW_ZONE'

            newFlags[waypointId] = { hasDID, hasAirport, hasProhibited, hasYellowZone }

            if (import.meta.env.DEV && wp) {
              console.log(`[CollisionCheck] WP${wp.index} -> ${result.collisionType} (${result.areaName})`)
            }
          }
        }

        // 2. DID GeoJSONによるDID検出（非同期・エラーでも継続）
        try {
          if (import.meta.env.DEV) {
            console.log(`[CollisionCheck] DIDチェック開始: ${waypoints.length}個のウェイポイント`)
          }

          const didResult = await checkAllWaypointsDID(waypoints)

          if (import.meta.env.DEV) {
            console.log(`[CollisionCheck] DIDチェック完了:`, {
              hasDIDWaypoints: didResult?.hasDIDWaypoints,
              didCount: didResult?.didWaypoints?.length || 0,
              didWaypoints: didResult?.didWaypoints?.map(dw => ({
                index: waypoints.find(w => w.id === dw.waypointId)?.index,
                lat: dw.lat.toFixed(6),
                lng: dw.lng.toFixed(6),
                area: dw.area
              }))
            })
          }

          if (!cancelled && didResult?.hasDIDWaypoints) {
            for (const didWp of didResult.didWaypoints) {
              const wp = waypoints.find(w => w.id === didWp.waypointId)
              if (wp) {
                if (import.meta.env.DEV) {
                  console.log(`[CollisionCheck] DID検出: WP${wp.index} (${wp.lat.toFixed(6)}, ${wp.lng.toFixed(6)}) -> ${didWp.area}`)
                }
                if (newFlags[wp.id]) {
                  newFlags[wp.id].hasDID = true
                } else {
                  newFlags[wp.id] = { hasDID: true, hasAirport: false, hasProhibited: false, hasYellowZone: false }
                }
                didSet.add(wp.index)
              }
            }
          }
        } catch (didError) {
          console.warn('[CollisionCheck] DIDチェックエラー（継続）:', didError)
        }

        if (cancelled) return

        // 3. 危険セグメント検出（両端点が同一制限区域内のセグメント）
        const dangerSegments = []
        const waypointsByPolygon = new Map()
        for (const wp of waypoints) {
          const polygonId = wp.polygonId || wp.polygonName || 'default'
          if (!waypointsByPolygon.has(polygonId)) {
            waypointsByPolygon.set(polygonId, [])
          }
          waypointsByPolygon.get(polygonId).push(wp)
        }

        for (const [, polygonWaypoints] of waypointsByPolygon.entries()) {
          if (polygonWaypoints.length < 2) continue

          const sortedWaypoints = [...polygonWaypoints].sort((a, b) => a.index - b.index)

          // 閉ループ: 最後のWPから最初のWPへのセグメントも含める（(i+1)%n）
          const n = sortedWaypoints.length
          for (let i = 0; i < n; i++) {
            const wpFrom = sortedWaypoints[i]
            const wpTo = sortedWaypoints[(i + 1) % n]
            const flagsFrom = newFlags[wpFrom.id] || {}
            const flagsTo = newFlags[wpTo.id] || {}

            let segmentType = null
            let segmentColor = null

            if (flagsFrom.hasDID && flagsTo.hasDID) {
              segmentType = 'DID'
              segmentColor = '#dc2626'
            } else if (flagsFrom.hasAirport && flagsTo.hasAirport) {
              segmentType = 'AIRPORT'
              segmentColor = '#9333ea'
            } else if (flagsFrom.hasProhibited && flagsTo.hasProhibited) {
              segmentType = 'PROHIBITED'
              segmentColor = '#dc2626'
            } else if (flagsFrom.hasYellowZone && flagsTo.hasYellowZone) {
              segmentType = 'YELLOW_ZONE'
              segmentColor = '#eab308'
            }

            if (segmentType) {
              dangerSegments.push({
                fromWaypoint: wpFrom,
                toWaypoint: wpTo,
                segmentType,
                segmentColor
              })
            }
          }
        }

        setWaypointIssueFlagsById(newFlags)
        setDidHighlightedWaypointIndices(didSet)
        setPathCollisionResult(dangerSegments.length > 0 ? {
          isColliding: true,
          dangerSegments,
          intersectionPoints: [],
          affectedSegments: []
        } : null)

        if (import.meta.env.DEV && (Object.keys(byType).length > 0 || didSet.size > 0 || dangerSegments.length > 0)) {
          console.log('[CollisionCheck] 自動検出結果:', {
            rbush: byType,
            did: didSet.size > 0 ? `${didSet.size}件` : 'なし',
            dangerSegments: dangerSegments.length > 0 ? `${dangerSegments.length}セグメント` : 'なし'
          })
        }
      } catch (error) {
        console.warn('[CollisionCheck] 衝突検出エラー:', error)
      }
    }

    // 即座に実行（debounce短縮: 100ms）
    const timeoutId = setTimeout(checkCollisions, 100)
    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [waypoints])

  // DIDデータ準備完了時に再チェック
  useEffect(() => {
    if (didDataReady && waypoints && waypoints.length > 0) {
      const recheckDID = async () => {
        try {
          const didResult = await checkAllWaypointsDID(waypoints)
          if (didResult?.hasDIDWaypoints) {
            setWaypointIssueFlagsById(prev => {
              const updated = { ...prev }
              for (const didWp of didResult.didWaypoints) {
                if (updated[didWp.waypointId]) {
                  updated[didWp.waypointId].hasDID = true
                } else {
                  updated[didWp.waypointId] = { hasDID: true, hasAirport: false, hasProhibited: false, hasYellowZone: false }
                }
              }
              return updated
            })
            setDidHighlightedWaypointIndices(prev => {
              const newSet = new Set(prev)
              for (const didWp of didResult.didWaypoints) {
                newSet.add(didWp.waypointIndex)
              }
              return newSet
            })
            if (import.meta.env.DEV) {
              console.log('[CollisionCheck] DIDデータ準備完了、再チェック:', didResult.didCount + '件')
            }
          }
        } catch (error) {
          console.warn('[CollisionCheck] DID再チェックエラー:', error)
        }
      }
      recheckDID()
    }
  }, [didDataReady, waypoints])

  // ============================================
  // ポリゴン衝突検出
  // ============================================
  useEffect(() => {
    if (!polygons || polygons.length === 0) {
      setPolygonCollisionResult(null)
      return
    }

    // debounce: 500ms待ってから実行
    const timeoutId = setTimeout(() => {
      const result = checkAllPolygonsCollision(polygons)
      setPolygonCollisionResult(result.hasCollisions ? result : null)

      if (import.meta.env.DEV && result.hasCollisions) {
        console.log('[CollisionCheck] ポリゴン衝突検出:', {
          collisions: result.polygonResults.length,
          totalOverlapArea: Math.round(result.totalOverlapArea) + 'm²'
        })
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [polygons])

  return {
    waypointIssueFlagsById,
    setWaypointIssueFlagsById,
    didHighlightedWaypointIndices,
    setDidHighlightedWaypointIndices,
    pathCollisionResult,
    polygonCollisionResult,
  }
}
