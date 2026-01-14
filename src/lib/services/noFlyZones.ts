/**
 * No-Fly Zone Services
 * 飛行禁止区域データサービス
 *
 * 小型無人機等飛行禁止法に基づく禁止区域
 * レッドゾーン: 施設上空 完全禁止
 * イエローゾーン: 周辺300m 事前通報・許可が必要
 *
 * データ引用元: 警察庁、国土交通省、DIDinJapan2026プロジェクト
 */

import type { NoFlyZone, NoFlyZoneType, NoFlyZoneCategory } from '../types'

/**
 * 飛行禁止区域（重要施設周辺）
 */
export const NO_FLY_ZONES: NoFlyZone[] = [
  // ===== 国の重要施設（レッドゾーン） =====
  { name: '国会議事堂', lat: 35.6759, lng: 139.7450, radius: 300, type: 'red', category: 'government' },
  { name: '首相官邸', lat: 35.6731, lng: 139.7412, radius: 300, type: 'red', category: 'government' },
  { name: '最高裁判所', lat: 35.6795, lng: 139.7424, radius: 300, type: 'red', category: 'government' },
  { name: '皇居', lat: 35.6852, lng: 139.7528, radius: 300, type: 'red', category: 'imperial' },
  { name: '赤坂御所', lat: 35.6753, lng: 139.7310, radius: 300, type: 'red', category: 'imperial' },
  { name: '東宮御所', lat: 35.6763, lng: 139.7270, radius: 300, type: 'red', category: 'imperial' },
  { name: '迎賓館赤坂離宮', lat: 35.6803, lng: 139.7267, radius: 300, type: 'red', category: 'imperial' },
  { name: '国土交通省', lat: 35.6746, lng: 139.7501, radius: 300, type: 'red', category: 'government' },
  { name: '警察庁', lat: 35.6773, lng: 139.7500, radius: 300, type: 'red', category: 'government' },
  { name: '防衛省', lat: 35.6933, lng: 139.7285, radius: 300, type: 'red', category: 'defense' },

  // ===== 原子力発電所（レッドゾーン） =====
  { name: '泊発電所', lat: 43.0339, lng: 140.5136, radius: 300, type: 'red', category: 'nuclear' },
  { name: '東通原子力発電所', lat: 41.1861, lng: 141.3861, radius: 300, type: 'red', category: 'nuclear' },
  { name: '女川原子力発電所', lat: 38.4019, lng: 141.5003, radius: 300, type: 'red', category: 'nuclear' },
  { name: '福島第一原子力発電所', lat: 37.4211, lng: 141.0328, radius: 300, type: 'red', category: 'nuclear' },
  { name: '福島第二原子力発電所', lat: 37.3167, lng: 141.0250, radius: 300, type: 'red', category: 'nuclear' },
  { name: '柏崎刈羽原子力発電所', lat: 37.4286, lng: 138.5978, radius: 300, type: 'red', category: 'nuclear' },
  { name: '東海第二発電所', lat: 36.4664, lng: 140.6072, radius: 300, type: 'red', category: 'nuclear' },
  { name: '浜岡原子力発電所', lat: 34.6219, lng: 138.1428, radius: 300, type: 'red', category: 'nuclear' },
  { name: '志賀原子力発電所', lat: 37.0600, lng: 136.7289, radius: 300, type: 'red', category: 'nuclear' },
  { name: '敦賀発電所', lat: 35.7514, lng: 136.0186, radius: 300, type: 'red', category: 'nuclear' },
  { name: '美浜発電所', lat: 35.7017, lng: 135.9581, radius: 300, type: 'red', category: 'nuclear' },
  { name: '大飯発電所', lat: 35.5422, lng: 135.6561, radius: 300, type: 'red', category: 'nuclear' },
  { name: '高浜発電所', lat: 35.5203, lng: 135.5050, radius: 300, type: 'red', category: 'nuclear' },
  { name: '島根原子力発電所', lat: 35.5386, lng: 132.9992, radius: 300, type: 'red', category: 'nuclear' },
  { name: '伊方発電所', lat: 33.4903, lng: 132.3094, radius: 300, type: 'red', category: 'nuclear' },
  { name: '玄海原子力発電所', lat: 33.5153, lng: 129.8369, radius: 300, type: 'red', category: 'nuclear' },
  { name: '川内原子力発電所', lat: 31.8339, lng: 130.1894, radius: 300, type: 'red', category: 'nuclear' },

  // ===== 在日米軍施設（レッドゾーン） =====
  { name: '横田基地', lat: 35.7483, lng: 139.3486, radius: 300, type: 'red', category: 'us_military' },
  { name: '厚木基地', lat: 35.4547, lng: 139.4500, radius: 300, type: 'red', category: 'us_military' },
  { name: '横須賀基地', lat: 35.2833, lng: 139.6667, radius: 300, type: 'red', category: 'us_military' },
  { name: '座間キャンプ', lat: 35.4833, lng: 139.4000, radius: 300, type: 'red', category: 'us_military' },
  { name: '嘉手納基地', lat: 26.3517, lng: 127.7683, radius: 300, type: 'red', category: 'us_military' },
  { name: '普天間基地', lat: 26.2744, lng: 127.7558, radius: 300, type: 'red', category: 'us_military' },
  { name: '三沢基地（米軍）', lat: 40.7033, lng: 141.3686, radius: 300, type: 'red', category: 'us_military' },
  { name: '岩国基地', lat: 34.1456, lng: 132.2361, radius: 300, type: 'red', category: 'us_military' },
  { name: '佐世保基地', lat: 33.1500, lng: 129.7167, radius: 300, type: 'red', category: 'us_military' },

  // ===== 外国公館等（イエローゾーン） =====
  { name: 'アメリカ大使館', lat: 35.6678, lng: 139.7425, radius: 300, type: 'yellow', category: 'embassy' },
  { name: '中国大使館', lat: 35.6558, lng: 139.7353, radius: 300, type: 'yellow', category: 'embassy' },
  { name: 'ロシア大使館', lat: 35.6630, lng: 139.7439, radius: 300, type: 'yellow', category: 'embassy' },
  { name: '韓国大使館', lat: 35.6611, lng: 139.7297, radius: 300, type: 'yellow', category: 'embassy' },
  { name: 'イギリス大使館', lat: 35.6758, lng: 139.7467, radius: 300, type: 'yellow', category: 'embassy' },
  { name: 'フランス大使館', lat: 35.6636, lng: 139.7403, radius: 300, type: 'yellow', category: 'embassy' },
  { name: '自民党本部', lat: 35.6781, lng: 139.7394, radius: 300, type: 'yellow', category: 'political' }
]

/**
 * 円形のGeoJSON Polygonを生成
 */
function createCircleFeature(zone: NoFlyZone, points: number = 32): GeoJSON.Feature {
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
      category: zone.category,
      radius: zone.radius
    },
    geometry: {
      type: 'Polygon',
      coordinates: [coords]
    }
  }
}

/**
 * 全ての飛行禁止区域をGeoJSON Feature Collectionに変換
 */
export function getNoFlyZonesGeoJSON(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: NO_FLY_ZONES.map(zone => createCircleFeature(zone, 32))
  }
}

/**
 * レッドゾーン（国の重要施設・原発・米軍基地）のみ取得
 */
export function getRedZonesGeoJSON(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: NO_FLY_ZONES
      .filter(zone => zone.type === 'red')
      .map(zone => createCircleFeature(zone, 32))
  }
}

/**
 * イエローゾーン（外国公館・政党本部等）のみ取得
 */
export function getYellowZonesGeoJSON(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: NO_FLY_ZONES
      .filter(zone => zone.type === 'yellow')
      .map(zone => createCircleFeature(zone, 32))
  }
}

/**
 * 禁止区域タイプでフィルタリングして取得
 */
export function getNoFlyZonesByType(type: NoFlyZoneType): NoFlyZone[] {
  return NO_FLY_ZONES.filter(zone => zone.type === type)
}

/**
 * カテゴリでフィルタリングして取得
 */
export function getNoFlyZonesByCategory(category: NoFlyZoneCategory): NoFlyZone[] {
  return NO_FLY_ZONES.filter(zone => zone.category === category)
}

/**
 * 原子力発電所のみ取得
 */
export function getNuclearPlants(): NoFlyZone[] {
  return NO_FLY_ZONES.filter(zone => zone.category === 'nuclear')
}

/**
 * 外国公館のみ取得
 */
export function getEmbassies(): NoFlyZone[] {
  return NO_FLY_ZONES.filter(zone => zone.category === 'embassy')
}
