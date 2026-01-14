/**
 * Overlay Configurations
 * オーバーレイ・禁止区域設定
 */

import type { GeoOverlay, WeatherOverlay, RestrictionZone, RestrictionCategory, DIDInfo, RasterSourceConfig } from '../types'

// ============================================
// 禁止エリアの色定義
// ============================================

export const RESTRICTION_COLORS = {
  airport: '#ff9800',           // オレンジ - 空港等周辺空域
  did: '#FFB6C1',               // ピンク - 人口集中地区
  emergency: '#ef4444',         // 赤 - 緊急用務空域
  manned: '#ec4899',            // マゼンタ - 有人機発着エリア
  remote_id: '#3b82f6',         // 青 - リモートID特定区域
  heliport: '#3b82f6',          // 青 - ヘリポート
  radio: '#a855f7',             // 紫 - 電波干渉区域
  red: '#dc2626',               // 赤 - レッドゾーン（重要施設）
  yellow: '#eab308',            // 黄 - イエローゾーン（外国公館等）
  geoFeatures: '#888888'        // グレー - 地物
} as const

// ============================================
// 地理情報オーバーレイ (Geographic Overlays)
// ============================================

export const GEO_OVERLAYS: GeoOverlay[] = [
  {
    id: 'hillshade',
    name: '陰影起伏',
    tiles: ['https://cyberjapandata.gsi.go.jp/xyz/hillshademap/{z}/{x}/{y}.png'],
    opacity: 0.4,
    category: 'geo'
  },
  {
    id: 'relief',
    name: '色別標高図',
    tiles: ['https://cyberjapandata.gsi.go.jp/xyz/relief/{z}/{x}/{y}.png'],
    opacity: 0.5,
    category: 'geo'
  },
  {
    id: 'slope',
    name: '傾斜量図',
    tiles: ['https://cyberjapandata.gsi.go.jp/xyz/slopemap/{z}/{x}/{y}.png'],
    opacity: 0.5,
    category: 'geo'
  },
  {
    id: 'buildings',
    name: '地物',
    tiles: ['https://cyberjapandata.gsi.go.jp/xyz/lcm25k_2012/{z}/{x}/{y}.png'],
    opacity: 0.7,
    category: 'geo',
    minZoom: 10,
    maxZoom: 16
  }
]

// ============================================
// 天候情報オーバーレイ (Weather Overlays)
// ============================================

export const WEATHER_OVERLAYS: WeatherOverlay[] = [
  {
    id: 'rain-radar',
    name: '雨雲',
    opacity: 0.6,
    dynamic: true,
    updateInterval: 5 * 60 * 1000 // 5分
  },
  {
    id: 'wind',
    name: '風向・風量',
    opacity: 0.5,
    dynamic: true,
    updateInterval: 10 * 60 * 1000 // 10分
  }
]

// ============================================
// DID (人口集中地区) 設定
// ============================================

/**
 * DIDタイルURL
 * 令和2年国勢調査データ（2020年）
 * Note: 表示と判定の整合性を保つため、令和2年データを使用
 */
export const DID_TILE_URL = 'https://cyberjapandata.gsi.go.jp/xyz/did2020/{z}/{x}/{y}.png'

/**
 * DID区域の情報
 */
export const DID_INFO: DIDInfo = {
  description: '人口集中地区（DID）は国勢調査に基づく人口密度4,000人/km²以上の地域',
  source: '総務省統計局 令和2年国勢調査',
  tileUrl: DID_TILE_URL,
  attribution: '国土地理院',
  externalLinks: {
    gsi: 'https://www.gsi.go.jp/chizujoho/h27did.html',
    kokudo: 'https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A16-v2_3.html',
    dips: 'https://www.ossportal.dips-reg.mlit.go.jp/portal/top'
  }
}

/**
 * DIDタイルソース設定（MapLibre用）
 * Note: GSI DID tiles have limited zoom availability, maxzoom 14 is reliable
 */
export function getDIDSourceConfig(): RasterSourceConfig {
  return {
    type: 'raster',
    tiles: [DID_TILE_URL],
    tileSize: 256,
    minzoom: 8,
    maxzoom: 14
  }
}

// ============================================
// 地物レイヤー設定
// ============================================

/**
 * 地物タイルソース設定（国土地理院 地物レイヤー）
 */
export function getGeographicFeaturesSourceConfig(): RasterSourceConfig {
  return {
    type: 'raster',
    tiles: ['https://cyberjapandata.gsi.go.jp/xyz/lcm25k_2012/{z}/{x}/{y}.png'],
    tileSize: 256,
    minzoom: 10,
    maxzoom: 16,
    attribution: '国土地理院'
  }
}

// ============================================
// 禁止エリア設定
// ============================================

export const RESTRICTION_ZONES: RestrictionZone[] = [
  {
    id: 'airport-airspace',
    name: '空港など周辺空域',
    type: 'airport',
    color: RESTRICTION_COLORS.airport,
    opacity: 0.15,
    description: '空港等の周辺空域（進入表面、水平表面等）'
  },
  {
    id: 'did-area',
    name: '人口集中地区',
    type: 'did',
    color: RESTRICTION_COLORS.did,
    opacity: 0.6,
    tiles: [DID_TILE_URL],
    description: '人口集中地区（DID）- 国勢調査に基づく'
  },
  {
    id: 'emergency-airspace',
    name: '緊急用務空域',
    type: 'emergency',
    color: RESTRICTION_COLORS.emergency,
    opacity: 0.25,
    description: '災害等による緊急用務空域'
  },
  {
    id: 'manned-aircraft',
    name: '有人機発着エリア',
    type: 'manned',
    color: RESTRICTION_COLORS.manned,
    opacity: 0.2,
    description: '有人機の離着陸エリア'
  },
  {
    id: 'remote-id-zone',
    name: 'リモートID特定区域',
    type: 'remote_id',
    color: RESTRICTION_COLORS.remote_id,
    opacity: 0.15,
    description: 'リモートID特定区域'
  },
  {
    id: 'heliports',
    name: 'ヘリポート',
    type: 'heliport',
    color: RESTRICTION_COLORS.heliport,
    opacity: 0.25,
    description: 'ヘリポート・病院ヘリポート'
  },
  {
    id: 'radio-zones',
    name: '電波種(LTE)',
    type: 'radio',
    color: RESTRICTION_COLORS.radio,
    opacity: 0.2,
    description: '電波干渉区域（LTE/5G基地局周辺）'
  }
]

// 小型無人機等飛行禁止法エリア
export const NO_FLY_LAW_ZONES: RestrictionZone[] = [
  {
    id: 'no-fly-red',
    name: 'レッドゾーン',
    type: 'red',
    color: RESTRICTION_COLORS.red,
    opacity: 0.35,
    description: '小型無人機等飛行禁止法 - 重要施設周辺'
  },
  {
    id: 'no-fly-yellow',
    name: 'イエローゾーン',
    type: 'yellow',
    color: RESTRICTION_COLORS.yellow,
    opacity: 0.35,
    description: '小型無人機等飛行禁止法 - 注意区域'
  }
]

// カテゴリ別に整理
export const RESTRICTION_CATEGORIES: RestrictionCategory[] = [
  {
    id: 'airspace-restrictions',
    name: '禁止エリア',
    zones: RESTRICTION_ZONES
  },
  {
    id: 'no-fly-law',
    name: '小型無人機等飛行禁止法',
    zones: NO_FLY_LAW_ZONES
  }
]

/**
 * 全ての禁止エリアを取得
 */
export function getAllRestrictionZones(): RestrictionZone[] {
  return [...RESTRICTION_ZONES, ...NO_FLY_LAW_ZONES]
}
