/**
 * Map GeoJSON Generation Utilities
 *
 * Map.jsx で使用されるGeoJSON生成関数を集約
 */

/**
 * 最適化ルートのGeoJSON生成
 *
 * @param {Object} optimizedRoute - 最適化されたルート情報
 * @returns {Object|null} GeoJSON FeatureCollection
 */
export const generateOptimizedRouteGeoJSON = (optimizedRoute) => {
  if (!optimizedRoute || !optimizedRoute.flights || optimizedRoute.flights.length === 0) return null

  const features = []
  const homePoint = optimizedRoute.homePoint

  // Flight colors: Flight 1 = blue, Flight 2 = green, Flight 3+ = red
  const flightColors = ['#2563eb', '#16a34a', '#dc2626', '#f59e0b', '#8b5cf6']

  optimizedRoute.flights.forEach((flight, flightIdx) => {
    const color = flightColors[Math.min(flightIdx, flightColors.length - 1)]
    const wps = flight.waypoints

    if (wps.length === 0) return

    // Line from home to first waypoint
    features.push({
      type: 'Feature',
      properties: { flightNumber: flight.flightNumber, color, isReturn: false },
      geometry: {
        type: 'LineString',
        coordinates: [
          [homePoint.lng, homePoint.lat],
          [wps[0].lng, wps[0].lat]
        ]
      }
    })

    // Lines between waypoints
    for (let i = 0; i < wps.length - 1; i++) {
      features.push({
        type: 'Feature',
        properties: { flightNumber: flight.flightNumber, color, isReturn: false },
        geometry: {
          type: 'LineString',
          coordinates: [
            [wps[i].lng, wps[i].lat],
            [wps[i + 1].lng, wps[i + 1].lat]
          ]
        }
      })
    }

    // Line from last waypoint back to home
    features.push({
      type: 'Feature',
      properties: { flightNumber: flight.flightNumber, color, isReturn: true },
      geometry: {
        type: 'LineString',
        coordinates: [
          [wps[wps.length - 1].lng, wps[wps.length - 1].lat],
          [homePoint.lng, homePoint.lat]
        ]
      }
    })
  })

  return {
    type: 'FeatureCollection',
    features
  }
}

/**
 * 最適化オーバーレイのGeoJSON生成（推奨ウェイポイントから）
 *
 * @param {Array} recommendedWaypoints - 推奨ウェイポイント配列
 * @param {Array} waypoints - 元のウェイポイント配列
 * @returns {Object|null} GeoJSON FeatureCollection
 */
export const generateOptimizationOverlayGeoJSON = (recommendedWaypoints, waypoints) => {
  if (!recommendedWaypoints || recommendedWaypoints.length === 0) return null

  const features = []

  recommendedWaypoints.forEach(rw => {
    // Determine warning type
    let warningType = 'optimization'
    if (rw.hasProhibited) warningType = 'prohibited'
    else if (rw.hasAirport) warningType = 'airport'
    else if (rw.hasDID) warningType = 'did'

    // Add zone warning at current position if there are issues
    if (rw.hasProhibited || rw.hasAirport || rw.hasDID) {
      const original = waypoints.find(w => w.id === rw.id)
      if (original) {
        features.push({
          type: 'Feature',
          properties: { type: 'zone-warning-point', index: rw.index, warningType },
          geometry: {
            type: 'Point',
            coordinates: [original.lng, original.lat]
          }
        })
      }
    }

    if (rw.modified) {
      // Find original waypoint
      const original = waypoints.find(w => w.id === rw.id)
      if (original) {
        // Line from original to recommended position
        features.push({
          type: 'Feature',
          properties: { type: 'optimization-line', warningType },
          geometry: {
            type: 'LineString',
            coordinates: [
              [original.lng, original.lat],
              [rw.lng, rw.lat]
            ]
          }
        })
        // Recommended position point
        features.push({
          type: 'Feature',
          properties: { type: 'recommended-point', index: rw.index, warningType },
          geometry: {
            type: 'Point',
            coordinates: [rw.lng, rw.lat]
          }
        })
      }
    }
  })

  if (features.length === 0) return null

  return {
    type: 'FeatureCollection',
    features
  }
}

/**
 * パス衝突検出のGeoJSON生成
 *
 * @param {Object} pathCollisionResult - パス衝突結果
 * @returns {Object|null} GeoJSON FeatureCollection
 */
export const generatePathCollisionGeoJSON = (pathCollisionResult) => {
  if (!pathCollisionResult || !pathCollisionResult.isColliding) return null

  const features = []

  // 新形式: dangerSegments（両端点が同一制限区域内）
  pathCollisionResult.dangerSegments?.forEach((segment, idx) => {
    if (segment.fromWaypoint && segment.toWaypoint) {
      features.push({
        type: 'Feature',
        properties: {
          type: 'danger-segment',
          segmentType: segment.segmentType,
          color: segment.segmentColor,
          index: idx
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [segment.fromWaypoint.lng, segment.fromWaypoint.lat],
            [segment.toWaypoint.lng, segment.toWaypoint.lat]
          ]
        }
      })
    }
  })

  if (features.length === 0) return null

  return {
    type: 'FeatureCollection',
    features
  }
}

/**
 * ポリゴン衝突検出のGeoJSON生成
 *
 * @param {Object} polygonCollisionResult - ポリゴン衝突結果
 * @returns {Object|null} GeoJSON FeatureCollection
 */
export const generatePolygonCollisionGeoJSON = (polygonCollisionResult) => {
  if (!polygonCollisionResult || !polygonCollisionResult.hasCollisions) return null

  const features = polygonCollisionResult.intersectionPolygons.map((ip, idx) => ({
    type: 'Feature',
    properties: {
      ...ip.properties,
      index: idx,
      type: 'polygon-overlap'
    },
    geometry: ip.geometry
  }))

  if (features.length === 0) return null

  return {
    type: 'FeatureCollection',
    features
  }
}

/**
 * ポリゴン表示用のGeoJSON生成
 *
 * @param {Array} polygons - ポリゴン配列
 * @param {Object|null} editingPolygon - 編集中のポリゴン
 * @param {string|null} selectedPolygonId - 選択されたポリゴンID
 * @returns {Object} GeoJSON FeatureCollection
 */
export const generatePolygonsGeoJSON = (polygons, editingPolygon, selectedPolygonId) => {
  return {
    type: 'FeatureCollection',
    features: polygons
      .filter(p => !editingPolygon || p.id !== editingPolygon.id)
      .map(p => ({
        type: 'Feature',
        id: p.id,
        properties: {
          id: p.id,
          name: p.name,
          color: p.color,
          selected: p.id === selectedPolygonId
        },
        geometry: p.geometry
      }))
  }
}
