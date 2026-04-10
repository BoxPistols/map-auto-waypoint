import * as turf from '@turf/turf'

// Size presets in meters
const SIZE_PRESETS = {
  small: 50,    // 50m - 小型建物
  medium: 100,  // 100m - 中型建物・施設
  large: 200,   // 200m - 大型施設
  xlarge: 500   // 500m - 広域エリア
}

/**
 * Generate a rectangular polygon around a center point
 * @param {number} lat - Center latitude
 * @param {number} lng - Center longitude
 * @param {string|number} size - Size preset ('small', 'medium', 'large', 'xlarge') or meters
 * @returns {object} GeoJSON Polygon geometry
 */
export const generateRectanglePolygon = (lat, lng, size = 'medium') => {
  const radius = typeof size === 'number' ? size : (SIZE_PRESETS[size] || SIZE_PRESETS.medium)

  // Create a square bounding box around the point
  const center = turf.point([lng, lat])
  const buffered = turf.buffer(center, radius, { units: 'meters' })
  const bbox = turf.bbox(buffered)

  // Create rectangle from bbox [minX, minY, maxX, maxY]
  const coordinates = [[
    [bbox[0], bbox[1]], // SW
    [bbox[2], bbox[1]], // SE
    [bbox[2], bbox[3]], // NE
    [bbox[0], bbox[3]], // NW
    [bbox[0], bbox[1]]  // Close polygon
  ]]

  return {
    type: 'Polygon',
    coordinates
  }
}

/**
 * Generate a circular polygon (approximated) around a center point
 * @param {number} lat - Center latitude
 * @param {number} lng - Center longitude
 * @param {string|number} size - Size preset or meters
 * @param {number} steps - Number of points in circle (default 8 for octagon)
 * @returns {object} GeoJSON Polygon geometry
 */
export const generateCirclePolygon = (lat, lng, size = 'medium', steps = 8) => {
  const radius = typeof size === 'number' ? size : (SIZE_PRESETS[size] || SIZE_PRESETS.medium)

  const center = turf.point([lng, lat])
  const circle = turf.circle(center, radius, { steps, units: 'meters' })

  return circle.geometry
}

/**
 * 検索結果のバウンディングボックス等からポリゴンを生成
 * @param {Array<number>} boundingBox - [south, north, west, east]
 * @param {number} padding - 追加パディング（m）
 * @returns {object} GeoJSON Polygon geometry
 */
export const generateFromBoundingBox = (boundingBox, padding = 0) => {
  if (!boundingBox || boundingBox.length !== 4) {
    return null
  }

  const [south, north, west, east] = boundingBox.map(Number)

  let coordinates = [[
    [west, south],  // SW
    [east, south],  // SE
    [east, north],  // NE
    [west, north],  // NW
    [west, south]   // Close
  ]]

  // Apply padding if specified
  if (padding > 0) {
    const polygon = turf.polygon(coordinates)
    const buffered = turf.buffer(polygon, padding, { units: 'meters' })
    coordinates = buffered.geometry.coordinates
  }

  return {
    type: 'Polygon',
    coordinates
  }
}

export const POLYGON_SIZE_OPTIONS = [
  { value: 'small', label: '小 (50m)' },
  { value: 'medium', label: '中 (100m)' },
  { value: 'large', label: '大 (200m)' },
  { value: 'xlarge', label: '特大 (500m)' }
]

export const POLYGON_SHAPE_OPTIONS = [
  { value: 'rectangle', label: '矩形' },
  { value: 'circle', label: '円形' }
]

/**
 * boundingBoxから中心座標と包含円半径を計算
 * 円形ポリゴン生成時に、boundingBox全体を包含する円を作るためのヘルパー
 *
 * @param {Array<number>} boundingBox - [south, north, west, east]
 * @returns {{ centerLat: number, centerLng: number, radiusMeters: number } | null}
 */
const computeCircleFromBoundingBox = (boundingBox) => {
  if (!boundingBox || boundingBox.length !== 4) return null

  const [south, north, west, east] = boundingBox.map(Number)
  if ([south, north, west, east].some(Number.isNaN)) return null

  const centerLat = (south + north) / 2
  const centerLng = (west + east) / 2

  // 中心からbboxの隅までの距離（=対角線の半分）を半径にすることで、
  // 矩形全体を包含する円になる
  const center = turf.point([centerLng, centerLat])
  const corner = turf.point([east, north])
  const radiusMeters = turf.distance(center, corner, { units: 'meters' })

  return { centerLat, centerLng, radiusMeters }
}

export const createPolygonFromSearchResult = (searchResult, options = {}) => {
  if (!searchResult) return null
  const shape = options.shape || 'rectangle'
  const sizePreset = options.size || 'medium'
  const useCustomSize = options.useCustomSize || false
  const customRadius = options.customRadius
  const padding = options.padding || 0

  const lat = parseFloat(searchResult.lat)
  const lng = parseFloat(searchResult.lng)

  const radius = useCustomSize
    ? (typeof customRadius === 'number' ? customRadius : SIZE_PRESETS.medium)
    : (SIZE_PRESETS[sizePreset] || SIZE_PRESETS.medium)

  // boundingBoxが利用可能な場合の矩形/円形サイズ計算
  // - 矩形: boundingBox全体を使用（従来通り）
  // - 円形: boundingBoxを包含する円を生成（以前の矩形サイズと同等）
  // カスタムサイズ指定時は常に指定半径を使用
  let geometry = null
  if (searchResult.boundingBox && !useCustomSize) {
    if (shape === 'rectangle') {
      geometry = generateFromBoundingBox(searchResult.boundingBox, padding)
    } else if (shape === 'circle') {
      const circleParams = computeCircleFromBoundingBox(searchResult.boundingBox)
      if (circleParams) {
        // bboxが極端に小さい場合（単一座標等）はプリセット半径にフォールバック
        const effectiveRadius = Math.max(circleParams.radiusMeters, radius)
        geometry = generateCirclePolygon(
          circleParams.centerLat,
          circleParams.centerLng,
          effectiveRadius
        )
      }
    }
  }

  if (!geometry) {
    geometry = shape === 'circle'
      ? generateCirclePolygon(lat, lng, radius)
      : generateRectanglePolygon(lat, lng, radius)
  }

  return {
    id: crypto.randomUUID(),
    name: searchResult.displayName?.split(',')[0] || '検索エリア',
    geometry,
    color: '#45B7D1',
    createdAt: Date.now()
  }
}
