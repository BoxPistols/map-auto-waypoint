/**
 * Heliport Services
 * ヘリポートデータサービス
 */

import type { Heliport, HeliportType } from '../types'

/**
 * 主要ヘリポート（有人機離発着エリア）
 */
export const HELIPORTS: Heliport[] = [
  // ===== 東京都 =====
  { name: '東京ヘリポート', lat: 35.6403, lng: 139.8372, radius: 500, type: 'heliport' },
  { name: '虎ノ門ヒルズヘリポート', lat: 35.6667, lng: 139.7500, radius: 200, type: 'heliport' },
  { name: '六本木ヒルズヘリポート', lat: 35.6603, lng: 139.7292, radius: 200, type: 'heliport' },
  { name: '晴海ヘリポート', lat: 35.6478, lng: 139.7833, radius: 300, type: 'heliport' },

  // ===== 大阪府 =====
  { name: '八尾ヘリポート', lat: 34.5967, lng: 135.6019, radius: 500, type: 'heliport' },
  { name: '舞洲ヘリポート', lat: 34.6592, lng: 135.3931, radius: 500, type: 'heliport' },

  // ===== 神奈川県 =====
  { name: '横浜ヘリポート', lat: 35.4667, lng: 139.6333, radius: 500, type: 'heliport' },

  // ===== 愛知県 =====
  { name: '名古屋ヘリポート', lat: 35.1833, lng: 136.9000, radius: 500, type: 'heliport' },

  // ===== 福岡県 =====
  { name: '福岡ヘリポート', lat: 33.5903, lng: 130.4017, radius: 500, type: 'heliport' },

  // ===== 病院ヘリポート（ドクターヘリ） =====
  { name: '聖路加国際病院', lat: 35.6714, lng: 139.7731, radius: 200, type: 'hospital_heliport' },
  { name: '日本医科大学付属病院', lat: 35.7028, lng: 139.7683, radius: 200, type: 'hospital_heliport' }
]

/**
 * 円形のGeoJSON Polygonを生成
 */
function createCircleFeature(heliport: Heliport, points: number = 32): GeoJSON.Feature {
  const coords: [number, number][] = []
  const { lat, lng, radius } = heliport

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
      name: heliport.name,
      type: heliport.type,
      radius: heliport.radius
    },
    geometry: {
      type: 'Polygon',
      coordinates: [coords]
    }
  }
}

/**
 * ヘリポートをGeoJSON Feature Collectionに変換
 */
export function getHeliportsGeoJSON(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: HELIPORTS.map(hp => createCircleFeature(hp, 32))
  }
}

/**
 * ヘリポートタイプでフィルタリングして取得
 */
export function getHeliportsByType(type: HeliportType): Heliport[] {
  return HELIPORTS.filter(hp => hp.type === type)
}

/**
 * 病院ヘリポートのみ取得
 */
export function getHospitalHeliports(): Heliport[] {
  return HELIPORTS.filter(hp => hp.type === 'hospital_heliport')
}

/**
 * 通常ヘリポートのみ取得
 */
export function getRegularHeliports(): Heliport[] {
  return HELIPORTS.filter(hp => hp.type === 'heliport')
}
