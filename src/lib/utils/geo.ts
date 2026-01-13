/**
 * Geographic Utility Functions
 * 地理計算ユーティリティ集約
 */

// ============================================
// Constants
// ============================================

/** Earth's radius in meters */
const EARTH_RADIUS_METERS = 6371000
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
