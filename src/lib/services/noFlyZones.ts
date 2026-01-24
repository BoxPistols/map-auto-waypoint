/**
 * No-Fly Zone Data Service
 * 小型無人機等飛行禁止法の対象施設
 *
 * データソース:
 * - 警察庁「小型無人機等飛行禁止法に基づく対象施設」
 *   https://www.npa.go.jp/bureau/security/kogatamujinki/index.html
 * - 国土交通省「無人航空機の飛行禁止空域」
 *   https://www.mlit.go.jp/koku/koku_tk10_000003.html
 * - DIDinJapan2026プロジェクト
 *
 * 注意事項:
 * - 座標・半径は参考値であり、正確な禁止区域は公式情報で確認してください
 * - レッドゾーン: 施設上空は完全飛行禁止
 * - イエローゾーン: 周辺300m、事前通報・許可が必要
 */

import { createCirclePolygon, calculateDistance } from '../utils/geo'
import noFlyFacilitiesData from '../data/no_fly_facilities.json'

// ============================================
// Type Definitions
// ============================================

export type FacilityType =
  | 'government'      // 政府機関
  | 'imperial'        // 皇室関連
  | 'nuclear'         // 原子力施設
  | 'defense'         // 防衛施設
  | 'foreign_mission' // 外国公館
  | 'prefecture'      // 都道府県庁
  | 'police'          // 警察施設
  | 'prison'          // 刑務所・拘置所
  | 'military_jsdf'   // 自衛隊施設
  | 'energy'          // エネルギー施設
  | 'water'           // ダム・浄水場
  | 'infrastructure'  // その他重要インフラ
  | 'airport'         // 空港（後方互換）

export type OperationalStatus =
  | 'operational'      // 運転中
  | 'stopped'          // 停止中
  | 'decommissioning'  // 廃炉作業中
  | 'decommissioned'   // 廃炉完了
  | 'planned'          // 計画中

export interface NoFlyFacility {
  id: string
  name: string
  nameEn?: string
  type: FacilityType
  coordinates: [number, number] // [lng, lat]
  radiusKm: number
  zone: 'red' | 'yellow'
  category?: string
  source?: string
  // 原子力発電所固有の情報
  operationalStatus?: OperationalStatus
  reactorCount?: number
  capacity?: string
  operator?: string
  // 施設の詳細情報
  address?: string
  description?: string
  established?: string
  lastUpdated?: string
}

// ============================================
// No-Fly Zone Data (486+ facilities)
// ============================================

/**
 * 小型無人機等飛行禁止法の対象施設
 */
export const NO_FLY_FACILITIES: NoFlyFacility[] = noFlyFacilitiesData as unknown as NoFlyFacility[]

// ============================================
// GeoJSON Generation Functions
// ============================================

/**
 * Get facilities by zone type
 */
export function getFacilitiesByZone(zone: 'red' | 'yellow'): NoFlyFacility[] {
  return NO_FLY_FACILITIES.filter((f) => f.zone === zone)
}

/**
 * Get facilities by type
 */
export function getFacilitiesByType(type: FacilityType): NoFlyFacility[] {
  return NO_FLY_FACILITIES.filter((f) => f.type === type)
}

/**
 * Get facilities by category (for UI filtering)
 */
export function getFacilitiesByCategory(category: string): NoFlyFacility[] {
  return NO_FLY_FACILITIES.filter((f) => f.category === category)
}

/**
 * Generate GeoJSON for red zones
 */
export function generateRedZoneGeoJSON(): GeoJSON.FeatureCollection {
  const facilities = getFacilitiesByZone('red')
  const features: GeoJSON.Feature[] = facilities.map((facility) => ({
    type: 'Feature',
    properties: {
      id: facility.id,
      name: facility.name,
      nameEn: facility.nameEn,
      type: facility.type,
      radiusKm: facility.radiusKm,
      zone: facility.zone,
      zoneType: 'RED_ZONE',
      category: facility.category,
      source: facility.source,
      coordinates: facility.coordinates,
      operationalStatus: facility.operationalStatus,
      reactorCount: facility.reactorCount,
      capacity: facility.capacity,
      operator: facility.operator,
      description: facility.description
    },
    geometry: createCirclePolygon(facility.coordinates, facility.radiusKm)
  }))

  return {
    type: 'FeatureCollection',
    features
  }
}

const YELLOW_ZONE_BUFFER_KM = 0.3

/**
 * Generate GeoJSON for yellow zones
 */
export function generateYellowZoneGeoJSON(): GeoJSON.FeatureCollection {
  // 在外公館のイエローゾーン
  const foreignMissions = getFacilitiesByZone('yellow').map((facility) => ({
    type: 'Feature' as const,
    properties: {
      id: facility.id,
      name: facility.name,
      nameEn: facility.nameEn,
      type: facility.type,
      radiusKm: facility.radiusKm,
      zone: facility.zone,
      zoneType: 'YELLOW_ZONE',
      coordinates: facility.coordinates,
      category: facility.category,
      source: facility.source,
      description: facility.description
    },
    geometry: createCirclePolygon(facility.coordinates, facility.radiusKm)
  }))

  // レッドゾーン対象施設の周辺300m（イエローゾーン）
  const redZoneFacilities = getFacilitiesByZone('red')
  const peripheryZones = redZoneFacilities.map((facility) => ({
    type: 'Feature' as const,
    properties: {
      id: facility.id + '-perimeter',
      name: facility.name + '周辺',
      nameEn: facility.nameEn ? facility.nameEn + ' (Perimeter)' : 'Perimeter',
      type: facility.type,
      radiusKm: facility.radiusKm + YELLOW_ZONE_BUFFER_KM, // 施設半径 + 0.3km周辺
      zone: 'yellow' as const,
      zoneType: 'YELLOW_ZONE',
      isPerimeter: true
    },
    geometry: createCirclePolygon(facility.coordinates, facility.radiusKm + YELLOW_ZONE_BUFFER_KM)
  }))

  return {
    type: 'FeatureCollection',
    features: [...foreignMissions, ...peripheryZones]
  }
}

/**
 * Generate GeoJSON for all no-fly zones
 */
export function generateAllNoFlyGeoJSON(): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = NO_FLY_FACILITIES.map((facility) => ({
    type: 'Feature',
    properties: {
      id: facility.id,
      name: facility.name,
      nameEn: facility.nameEn,
      type: facility.type,
      radiusKm: facility.radiusKm,
      zone: facility.zone,
      zoneType: facility.zone === 'red' ? 'RED_ZONE' : 'YELLOW_ZONE'
    },
    geometry: createCirclePolygon(facility.coordinates, facility.radiusKm)
  }))

  return {
    type: 'FeatureCollection',
    features
  }
}

/**
 * Get nuclear power plants only
 */
export function getNuclearPlants(): NoFlyFacility[] {
  return NO_FLY_FACILITIES.filter((f) => f.type === 'nuclear')
}

/**
 * Get US military bases only
 */
export function getUSMilitaryBases(): NoFlyFacility[] {
  return NO_FLY_FACILITIES.filter((f) => f.category === '在日米軍')
}

/**
 * Get embassies only
 */
export function getEmbassies(): NoFlyFacility[] {
  return NO_FLY_FACILITIES.filter((f) => f.type === 'foreign_mission')
}

/**
 * Get prefectures only
 */
export function getPrefectures(): NoFlyFacility[] {
  return NO_FLY_FACILITIES.filter((f) => f.type === 'prefecture')
}

/**
 * Get police facilities only
 */
export function getPoliceFacilities(): NoFlyFacility[] {
  return NO_FLY_FACILITIES.filter((f) => f.type === 'police')
}

/**
 * Get prisons only
 */
export function getPrisons(): NoFlyFacility[] {
  return NO_FLY_FACILITIES.filter((f) => f.type === 'prison')
}

/**
 * Get JSDF facilities only
 */
export function getJSDFFacilities(): NoFlyFacility[] {
  return NO_FLY_FACILITIES.filter((f) => f.type === 'military_jsdf')
}

/**
 * Generate GeoJSON for a specific facility type
 */
export function generateCategoryGeoJSON(type: FacilityType): GeoJSON.FeatureCollection {
  const facilities = getFacilitiesByType(type)
  const features: GeoJSON.Feature[] = facilities.map((facility) => ({
    type: 'Feature',
    properties: {
      id: facility.id,
      name: facility.name,
      nameEn: facility.nameEn,
      type: facility.type,
      radiusKm: facility.radiusKm,
      zone: facility.zone,
      zoneType: facility.zone === 'red' ? 'RED_ZONE' : 'YELLOW_ZONE',
      category: facility.category,
      source: facility.source,
      coordinates: facility.coordinates,
      operationalStatus: facility.operationalStatus,
      reactorCount: facility.reactorCount,
      capacity: facility.capacity,
      operator: facility.operator,
      address: facility.address,
      description: facility.description
    },
    geometry: createCirclePolygon(facility.coordinates, facility.radiusKm)
  }))

  return {
    type: 'FeatureCollection',
    features
  }
}

/**
 * Generate GeoJSON for nuclear plants with operational status
 */
export function generateNuclearPlantsGeoJSON(): GeoJSON.FeatureCollection {
  return generateCategoryGeoJSON('nuclear')
}

/**
 * Generate GeoJSON for prefectures
 */
export function generatePrefecturesGeoJSON(): GeoJSON.FeatureCollection {
  return generateCategoryGeoJSON('prefecture')
}

/**
 * Generate GeoJSON for police facilities
 */
export function generatePoliceFacilitiesGeoJSON(): GeoJSON.FeatureCollection {
  return generateCategoryGeoJSON('police')
}

/**
 * Generate GeoJSON for prisons
 */
export function generatePrisonsGeoJSON(): GeoJSON.FeatureCollection {
  return generateCategoryGeoJSON('prison')
}

/**
 * Generate GeoJSON for JSDF facilities
 */
export function generateJSDFFacilitiesGeoJSON(): GeoJSON.FeatureCollection {
  return generateCategoryGeoJSON('military_jsdf')
}

// ============================================
// Emergency Airspace (緊急用務空域)
// ============================================

interface EmergencyAirspace {
  id: string
  name: string
  nameEn?: string
  coordinates: [number, number]
  radiusKm: number
  altitudeLimit?: { min: number; max: number }
  validPeriod?: { start: string; end: string }
  authority: { name: string; contact?: string; notamNumber?: string }
  reason: 'disaster' | 'fire' | 'police' | 'rescue' | 'other'
  priority: 'high' | 'medium' | 'low'
  status: 'active' | 'scheduled' | 'expired'
  description?: string
}

/**
 * Generate mock GeoJSON for Emergency Airspace
 * 緊急用務空域 - 警察・消防等の緊急活動区域
 */
export function generateEmergencyAirspaceGeoJSON(): GeoJSON.FeatureCollection {
  const mockEmergencies: EmergencyAirspace[] = [
    {
      id: 'emergency-1',
      name: '大規模火災対応区域（見本）',
      nameEn: 'Large Fire Response Area (Sample)',
      coordinates: [139.75, 35.68],
      radiusKm: 1.0,
      altitudeLimit: { min: 0, max: 300 },
      validPeriod: {
        start: '2024-01-15T09:00:00+09:00',
        end: '2024-01-15T18:00:00+09:00'
      },
      authority: {
        name: '東京消防庁',
        contact: '03-3212-2111',
        notamNumber: 'A0123/24'
      },
      reason: 'fire',
      priority: 'high',
      status: 'active',
      description: '高層ビル火災に伴う消防ヘリコプター活動区域'
    },
    {
      id: 'emergency-2',
      name: '警察捜索活動区域（見本）',
      nameEn: 'Police Search Operation Area (Sample)',
      coordinates: [139.74, 35.69],
      radiusKm: 0.8,
      altitudeLimit: { min: 0, max: 200 },
      validPeriod: {
        start: '2024-01-16T06:00:00+09:00',
        end: '2024-01-16T20:00:00+09:00'
      },
      authority: {
        name: '警視庁航空隊',
        contact: '03-3581-4321',
        notamNumber: 'A0124/24'
      },
      reason: 'police',
      priority: 'medium',
      status: 'active',
      description: '行方不明者捜索に伴う警察ヘリ活動区域'
    },
    {
      id: 'emergency-3',
      name: '災害救助活動区域（見本）',
      nameEn: 'Disaster Rescue Area (Sample)',
      coordinates: [139.69, 35.71],
      radiusKm: 1.5,
      altitudeLimit: { min: 0, max: 500 },
      validPeriod: {
        start: '2024-01-17T00:00:00+09:00',
        end: '2024-01-20T23:59:59+09:00'
      },
      authority: {
        name: '国土交通省 地方整備局',
        contact: '048-600-1000',
        notamNumber: 'A0125/24'
      },
      reason: 'disaster',
      priority: 'high',
      status: 'active',
      description: '地震災害に伴う救助・物資輸送ヘリ活動区域'
    }
  ]

  const features: GeoJSON.Feature[] = mockEmergencies.map((item) => ({
    type: 'Feature',
    properties: {
      id: item.id,
      name: item.name,
      nameEn: item.nameEn,
      radiusKm: item.radiusKm,
      type: 'emergency',
      zoneType: 'EMERGENCY',
      altitudeLimit: item.altitudeLimit,
      validPeriod: item.validPeriod,
      authority: item.authority,
      reason: item.reason,
      priority: item.priority,
      status: item.status,
      description: item.description
    },
    geometry: createCirclePolygon(item.coordinates, item.radiusKm)
  }))

  return { type: 'FeatureCollection', features }
}

// ============================================
// Remote ID Zone (リモートID特定区域)
// ============================================

interface RemoteIDZone {
  id: string
  name: string
  nameEn?: string
  coordinates: [number, number]
  radiusKm: number
  requirement: {
    remoteIdRequired: boolean
    registrationRequired: boolean
    flightPlanRequired: boolean
  }
  exemptions?: string[]
  enforcementDate: string
  authority: { name: string; regulationReference?: string }
  description?: string
}

/**
 * Generate mock GeoJSON for Remote ID Required Zone
 * リモートID特定区域 - リモートID機能必須区域
 */
export function generateRemoteIDZoneGeoJSON(): GeoJSON.FeatureCollection {
  const mockRemoteID: RemoteIDZone[] = [
    {
      id: 'remoteid-1',
      name: '東京都心リモートID特定区域（見本）',
      nameEn: 'Tokyo Central Remote ID Zone (Sample)',
      coordinates: [139.745, 35.675],
      radiusKm: 3.0,
      requirement: {
        remoteIdRequired: true,
        registrationRequired: true,
        flightPlanRequired: true
      },
      exemptions: ['100g未満の機体', '屋内飛行', '係留飛行'],
      enforcementDate: '2022-06-20',
      authority: {
        name: '国土交通省航空局',
        regulationReference: '航空法第132条の87'
      },
      description: '都心部における無人航空機のリモートID発信義務区域'
    },
    {
      id: 'remoteid-2',
      name: '成田空港周辺リモートID特定区域（見本）',
      nameEn: 'Narita Airport Remote ID Zone (Sample)',
      coordinates: [140.3929, 35.772],
      radiusKm: 5.0,
      requirement: {
        remoteIdRequired: true,
        registrationRequired: true,
        flightPlanRequired: true
      },
      exemptions: ['100g未満の機体'],
      enforcementDate: '2022-06-20',
      authority: {
        name: '国土交通省航空局',
        regulationReference: '航空法第132条の87'
      },
      description: '空港周辺における無人航空機監視強化区域'
    },
    {
      id: 'remoteid-3',
      name: '羽田空港周辺リモートID特定区域（見本）',
      nameEn: 'Haneda Airport Remote ID Zone (Sample)',
      coordinates: [139.7798, 35.5494],
      radiusKm: 4.0,
      requirement: {
        remoteIdRequired: true,
        registrationRequired: true,
        flightPlanRequired: true
      },
      exemptions: ['100g未満の機体'],
      enforcementDate: '2022-06-20',
      authority: {
        name: '国土交通省航空局',
        regulationReference: '航空法第132条の87'
      },
      description: '空港周辺における無人航空機監視強化区域'
    }
  ]

  const features: GeoJSON.Feature[] = mockRemoteID.map((item) => ({
    type: 'Feature',
    properties: {
      id: item.id,
      name: item.name,
      nameEn: item.nameEn,
      radiusKm: item.radiusKm,
      type: 'remote-id',
      zoneType: 'REMOTE_ID',
      requirement: item.requirement,
      exemptions: item.exemptions,
      enforcementDate: item.enforcementDate,
      authority: item.authority,
      description: item.description
    },
    geometry: createCirclePolygon(item.coordinates, item.radiusKm)
  }))

  return { type: 'FeatureCollection', features }
}

// ============================================
// Manned Aircraft Zone (有人機発着エリア)
// ============================================

interface MannedAircraftZone {
  id: string
  name: string
  nameEn?: string
  coordinates: [number, number]
  radiusKm: number
  zoneType: 'agricultural' | 'glider' | 'seaplane' | 'temporary'
  operator?: string
  operatingHours?: string
  description?: string
}

/**
 * Generate GeoJSON for Manned Aircraft Zones
 * 有人機発着エリア - 農業航空・グライダー・水上飛行機等
 */
export function generateMannedAircraftZonesGeoJSON(): GeoJSON.FeatureCollection {
  const zones: MannedAircraftZone[] = [
    {
      id: 'manned-tsukuba',
      name: '筑波農業航空施設',
      nameEn: 'Tsukuba Agricultural Aviation Facility',
      coordinates: [140.0833, 36.0833],
      radiusKm: 1.0,
      zoneType: 'agricultural',
      operator: 'JA農協',
      operatingHours: '日の出〜日没（農繁期）',
      description: '農薬散布ヘリコプター用'
    },
    {
      id: 'manned-sekiyado',
      name: '関宿滑空場',
      nameEn: 'Sekiyado Glider Field',
      coordinates: [139.8333, 36.0],
      radiusKm: 2.0,
      zoneType: 'glider',
      operator: '関宿滑空場管理組合',
      description: '日本グライダー連盟加盟'
    },
    {
      id: 'manned-menuma',
      name: '妻沼滑空場',
      nameEn: 'Menuma Glider Field',
      coordinates: [139.3833, 36.2167],
      radiusKm: 2.0,
      zoneType: 'glider',
      operator: '妻沼滑空場管理組合',
      description: '大学グライダー部利用'
    },
    {
      id: 'manned-biwa',
      name: '琵琶湖水上機基地',
      nameEn: 'Lake Biwa Seaplane Base',
      coordinates: [136.0833, 35.2833],
      radiusKm: 1.5,
      zoneType: 'seaplane',
      description: '水上飛行機離着水場'
    }
  ]

  const features: GeoJSON.Feature[] = zones.map((item) => ({
    type: 'Feature',
    properties: {
      id: item.id,
      name: item.name,
      nameEn: item.nameEn,
      type: 'manned_aircraft',
      zoneType: 'MANNED_AIRCRAFT',
      radiusKm: item.radiusKm,
      facilityType: item.zoneType,
      operator: item.operator,
      operatingHours: item.operatingHours,
      description: item.description
    },
    geometry: createCirclePolygon(item.coordinates, item.radiusKm)
  }))

  return { type: 'FeatureCollection', features }
}

// ============================================
// Radio Interference Zones (電波干渉区域)
// ============================================

interface RadioInterferenceZone {
  id: string
  name: string
  nameEn?: string
  coordinates: [number, number]
  radiusKm: number
  frequency: string
  interferenceLevel: 'high' | 'medium' | 'low'
  description?: string
}

/**
 * Generate GeoJSON for Radio Interference Zones
 * 電波干渉区域 - 携帯電話基地局・放送局周辺
 */
export function generateRadioInterferenceZonesGeoJSON(): GeoJSON.FeatureCollection {
  const zones: RadioInterferenceZone[] = [
    {
      id: 'radio-skytree',
      name: '東京スカイツリー',
      nameEn: 'Tokyo Skytree',
      coordinates: [139.8107, 35.7101],
      radiusKm: 2.0,
      frequency: 'LTE/5G/地デジ',
      interferenceLevel: 'high',
      description: '電波塔、強力な電波発信源'
    },
    {
      id: 'radio-tower',
      name: '東京タワー',
      nameEn: 'Tokyo Tower',
      coordinates: [139.7454, 35.6586],
      radiusKm: 1.5,
      frequency: 'LTE/FM',
      interferenceLevel: 'high',
      description: '電波塔、FM放送・携帯基地局'
    },
    {
      id: 'radio-nhk',
      name: 'NHK菖蒲久喜ラジオ放送所',
      nameEn: 'NHK Shobu-Kuki Radio Station',
      coordinates: [139.5833, 36.0667],
      radiusKm: 3.0,
      frequency: 'AM',
      interferenceLevel: 'high',
      description: 'AM放送局、広範囲に影響'
    },
    {
      id: 'radio-nagoya',
      name: '名古屋テレビ塔',
      nameEn: 'Nagoya TV Tower',
      coordinates: [136.9088, 35.1803],
      radiusKm: 1.0,
      frequency: 'LTE',
      interferenceLevel: 'medium',
      description: 'テレビ塔、携帯基地局併設'
    },
    {
      id: 'radio-fukuoka',
      name: '福岡タワー',
      nameEn: 'Fukuoka Tower',
      coordinates: [130.3515, 33.593],
      radiusKm: 1.0,
      frequency: 'LTE',
      interferenceLevel: 'medium',
      description: 'テレビ・携帯電話基地局'
    },
    {
      id: 'radio-sapporo',
      name: '札幌テレビ塔',
      nameEn: 'Sapporo TV Tower',
      coordinates: [141.3566, 43.061],
      radiusKm: 0.8,
      frequency: 'LTE',
      interferenceLevel: 'medium',
      description: 'テレビ塔、通信施設'
    },
    {
      id: 'radio-landmark',
      name: '横浜ランドマークタワー',
      nameEn: 'Yokohama Landmark Tower',
      coordinates: [139.6325, 35.455],
      radiusKm: 1.0,
      frequency: 'LTE',
      interferenceLevel: 'medium',
      description: '超高層ビル、複数基地局'
    },
    {
      id: 'radio-abeno',
      name: 'あべのハルカス',
      nameEn: 'Abeno Harukas',
      coordinates: [135.5133, 34.6463],
      radiusKm: 1.0,
      frequency: 'LTE/5G',
      interferenceLevel: 'high',
      description: '日本最高層ビル、5G対応'
    }
  ]

  const features: GeoJSON.Feature[] = zones.map((item) => ({
    type: 'Feature',
    properties: {
      id: item.id,
      name: item.name,
      nameEn: item.nameEn,
      type: 'radio',
      zoneType: 'RADIO',
      radiusKm: item.radiusKm,
      frequency: item.frequency,
      interferenceLevel: item.interferenceLevel,
      description: item.description
    },
    geometry: createCirclePolygon(item.coordinates, item.radiusKm)
  }))

  return { type: 'FeatureCollection', features }
}

// ============================================
// Distance Check Functions
// ============================================

/**
 * Check if a point is in a no-fly zone
 */
export function isInNoFlyZone(
  lat: number,
  lng: number
): { inZone: boolean; facility?: NoFlyFacility; zone?: 'red' | 'yellow' } {
  for (const facility of NO_FLY_FACILITIES) {
    const distance = calculateDistance(lat, lng, facility.coordinates[1], facility.coordinates[0])

    if (distance <= facility.radiusKm) {
      return { inZone: true, facility, zone: facility.zone }
    }
  }

  return { inZone: false }
}

/**
 * Get all no-fly zones within a certain distance from a point
 */
export function getNearbyNoFlyZones(
  lat: number,
  lng: number,
  maxDistanceKm: number = 10
): Array<{ facility: NoFlyFacility; distance: number }> {
  const nearby: Array<{ facility: NoFlyFacility; distance: number }> = []

  for (const facility of NO_FLY_FACILITIES) {
    const distance = calculateDistance(lat, lng, facility.coordinates[1], facility.coordinates[0])

    if (distance <= maxDistanceKm) {
      nearby.push({ facility, distance })
    }
  }

  return nearby.sort((a, b) => a.distance - b.distance)
}

// ============================================
// Legacy Compatibility (旧形式との互換性)
// ============================================

/**
 * Convert to legacy format for backward compatibility
 * @deprecated Use NO_FLY_FACILITIES directly
 */
export function toLegacyFormat(): Array<{
  name: string
  lat: number
  lng: number
  radius: number
  type: 'red' | 'yellow'
  category: string
}> {
  return NO_FLY_FACILITIES.map((f) => ({
    name: f.name,
    lat: f.coordinates[1],
    lng: f.coordinates[0],
    radius: f.radiusKm * 1000, // Convert to meters
    type: f.zone,
    category: f.type
  }))
}

// ============================================
// Service Export
// ============================================

export const NoFlyZoneService = {
  getFacilitiesByZone,
  getFacilitiesByType,
  getFacilitiesByCategory,
  generateRedZone: generateRedZoneGeoJSON,
  generateYellowZone: generateYellowZoneGeoJSON,
  generateAll: generateAllNoFlyGeoJSON,
  generateEmergencyAirspace: generateEmergencyAirspaceGeoJSON,
  generateRemoteIDZone: generateRemoteIDZoneGeoJSON,
  generateMannedAircraftZones: generateMannedAircraftZonesGeoJSON,
  generateRadioInterferenceZones: generateRadioInterferenceZonesGeoJSON,
  generateCategoryGeoJSON,
  generateNuclearPlantsGeoJSON,
  generatePrefecturesGeoJSON,
  generatePoliceFacilitiesGeoJSON,
  generatePrisonsGeoJSON,
  generateJSDFFacilitiesGeoJSON,
  isInZone: isInNoFlyZone,
  getNearby: getNearbyNoFlyZones,
  getNuclearPlants,
  getUSMilitaryBases,
  getEmbassies,
  getPrefectures,
  getPoliceFacilities,
  getPrisons,
  getJSDFFacilities
}
