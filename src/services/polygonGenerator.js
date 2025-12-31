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
 * Generate polygon from Nominatim bounding box
 * @param {Array<number>} boundingBox - [south, north, west, east] from Nominatim
 * @param {number} padding - Additional padding in meters (optional)
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

/**
 * Create a full polygon object from search result
 * @param {object} searchResult - Geocoding search result
 * @param {object} options - Generation options
 * @returns {object} Complete polygon object ready for storage
 */
export const createPolygonFromSearchResult = (searchResult, options = {}) => {
  const {
    size = 'medium',
    customRadius = null, // Custom radius in meters (takes priority)
    shape = 'rectangle', // 'rectangle' or 'circle'
    useBoundingBox: _useBoundingBox = false, // Default to false - use size presets by default
    padding: _padding = 10
  } = options

  let geometry

  // If custom radius is specified, always use generated shape
  if (customRadius) {
    if (shape === 'circle') {
      geometry = generateCirclePolygon(searchResult.lat, searchResult.lng, customRadius)
    } else {
      geometry = generateRectanglePolygon(searchResult.lat, searchResult.lng, customRadius)
    }
  }
  // Use size preset to generate shape
  else {
    if (shape === 'circle') {
      geometry = generateCirclePolygon(searchResult.lat, searchResult.lng, size)
    } else {
      geometry = generateRectanglePolygon(searchResult.lat, searchResult.lng, size)
    }
  }

  // Extract name from display name (first part before comma)
  const name = searchResult.displayName
    ? searchResult.displayName.split(',')[0].trim()
    : `エリア ${Date.now()}`

  return {
    id: crypto.randomUUID(),
    name: `${name} 周辺`,
    geometry,
    createdAt: Date.now(),
    color: getRandomColor(),
    source: 'auto-generated',
    center: { lat: searchResult.lat, lng: searchResult.lng }
  }
}

/**
 * Generate random color for polygon (青系で統一、DIDカラーとの被りを防ぐ)
 */
const getRandomColor = () => {
  const colors = [
    '#45B7D1', '#4ECDC4', '#5DADE2', '#48C9B0',
    '#85C1E9', '#76D7C4', '#3498DB', '#1ABC9C',
    '#5499C7', '#45B39D', '#00CED1', '#17A2B8'
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

// Export size presets for UI
export const POLYGON_SIZE_OPTIONS = [
  { value: 'small', label: '小 (50m)', description: '小型建物向け' },
  { value: 'medium', label: '中 (100m)', description: '一般的な建物・施設' },
  { value: 'large', label: '大 (200m)', description: '大型施設・工場' },
  { value: 'xlarge', label: '特大 (500m)', description: '広域エリア' }
]

export const POLYGON_SHAPE_OPTIONS = [
  { value: 'rectangle', label: '矩形' },
  { value: 'circle', label: '円形' }
]
