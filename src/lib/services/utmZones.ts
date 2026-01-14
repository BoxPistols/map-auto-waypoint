/**
 * UTM Zone Services
 * UTM関連区域データサービス
 *
 * - 緊急用務空域
 * - リモートID特定区域
 * - 有人機発着エリア
 * - 電波干渉区域（LTE/5G）
 */

import type { EmergencyAirspace, RemoteIdZone, MannedAircraftZone, RadioInterferenceZone } from '../types'

/**
 * 緊急用務空域（災害時などの一時的な飛行制限エリア）
 * 参照: https://www.mlit.go.jp/koku/koku_tk10_000003.html
 */
export const EMERGENCY_AIRSPACE: EmergencyAirspace[] = [
  // 緊急用務空域は動的に設定されるため、サンプルデータとして主要な訓練空域を含む
  { name: '富士山周辺訓練空域', lat: 35.3606, lng: 138.7274, radius: 10000, type: 'emergency', active: false },
  { name: '御嶽山周辺', lat: 35.8930, lng: 137.4803, radius: 5000, type: 'emergency', active: false },
  { name: '阿蘇山周辺', lat: 32.8842, lng: 131.1040, radius: 5000, type: 'emergency', active: false },
  { name: '桜島周辺', lat: 31.5855, lng: 130.6565, radius: 5000, type: 'emergency', active: false },
  { name: '雲仙岳周辺', lat: 32.7573, lng: 130.2986, radius: 5000, type: 'emergency', active: false }
]

/**
 * リモートID特定区域（リモートID発信が必要な区域）
 * 参照: https://www.mlit.go.jp/koku/koku_ua_remoteid.html
 */
export const REMOTE_ID_ZONES: RemoteIdZone[] = [
  // 主要都市部（人口密集地域）
  { name: '東京都心部', lat: 35.6762, lng: 139.6503, radius: 15000, type: 'remote_id' },
  { name: '大阪市中心部', lat: 34.6937, lng: 135.5023, radius: 12000, type: 'remote_id' },
  { name: '名古屋市中心部', lat: 35.1815, lng: 136.9066, radius: 10000, type: 'remote_id' },
  { name: '福岡市中心部', lat: 33.5904, lng: 130.4017, radius: 8000, type: 'remote_id' },
  { name: '札幌市中心部', lat: 43.0618, lng: 141.3545, radius: 8000, type: 'remote_id' },
  { name: '横浜市中心部', lat: 35.4437, lng: 139.6380, radius: 10000, type: 'remote_id' },
  { name: '神戸市中心部', lat: 34.6901, lng: 135.1956, radius: 8000, type: 'remote_id' },
  { name: '京都市中心部', lat: 35.0116, lng: 135.7681, radius: 8000, type: 'remote_id' },
  { name: '広島市中心部', lat: 34.3853, lng: 132.4553, radius: 7000, type: 'remote_id' },
  { name: '仙台市中心部', lat: 38.2682, lng: 140.8694, radius: 7000, type: 'remote_id' }
]

/**
 * 有人機発着エリア（ヘリポート以外の離着陸施設）
 */
export const MANNED_AIRCRAFT_ZONES: MannedAircraftZone[] = [
  // 場外離着陸場（農業用等）
  { name: '筑波農業航空施設', lat: 36.0833, lng: 140.0833, radius: 1000, type: 'manned_aircraft' },
  { name: '新潟農業航空基地', lat: 37.9167, lng: 139.0500, radius: 1000, type: 'manned_aircraft' },
  { name: '北海道農業航空施設（十勝）', lat: 43.0000, lng: 143.1500, radius: 1500, type: 'manned_aircraft' },
  { name: '佐賀農業航空施設', lat: 33.2667, lng: 130.3000, radius: 1000, type: 'manned_aircraft' },
  // グライダー離着陸場
  { name: '関宿滑空場', lat: 36.0000, lng: 139.8333, radius: 2000, type: 'manned_aircraft' },
  { name: '妻沼滑空場', lat: 36.2167, lng: 139.3833, radius: 2000, type: 'manned_aircraft' },
  { name: '板倉滑空場', lat: 36.2333, lng: 139.6167, radius: 2000, type: 'manned_aircraft' },
  { name: '大野滑空場', lat: 35.9833, lng: 136.5000, radius: 2000, type: 'manned_aircraft' },
  // 水上飛行機基地
  { name: '琵琶湖水上機基地', lat: 35.2833, lng: 136.0833, radius: 1500, type: 'manned_aircraft' },
  { name: '芦ノ湖水上機離着水場', lat: 35.2000, lng: 139.0333, radius: 1000, type: 'manned_aircraft' }
]

/**
 * LTE電波干渉区域（携帯電話基地局周辺の注意区域）
 * ドローンの制御に影響を与える可能性のある電波環境
 */
export const RADIO_INTERFERENCE_ZONES: RadioInterferenceZone[] = [
  // 主要な通信施設周辺
  { name: '東京スカイツリー', lat: 35.7101, lng: 139.8107, radius: 2000, type: 'radio', frequency: 'LTE/5G' },
  { name: '東京タワー', lat: 35.6586, lng: 139.7454, radius: 1500, type: 'radio', frequency: 'LTE/FM' },
  { name: 'NHK菖蒲久喜ラジオ放送所', lat: 36.0667, lng: 139.5833, radius: 3000, type: 'radio', frequency: 'AM' },
  { name: '名古屋テレビ塔', lat: 35.1803, lng: 136.9088, radius: 1000, type: 'radio', frequency: 'LTE' },
  { name: '通天閣', lat: 34.6525, lng: 135.5063, radius: 800, type: 'radio', frequency: 'LTE' },
  { name: '福岡タワー', lat: 33.5930, lng: 130.3515, radius: 1000, type: 'radio', frequency: 'LTE' },
  { name: '札幌テレビ塔', lat: 43.0610, lng: 141.3566, radius: 800, type: 'radio', frequency: 'LTE' },
  { name: '京都タワー', lat: 34.9875, lng: 135.7592, radius: 600, type: 'radio', frequency: 'LTE' },
  { name: '横浜ランドマークタワー', lat: 35.4550, lng: 139.6325, radius: 1000, type: 'radio', frequency: 'LTE' },
  { name: 'あべのハルカス', lat: 34.6463, lng: 135.5133, radius: 1000, type: 'radio', frequency: 'LTE/5G' }
]

// ============================================
// GeoJSON変換関数
// ============================================

interface BaseZone {
  name: string
  lat: number
  lng: number
  radius: number
  type: string
}

interface ZoneWithFrequency extends BaseZone {
  frequency?: string
}

/**
 * 円形のGeoJSON Polygonを生成（共通関数）
 */
function createCircleFeature(zone: ZoneWithFrequency, points: number = 32): GeoJSON.Feature {
  const coords: [number, number][] = []
  const { lat, lng, radius } = zone

  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI
    const dx = radius * Math.cos(angle)
    const dy = radius * Math.sin(angle)

    // メートルから度への変換（近似）
    const latOffset = dy / 111320
    const lngOffset = dx / (111320 * Math.cos(lat * Math.PI / 180))

    coords.push([lng + lngOffset, lat + latOffset])
  }

  return {
    type: 'Feature',
    properties: {
      name: zone.name,
      type: zone.type,
      radius: zone.radius,
      // 追加のプロパティを保持（例: frequency）
      ...(zone.frequency && { frequency: zone.frequency })
    },
    geometry: {
      type: 'Polygon',
      coordinates: [coords]
    }
  }
}

/**
 * 緊急用務空域をGeoJSON Feature Collectionに変換
 */
export function getEmergencyAirspaceGeoJSON(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: EMERGENCY_AIRSPACE.map(zone => createCircleFeature(zone, 32))
  }
}

/**
 * リモートID特定区域をGeoJSON Feature Collectionに変換
 */
export function getRemoteIdZonesGeoJSON(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: REMOTE_ID_ZONES.map(zone => createCircleFeature(zone, 48))
  }
}

/**
 * 有人機発着エリアをGeoJSON Feature Collectionに変換
 */
export function getMannedAircraftZonesGeoJSON(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: MANNED_AIRCRAFT_ZONES.map(zone => createCircleFeature(zone, 32))
  }
}

/**
 * 電波干渉区域をGeoJSON Feature Collectionに変換
 */
export function getRadioInterferenceZonesGeoJSON(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: RADIO_INTERFERENCE_ZONES.map(zone => createCircleFeature(zone, 32))
  }
}

// ============================================
// フィルタリング関数
// ============================================

/**
 * アクティブな緊急用務空域のみ取得
 */
export function getActiveEmergencyAirspace(): EmergencyAirspace[] {
  return EMERGENCY_AIRSPACE.filter(zone => zone.active)
}

/**
 * 農業関連の有人機発着エリアを取得
 */
export function getAgriculturalZones(): MannedAircraftZone[] {
  return MANNED_AIRCRAFT_ZONES.filter(zone => zone.name.includes('農業'))
}

/**
 * グライダー離着陸場を取得
 */
export function getGliderFields(): MannedAircraftZone[] {
  return MANNED_AIRCRAFT_ZONES.filter(zone => zone.name.includes('滑空'))
}

/**
 * 5G対応エリアを取得
 */
export function get5GZones(): RadioInterferenceZone[] {
  return RADIO_INTERFERENCE_ZONES.filter(zone => zone.frequency.includes('5G'))
}
