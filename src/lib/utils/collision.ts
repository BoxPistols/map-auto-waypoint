/**
 * Collision Detection Utilities
 * RBush空間インデックスを使用した高速衝突検出
 *
 * DIDinJapan2026プロジェクトより移植
 *
 * 主な機能:
 * - RBush空間インデックスによるO(log n)検索
 * - Waypoint/Path/Polygon衝突検出
 * - ゾーン優先度システム
 */

import * as turf from '@turf/turf'
import RBush from 'rbush'
import type { Feature, Polygon, MultiPolygon, FeatureCollection, Position } from 'geojson'

// ============================================
// Type Definitions
// ============================================

export type CollisionType = 'DID' | 'AIRPORT' | 'RED_ZONE' | 'YELLOW_ZONE' | 'MILITARY' | 'PARK' | 'EMERGENCY' | 'REMOTE_ID' | 'MANNED_AIRCRAFT' | string

export type CollisionSeverity = 'DANGER' | 'WARNING' | 'SAFE'

export interface WaypointCollisionResult {
  isColliding: boolean
  collisionType: CollisionType | null
  areaName?: string
  severity: CollisionSeverity
  uiColor: string
  message: string
}

export interface PathCollisionResult {
  isColliding: boolean
  intersectionPoints: Position[]
  severity: CollisionSeverity
  message: string
}

export interface PolygonCollisionResult {
  isColliding: boolean
  overlapArea: number
  overlapRatio: number
  severity: CollisionSeverity
  message: string
}

// RBush item type for spatial indexing
export interface RBushItem {
  minX: number
  minY: number
  maxX: number
  maxY: number
  feature: Feature<Polygon | MultiPolygon>
}

// ============================================
// Zone Configuration
// ============================================

/**
 * Zone colors for UI display
 */
export const ZONE_COLORS: Record<string, string> = {
  DID: '#f44336',           // 赤（人口集中地区）
  AIRPORT: '#9C27B0',       // 紫（空港周辺）
  RED_ZONE: '#B71C1C',      // 暗い赤（飛行禁止 - DIDより深刻）
  YELLOW_ZONE: '#ffc107',   // 黄色（注意区域）
  MILITARY: '#7B1FA2',      // 紫（軍事基地）
  EMERGENCY: '#FF5722',     // オレンジ（緊急空域）
  REMOTE_ID: '#2196F3',     // 青（リモートID区域）
  MANNED_AIRCRAFT: '#4CAF50', // 緑（有人機発着エリア）
  DEFAULT: '#f44336'        // デフォルト赤
}

/**
 * Zone severity levels
 */
export const ZONE_SEVERITY: Record<string, CollisionSeverity> = {
  DID: 'WARNING',
  AIRPORT: 'DANGER',
  RED_ZONE: 'DANGER',
  YELLOW_ZONE: 'WARNING',
  MILITARY: 'DANGER',
  EMERGENCY: 'DANGER',
  REMOTE_ID: 'WARNING',
  MANNED_AIRCRAFT: 'WARNING'
}

/**
 * Zone priority (lower = higher priority)
 * Used when multiple zones overlap to return the most important one
 */
export const ZONE_PRIORITY: Record<string, number> = {
  RED_ZONE: 1,       // 最優先（飛行禁止）
  AIRPORT: 2,        // 空港周辺
  MILITARY: 2,       // 軍事基地
  EMERGENCY: 3,      // 緊急空域
  DID: 4,            // 人口集中地区
  YELLOW_ZONE: 5,    // 注意区域
  REMOTE_ID: 6,      // リモートID区域
  MANNED_AIRCRAFT: 7, // 有人機発着エリア
  DEFAULT: 99
}

// ============================================
// Spatial Index Functions
// ============================================

/**
 * Create RBush spatial index from prohibited areas
 */
export function createSpatialIndex(prohibitedAreas: FeatureCollection): RBush<RBushItem> {
  const tree = new RBush<RBushItem>()
  const items = prohibitedAreas.features
    .filter((feature): feature is Feature<Polygon | MultiPolygon> =>
      ['Polygon', 'MultiPolygon'].includes(feature.geometry?.type ?? '')
    )
    .map((feature) => {
      const bbox = turf.bbox(feature)
      return {
        minX: bbox[0],
        minY: bbox[1],
        maxX: bbox[2],
        maxY: bbox[3],
        feature
      }
    })

  tree.load(items)
  return tree
}

// ============================================
// Collision Detection Functions
// ============================================

/**
 * Check waypoint collision (unoptimized - for small datasets)
 */
export function checkWaypointCollisionUnoptimized(
  waypointCoords: [number, number],
  prohibitedAreas: FeatureCollection
): WaypointCollisionResult {
  const point = turf.point(waypointCoords)

  // Collect all colliding zones
  const collisions: Array<{ zoneType: CollisionType; areaName: string; priority: number }> = []

  for (const feature of prohibitedAreas.features) {
    if (!feature.geometry) continue
    if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
      const isInside = turf.booleanPointInPolygon(point, feature as Feature<Polygon | MultiPolygon>)

      if (isInside) {
        const zoneType = (feature.properties?.zoneType as CollisionType | undefined) ??
          (feature.properties?.type as CollisionType | undefined) ?? 'DID'
        const areaName = (feature.properties?.name as string | undefined) ?? '不明なエリア'
        const priority = ZONE_PRIORITY[zoneType] ?? ZONE_PRIORITY.DEFAULT
        collisions.push({ zoneType, areaName, priority })
      }
    }
  }

  // Sort by priority and return highest priority zone
  if (collisions.length > 0) {
    collisions.sort((a, b) => a.priority - b.priority)
    const highest = collisions[0]
    const uiColor = ZONE_COLORS[highest.zoneType] ?? ZONE_COLORS.DEFAULT
    const severity = ZONE_SEVERITY[highest.zoneType] ?? 'DANGER'

    return {
      isColliding: true,
      collisionType: highest.zoneType,
      areaName: highest.areaName,
      severity,
      uiColor,
      message: `このWaypointは${highest.areaName}内にあります`
    }
  }

  return {
    isColliding: false,
    collisionType: null,
    severity: 'SAFE',
    uiColor: '#00FF00',
    message: '飛行可能エリアです'
  }
}

/**
 * Check waypoint collision (optimized with RBush spatial index)
 * O(log n) performance for large datasets
 */
export function checkWaypointCollision(
  waypointCoords: [number, number],
  spatialIndex: RBush<RBushItem>
): WaypointCollisionResult {
  const [lon, lat] = waypointCoords
  const point = turf.point(waypointCoords)

  // Query spatial index for nearby features
  const candidates = spatialIndex.search({ minX: lon, minY: lat, maxX: lon, maxY: lat })

  // Collect all colliding zones
  const collisions: Array<{ zoneType: CollisionType; areaName: string; priority: number }> = []

  for (const candidate of candidates) {
    const isInside = turf.booleanPointInPolygon(point, candidate.feature)
    if (isInside) {
      const zoneType = (candidate.feature.properties?.zoneType as CollisionType | undefined) ??
        (candidate.feature.properties?.type as CollisionType | undefined) ?? 'DID'
      const areaName = (candidate.feature.properties?.name as string | undefined) ?? '不明'
      const priority = ZONE_PRIORITY[zoneType] ?? ZONE_PRIORITY.DEFAULT
      collisions.push({ zoneType, areaName, priority })
    }
  }

  // Sort by priority and return highest priority zone
  if (collisions.length > 0) {
    collisions.sort((a, b) => a.priority - b.priority)
    const highest = collisions[0]
    const uiColor = ZONE_COLORS[highest.zoneType] ?? ZONE_COLORS.DEFAULT
    const severity = ZONE_SEVERITY[highest.zoneType] ?? 'DANGER'

    return {
      isColliding: true,
      collisionType: highest.zoneType,
      areaName: highest.areaName,
      severity,
      uiColor,
      message: '禁止エリア内です'
    }
  }

  return {
    isColliding: false,
    collisionType: null,
    severity: 'SAFE',
    uiColor: '#00FF00',
    message: '飛行可能'
  }
}

/**
 * Check path collision (flight path crossing prohibited areas)
 */
export function checkPathCollision(
  pathCoords: Position[],
  prohibitedAreas: FeatureCollection
): PathCollisionResult {
  if (pathCoords.length < 2) {
    return {
      isColliding: false,
      intersectionPoints: [],
      severity: 'SAFE',
      message: '有効な経路がありません'
    }
  }

  const line = turf.lineString(pathCoords)
  const intersectionPoints: Position[] = []

  for (const feature of prohibitedAreas.features) {
    if (!feature.geometry) continue
    if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
      const intersections = turf.lineIntersect(line, feature as Feature<Polygon | MultiPolygon>)

      if (intersections.features.length > 0) {
        intersections.features.forEach((point) => {
          intersectionPoints.push(point.geometry.coordinates)
        })
      }
    }
  }

  if (intersectionPoints.length > 0) {
    return {
      isColliding: true,
      intersectionPoints,
      severity: 'DANGER',
      message: `飛行経路が禁止エリアを${intersectionPoints.length}箇所で通過`
    }
  }

  return {
    isColliding: false,
    intersectionPoints: [],
    severity: 'SAFE',
    message: '飛行経路は禁止エリアを通過していません'
  }
}

/**
 * Check polygon collision (area overlap with prohibited zones)
 */
export function checkPolygonCollision(
  polygonCoords: Position[][],
  prohibitedAreas: FeatureCollection
): PolygonCollisionResult {
  // Validate coordinates: polygon needs at least 4 points (closed ring)
  if (
    !polygonCoords ||
    !Array.isArray(polygonCoords) ||
    polygonCoords.length === 0 ||
    !polygonCoords[0] ||
    polygonCoords[0].length < 4
  ) {
    return {
      isColliding: false,
      overlapArea: 0,
      overlapRatio: 0,
      severity: 'SAFE',
      message: '座標が不十分です'
    }
  }

  let polygon
  try {
    polygon = turf.polygon(polygonCoords)
  } catch {
    return {
      isColliding: false,
      overlapArea: 0,
      overlapRatio: 0,
      severity: 'SAFE',
      message: '無効なポリゴン形状'
    }
  }

  let overlapArea = 0
  const polygonArea = turf.area(polygon)

  let intersects = false
  for (const feature of prohibitedAreas.features) {
    if (!feature.geometry) continue
    if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
      try {
        const polyFeature = feature as Feature<Polygon | MultiPolygon>
        if (turf.booleanIntersects(polygon, polyFeature)) {
          intersects = true
          // Fix: turf.intersect takes two geometries/features directly in v6
          const intersection = turf.intersect(polygon, polyFeature)
          
          let areaEstimate = 0
          if (intersection) {
             areaEstimate = turf.area(intersection)
          } else {
             // Fallback: if intersection exists but geometry calc fails, assume small overlap
             // Log warning as requested
             console.warn('Intersection detected but geometry calculation failed', {
               polygon: polygon.geometry.type,
               feature: polyFeature.geometry.type
             })
             // Use 1% of the smaller area as a fallback estimate
             areaEstimate = Math.min(polygonArea, turf.area(polyFeature)) * 0.01
          }
          overlapArea += areaEstimate
        }
      } catch (error) {
        console.warn('Error in polygon collision check', error)
      }
    }
  }

  const overlapRatio = polygonArea === 0 ? 0 : overlapArea / polygonArea

  if (intersects) {
    return {
      isColliding: true,
      overlapArea,
      overlapRatio,
      severity: overlapRatio > 0.2 ? 'DANGER' : 'WARNING',
      message: `ポリゴンが禁止エリアと${Math.round(overlapRatio * 100)}%重複しています`
    }
  }

  return {
    isColliding: false,
    overlapArea: 0,
    overlapRatio: 0,
    severity: 'SAFE',
    message: '禁止エリアとの重複はありません'
  }
}

// ============================================
// Batch Collision Detection
// ============================================

/**
 * Check multiple waypoints at once (batch processing)
 */
export function checkWaypointsCollisionBatch(
  waypoints: Array<{ id: string; coordinates: [number, number] }>,
  spatialIndex: RBush<RBushItem>
): Map<string, WaypointCollisionResult> {
  const results = new Map<string, WaypointCollisionResult>()

  for (const waypoint of waypoints) {
    const result = checkWaypointCollision(waypoint.coordinates, spatialIndex)
    results.set(waypoint.id, result)
  }

  return results
}

/**
 * Check if any waypoint collides with prohibited areas
 */
export function hasAnyCollision(
  waypoints: Array<{ coordinates: [number, number] }>,
  spatialIndex: RBush<RBushItem>
): boolean {
  for (const waypoint of waypoints) {
    const result = checkWaypointCollision(waypoint.coordinates, spatialIndex)
    if (result.isColliding) {
      return true
    }
  }
  return false
}

/**
 * Get collision summary for a set of waypoints
 */
export function getCollisionSummary(
  waypoints: Array<{ id: string; coordinates: [number, number] }>,
  spatialIndex: RBush<RBushItem>
): {
  totalWaypoints: number
  collidingCount: number
  dangerCount: number
  warningCount: number
  safeCount: number
  collisionsByType: Map<CollisionType, number>
} {
  let collidingCount = 0
  let dangerCount = 0
  let warningCount = 0
  let safeCount = 0
  const collisionsByType = new Map<CollisionType, number>()

  for (const waypoint of waypoints) {
    const result = checkWaypointCollision(waypoint.coordinates, spatialIndex)

    if (result.isColliding) {
      collidingCount++

      if (result.severity === 'DANGER') {
        dangerCount++
      } else if (result.severity === 'WARNING') {
        warningCount++
      }

      if (result.collisionType) {
        const current = collisionsByType.get(result.collisionType) ?? 0
        collisionsByType.set(result.collisionType, current + 1)
      }
    } else {
      safeCount++
    }
  }

  return {
    totalWaypoints: waypoints.length,
    collidingCount,
    dangerCount,
    warningCount,
    safeCount,
    collisionsByType
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get severity color for UI
 */
export function getSeverityColor(severity: CollisionSeverity): string {
  switch (severity) {
    case 'DANGER':
      return '#f44336' // Red
    case 'WARNING':
      return '#ff9800' // Orange
    case 'SAFE':
      return '#4caf50' // Green
  }
}

/**
 * Get severity label (Japanese)
 */
export function getSeverityLabel(severity: CollisionSeverity): string {
  switch (severity) {
    case 'DANGER':
      return '危険'
    case 'WARNING':
      return '注意'
    case 'SAFE':
      return '安全'
  }
}

/**
 * Get zone type label (Japanese)
 */
export function getZoneTypeLabel(zoneType: CollisionType): string {
  switch (zoneType) {
    case 'DID':
      return '人口集中地区'
    case 'AIRPORT':
      return '空港周辺'
    case 'RED_ZONE':
      return '飛行禁止区域'
    case 'YELLOW_ZONE':
      return '注意区域'
    case 'MILITARY':
      return '軍事基地'
    case 'EMERGENCY':
      return '緊急空域'
    case 'REMOTE_ID':
      return 'リモートID区域'
    case 'MANNED_AIRCRAFT':
      return '有人機発着エリア'
    default:
      return zoneType
  }
}

// ============================================
// Service Export
// ============================================

export const CollisionService = {
  createSpatialIndex,
  checkWaypoint: checkWaypointCollision, // Points to the optimized version now
  checkWaypointUnoptimized: checkWaypointCollisionUnoptimized,
  checkPath: checkPathCollision,
  checkPolygon: checkPolygonCollision,
  checkBatch: checkWaypointsCollisionBatch,
  hasAnyCollision,
  getCollisionSummary,
  getSeverityColor,
  getSeverityLabel,
  getZoneTypeLabel
}
