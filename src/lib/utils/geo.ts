/**
 * Geographic Utility Functions
 * 地理計算ユーティリティ集約
 */

// ============================================
// Constants
// ============================================

/** Earth's radius in kilometers */
const EARTH_RADIUS_KM = 6371

// ============================================
// Unit Conversion Helpers
// ============================================

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

function toDeg(rad: number): number {
  return rad * (180 / Math.PI)
}

// ============================================
// Distance Calculations
// ============================================

/**
 * Calculate distance between two points (Haversine formula)
 * @returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371 // Earth's radius in km
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Calculate distance between two points in meters (Haversine formula)
 * @returns distance in meters
 */
export function getDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  return calculateDistance(lat1, lng1, lat2, lng2) * 1000
}

// ============================================
// Point Calculation
// ============================================

/**
 * Calculate destination point given start point, distance and bearing
 * @param lat starting latitude
 * @param lng starting longitude
 * @param distanceKm distance in kilometers
 * @param bearing bearing in degrees (0 = north, 90 = east)
 * @returns [latitude, longitude] of destination point
 */
export function destinationPoint(
  lat: number,
  lng: number,
  distanceKm: number,
  bearing: number
): [number, number] {
  const d = distanceKm / EARTH_RADIUS_KM
  const brng = toRad(bearing)
  const lat1 = toRad(lat)
  const lng1 = toRad(lng)

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) +
    Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
  )

  const lng2 = lng1 + Math.atan2(
    Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
    Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
  )

  return [toDeg(lat2), toDeg(lng2)]
}

// ============================================
// Polygon Creation
// ============================================

/**
 * Create a circle polygon around a point
 * @param center [lng, lat] (GeoJSON format: longitude first)
 * @param radiusKm radius in kilometers
 * @param points number of points to approximate circle (default: 32)
 */
export function createCirclePolygon(
  center: [number, number],
  radiusKm: number,
  points: number = 32
): GeoJSON.Polygon {
  const coords: [number, number][] = []
  const [lng, lat] = center

  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 360
    const point = destinationPoint(lat, lng, radiusKm, angle)
    coords.push([point[1], point[0]])
  }

  return {
    type: 'Polygon',
    coordinates: [coords]
  }
}

/**
 * Create a circle polygon around a point with radius in meters
 * @param lat center latitude
 * @param lng center longitude
 * @param radiusMeters radius in meters
 * @param points number of points to approximate circle (default: 32)
 */
export function createCirclePolygonMeters(
  lat: number,
  lng: number,
  radiusMeters: number,
  points: number = 32
): GeoJSON.Polygon {
  return createCirclePolygon([lng, lat], radiusMeters / 1000, points)
}

// ============================================
// Coordinate Formatting (NOTAM/DIPS用)
// ============================================

/**
 * Format coordinates as standard decimal string
 * @param lng longitude
 * @param lat latitude
 * @returns formatted string "N35.6812°, E139.7671°"
 */
export function formatCoordinates(lng: number, lat: number): string {
  const latDir = lat >= 0 ? 'N' : 'S'
  const lngDir = lng >= 0 ? 'E' : 'W'
  return `${latDir}${Math.abs(lat).toFixed(4)}°, ${lngDir}${Math.abs(lng).toFixed(4)}°`
}

/**
 * Convert decimal degrees to DMS (degrees, minutes, seconds)
 * @param decimal decimal degrees
 * @param isLat true for latitude, false for longitude
 * @param locale 'en' for N/S/E/W, 'ja' for 北緯/南緯/東経/西経
 * @returns formatted DMS string
 */
export function convertDecimalToDMS(
  decimal: number,
  isLat: boolean,
  locale: 'en' | 'ja' = 'en'
): string {
  const absolute = Math.abs(decimal)
  const degrees = Math.floor(absolute)
  const minutesFloat = (absolute - degrees) * 60
  const minutes = Math.floor(minutesFloat)
  const seconds = ((minutesFloat - minutes) * 60).toFixed(2)

  let direction: string
  if (locale === 'ja') {
    if (isLat) {
      direction = decimal >= 0 ? '北緯' : '南緯'
    } else {
      direction = decimal >= 0 ? '東経' : '西経'
    }
    return `${direction}${degrees}度${minutes}分${seconds}秒`
  } else {
    if (isLat) {
      direction = decimal >= 0 ? 'N' : 'S'
    } else {
      direction = decimal >= 0 ? 'E' : 'W'
    }
    return `${degrees}°${minutes}'${seconds}"${direction}`
  }
}

/**
 * Format coordinates in DMS format (for NOTAM)
 * @param lng longitude
 * @param lat latitude
 * @param locale 'en' or 'ja'
 * @returns formatted DMS string
 */
export function formatCoordinatesDMS(
  lng: number,
  lat: number,
  locale: 'en' | 'ja' = 'en'
): string {
  const latDMS = convertDecimalToDMS(lat, true, locale)
  const lngDMS = convertDecimalToDMS(lng, false, locale)
  return `${latDMS} ${lngDMS}`
}

// ============================================
// Compass Directions
// ============================================

/**
 * Convert degrees to compass direction (English)
 * @param degrees bearing in degrees (0 = north)
 * @returns compass direction (N, NE, E, SE, S, SW, W, NW)
 */
export function degreesToCompass(degrees: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const index = Math.round(((degrees % 360) + 360) % 360 / 45) % 8
  return directions[index]
}

/**
 * Convert degrees to compass direction (Japanese)
 * @param degrees bearing in degrees (0 = north)
 * @returns compass direction (北, 北東, 東, 南東, 南, 南西, 西, 北西)
 */
export function degreesToJapanese(degrees: number): string {
  const directions = ['北', '北東', '東', '南東', '南', '南西', '西', '北西']
  const index = Math.round(((degrees % 360) + 360) % 360 / 45) % 8
  return directions[index]
}

// ============================================
// Bounding Box Utilities
// ============================================

/**
 * Calculate bounding box for a geometry
 * @param geometry GeoJSON geometry
 * @returns [minLng, minLat, maxLng, maxLat]
 */
export function calculateBBox(
  geometry: GeoJSON.Geometry
): [number, number, number, number] {
  let minLng = Infinity
  let minLat = Infinity
  let maxLng = -Infinity
  let maxLat = -Infinity

  function processCoord(coord: GeoJSON.Position): void {
    const [lng, lat] = coord
    if (lng < minLng) minLng = lng
    if (lat < minLat) minLat = lat
    if (lng > maxLng) maxLng = lng
    if (lat > maxLat) maxLat = lat
  }

  function processCoords(coords: GeoJSON.Position[]): void {
    coords.forEach(processCoord)
  }

  switch (geometry.type) {
    case 'Point':
      processCoord(geometry.coordinates)
      break
    case 'MultiPoint':
    case 'LineString':
      processCoords(geometry.coordinates)
      break
    case 'MultiLineString':
    case 'Polygon':
      geometry.coordinates.forEach(processCoords)
      break
    case 'MultiPolygon':
      geometry.coordinates.forEach(poly => poly.forEach(processCoords))
      break
    case 'GeometryCollection':
      geometry.geometries.forEach(g => {
        const bbox = calculateBBox(g)
        if (bbox[0] < minLng) minLng = bbox[0]
        if (bbox[1] < minLat) minLat = bbox[1]
        if (bbox[2] > maxLng) maxLng = bbox[2]
        if (bbox[3] > maxLat) maxLat = bbox[3]
      })
      break
  }

  return [minLng, minLat, maxLng, maxLat]
}

/**
 * Check if two bounding boxes intersect
 */
export function bboxesIntersect(
  bbox1: [number, number, number, number],
  bbox2: [number, number, number, number]
): boolean {
  return !(
    bbox1[2] < bbox2[0] || // bbox1 is left of bbox2
    bbox1[0] > bbox2[2] || // bbox1 is right of bbox2
    bbox1[3] < bbox2[1] || // bbox1 is below bbox2
    bbox1[1] > bbox2[3]    // bbox1 is above bbox2
  )
}
