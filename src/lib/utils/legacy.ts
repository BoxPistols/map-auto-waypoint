/**
 * Legacy Format Compatibility Layer
 *
 * このモジュールは、新しいデータ形式を旧データ形式に変換するための
 * 互換性レイヤーを提供します。
 *
 * 旧形式（テスト互換）:
 * - Airport: { name, lat, lng, radius (meters), type: 'airport'|'airfield'|'military' }
 * - NoFlyZone: { name, lat, lng, radius (meters), type: 'red'|'yellow', category }
 *
 * 新形式:
 * - Airport: { id, name, coordinates: [lng, lat], radiusKm, type: 'international'|... }
 * - NoFlyFacility: { id, name, coordinates: [lng, lat], radiusKm, zone: 'red'|'yellow', type }
 */

import { MAJOR_AIRPORTS, REGIONAL_AIRPORTS, MILITARY_BASES, HELIPORTS, getAllAirports } from '../services/airports'
import { NO_FLY_FACILITIES } from '../services/noFlyZones'
import { calculateDistance } from './geo'
import type { Airport } from '../types'

// ============================================
// Legacy Type Definitions
// ============================================

export interface LegacyAirport {
  name: string
  lat: number
  lng: number
  radius: number // meters
  type: 'airport' | 'airfield' | 'military' | 'heliport'
}

export interface LegacyNoFlyZone {
  name: string
  lat: number
  lng: number
  radius: number // meters
  type: 'red' | 'yellow'
  category?: string
}

// ============================================
// Conversion Functions
// ============================================

/**
 * Convert new Airport format to legacy format
 */
function convertAirportToLegacy(airport: Airport): LegacyAirport {
  const [lng, lat] = airport.coordinates

  // Convert type to legacy format
  let legacyType: LegacyAirport['type'] = 'airport'
  if (airport.type === 'military') {
    legacyType = 'military'
  } else if (airport.type === 'heliport') {
    legacyType = 'heliport'
  }

  return {
    name: airport.name,
    lat,
    lng,
    radius: airport.radiusKm * 1000, // km to meters
    type: legacyType
  }
}

/**
 * Get all airports in legacy format for backward compatibility
 */
export function getLegacyAirportZones(): LegacyAirport[] {
  const allAirports = [...MAJOR_AIRPORTS, ...REGIONAL_AIRPORTS, ...MILITARY_BASES, ...HELIPORTS]
  return allAirports.map(convertAirportToLegacy)
}

/**
 * Get all no-fly zones in legacy format for backward compatibility
 */
export function getLegacyNoFlyZones(): LegacyNoFlyZone[] {
  return NO_FLY_FACILITIES.map(facility => ({
    name: facility.name,
    lat: facility.coordinates[1],
    lng: facility.coordinates[0],
    radius: facility.radiusKm * 1000, // km to meters
    type: facility.zone,
    category: facility.type
  }))
}

// ============================================
// Legacy Exported Constants (computed)
// ============================================

/**
 * Legacy AIRPORT_ZONES constant for backward compatibility
 * @deprecated Use MAJOR_AIRPORTS, REGIONAL_AIRPORTS, MILITARY_BASES instead
 */
export const AIRPORT_ZONES: LegacyAirport[] = getLegacyAirportZones()

/**
 * Legacy NO_FLY_ZONES constant for backward compatibility
 * @deprecated Use NO_FLY_FACILITIES instead
 */
export const NO_FLY_ZONES: LegacyNoFlyZone[] = getLegacyNoFlyZones()

// ============================================
// Legacy Functions
// ============================================

/**
 * Generate external map links for a given coordinate
 * @param lat Latitude
 * @param lng Longitude
 * @returns Links to DIPS, SoraPass, and GSI maps
 */
export function getExternalMapLinks(lat: number, lng: number): {
  dips: string
  sorapass: string
  geospatial: string
} {
  return {
    // DIPS 2.0 (ドローン情報基盤システム)
    dips: `https://www.dips-reg.mlit.go.jp/dips/map.html`,
    // SoraPass (飛行支援サービス)
    sorapass: `https://www.sorapass.com/map?lat=${lat}&lon=${lng}&zoom=15`,
    // GSI Maps (国土地理院地図)
    geospatial: `https://maps.gsi.go.jp/#15/${lat}/${lng}/`
  }
}

/**
 * Check airspace restrictions for a given point
 * Returns both airport and no-fly zone restrictions
 *
 * @deprecated Use CollisionService.checkWaypoint (Optimized) instead.
 * This function uses unoptimized linear search and is retained for backward compatibility only.
 *
 * @param lat Latitude
 * @param lng Longitude
 * @returns Array of restrictions found
 */
export function checkAirspaceRestrictionsLegacy(
  lat: number,
  lng: number
): Array<{
  type: 'airport' | 'prohibited'
  name: string
  distance: number
  radius: number
  severity: 'low' | 'medium' | 'high' | 'critical'
}> {
  const restrictions: Array<{
    type: 'airport' | 'prohibited'
    name: string
    distance: number
    radius: number
    severity: 'low' | 'medium' | 'high' | 'critical'
  }> = []

  // Check airports
  const allAirports = getAllAirports()
  for (const airport of allAirports) {
    const distance = calculateDistance(lat, lng, airport.coordinates[1], airport.coordinates[0])
    if (distance <= airport.radiusKm) {
      restrictions.push({
        type: 'airport',
        name: airport.name,
        distance: Math.round(distance * 1000), // km to meters
        radius: airport.radiusKm * 1000, // km to meters
        severity: airport.radiusKm >= 24 ? 'critical' : 'high'
      })
    }
  }

  // Check no-fly zones
  for (const facility of NO_FLY_FACILITIES) {
    const distance = calculateDistance(lat, lng, facility.coordinates[1], facility.coordinates[0])
    if (distance <= facility.radiusKm) {
      restrictions.push({
        type: 'prohibited',
        name: facility.name,
        distance: Math.round(distance * 1000), // km to meters
        radius: facility.radiusKm * 1000, // km to meters
        severity: facility.zone === 'red' ? 'critical' : 'high'
      })
    }
  }

  return restrictions
}

// ============================================
// Legacy GeoJSON Generators
// ============================================

/**
 * Generate GeoJSON for airport zones in legacy format
 * (with radius in meters in properties)
 */
export function getAirportZonesGeoJSONLegacy(): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = AIRPORT_ZONES.map(airport => {
    const coords: [number, number][] = []
    const points = 64

    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * 2 * Math.PI
      const radiusKm = airport.radius / 1000
      const latOffset = (radiusKm / 111.32) * Math.cos(angle)
      const lngOffset = (radiusKm / (111.32 * Math.cos((airport.lat * Math.PI) / 180))) * Math.sin(angle)
      coords.push([airport.lng + lngOffset, airport.lat + latOffset])
    }

    return {
      type: 'Feature',
      properties: {
        name: airport.name,
        radius: airport.radius,
        type: airport.type,
        zoneType: 'AIRPORT'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [coords]
      }
    }
  })

  return {
    type: 'FeatureCollection',
    features
  }
}

/**
 * Generate GeoJSON for no-fly zones in legacy format
 */
export function getNoFlyZonesGeoJSONLegacy(): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = NO_FLY_ZONES.map(zone => {
    const coords: [number, number][] = []
    const points = 64

    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * 2 * Math.PI
      const radiusKm = zone.radius / 1000
      const latOffset = (radiusKm / 111.32) * Math.cos(angle)
      const lngOffset = (radiusKm / (111.32 * Math.cos((zone.lat * Math.PI) / 180))) * Math.sin(angle)
      coords.push([zone.lng + lngOffset, zone.lat + latOffset])
    }

    return {
      type: 'Feature',
      properties: {
        name: zone.name,
        radius: zone.radius,
        type: zone.type,
        category: zone.category,
        zoneType: zone.type === 'red' ? 'RED_ZONE' : 'YELLOW_ZONE'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [coords]
      }
    }
  })

  return {
    type: 'FeatureCollection',
    features
  }
}
