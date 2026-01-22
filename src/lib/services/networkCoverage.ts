/**
 * ネットワークカバレッジサービス
 * LTE/5G通信可能エリアの判定
 *
 * 注意: 現在はモック実装
 * 将来的にはOpenSignal/CellMapper等のAPIまたは
 * ユーザー報告データとの統合を検討
 */

import { createCirclePolygon } from '../utils/geo'

export type SignalStrength = 'excellent' | 'good' | 'fair' | 'poor' | 'none'

export interface NetworkCoverageInfo {
  hasLTE: boolean
  has5G: boolean
  signalStrength: SignalStrength
  estimatedBandwidth: number // Mbps
  carriers: string[]
  lastUpdated: string
}

export interface NetworkCoverageRequest {
  lat: number
  lng: number
  carrier?: string
}

/**
 * 信号強度から推定帯域幅を取得
 */
const BANDWIDTH_BY_STRENGTH: Record<SignalStrength, number> = {
  excellent: 50,
  good: 30,
  fair: 15,
  poor: 5,
  none: 0
}

/**
 * 日本の主要都市エリア（簡易判定用）
 * 実際にはより詳細なデータが必要
 */
const MAJOR_URBAN_AREAS = [
  // 関東
  { name: '東京', lat: 35.6762, lng: 139.6503, radius: 50 },
  { name: '横浜', lat: 35.4437, lng: 139.6380, radius: 20 },
  { name: 'さいたま', lat: 35.8617, lng: 139.6455, radius: 15 },
  { name: '千葉', lat: 35.6073, lng: 140.1063, radius: 15 },
  // 関西
  { name: '大阪', lat: 34.6937, lng: 135.5023, radius: 30 },
  { name: '京都', lat: 35.0116, lng: 135.7681, radius: 15 },
  { name: '神戸', lat: 34.6901, lng: 135.1956, radius: 15 },
  // 中部
  { name: '名古屋', lat: 35.1815, lng: 136.9066, radius: 25 },
  // 北海道
  { name: '札幌', lat: 43.0621, lng: 141.3544, radius: 20 },
  // 九州
  { name: '福岡', lat: 33.5904, lng: 130.4017, radius: 20 },
  // 東北
  { name: '仙台', lat: 38.2682, lng: 140.8694, radius: 15 },
  // 中国
  { name: '広島', lat: 34.3853, lng: 132.4553, radius: 15 },
]

/**
 * 2点間の距離を計算（km）
 */
function calculateDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // 地球の半径（km）
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * LTE利用可能かどうかを簡易判定
 * 日本国内の主要都市圏では基本的に利用可能と仮定
 *
 * @param lat - 緯度
 * @param lng - 経度
 * @returns LTE利用可能かどうか
 */
export function checkLTEAvailability(lat: number, lng: number): boolean {
  // 日本国内かチェック
  if (lat < 24 || lat > 46 || lng < 122 || lng > 154) {
    return false
  }

  // 主要都市圏からの距離をチェック
  for (const area of MAJOR_URBAN_AREAS) {
    const distance = calculateDistanceKm(lat, lng, area.lat, area.lng)
    if (distance <= area.radius * 2) {
      return true
    }
  }

  // 日本国内であれば基本的にLTE利用可能と仮定（人口カバー率99%以上）
  // ただし山間部・離島は例外
  return true
}

/**
 * 信号強度を推定
 *
 * @param lat - 緯度
 * @param lng - 経度
 * @returns 推定信号強度
 */
export function estimateSignalStrength(lat: number, lng: number): SignalStrength {
  // 主要都市圏からの距離に基づいて推定
  let minDistance = Infinity

  for (const area of MAJOR_URBAN_AREAS) {
    const distance = calculateDistanceKm(lat, lng, area.lat, area.lng)
    if (distance < minDistance) {
      minDistance = distance
    }
  }

  // 距離に基づいて信号強度を推定
  if (minDistance <= 5) return 'excellent'
  if (minDistance <= 15) return 'good'
  if (minDistance <= 30) return 'fair'
  if (minDistance <= 50) return 'poor'

  // 遠隔地でも基本的にはLTEは届く
  return 'fair'
}

/**
 * ネットワークカバレッジ情報を取得
 *
 * @param request - リクエスト（緯度、経度、オプションでキャリア）
 * @returns カバレッジ情報
 */
export async function getNetworkCoverage(
  request: NetworkCoverageRequest
): Promise<NetworkCoverageInfo> {
  const { lat, lng } = request

  // 基本的なチェック
  const hasLTE = checkLTEAvailability(lat, lng)
  const signalStrength = hasLTE ? estimateSignalStrength(lat, lng) : 'none'

  // 5Gは主要都市の中心部のみ
  let has5G = false
  for (const area of MAJOR_URBAN_AREAS) {
    const distance = calculateDistanceKm(lat, lng, area.lat, area.lng)
    if (distance <= 5) {
      has5G = true
      break
    }
  }

  return {
    hasLTE,
    has5G,
    signalStrength,
    estimatedBandwidth: BANDWIDTH_BY_STRENGTH[signalStrength],
    carriers: hasLTE ? ['docomo', 'au', 'softbank', 'rakuten'] : [],
    lastUpdated: new Date().toISOString()
  }
}

/**
 * 信号強度のラベルを取得
 */
export function getSignalStrengthLabel(strength: SignalStrength): string {
  switch (strength) {
    case 'excellent': return '非常に良好'
    case 'good': return '良好'
    case 'fair': return '普通'
    case 'poor': return '弱い'
    case 'none': return '圏外'
  }
}

/**
 * 信号強度の色を取得
 */
export function getSignalStrengthColor(strength: SignalStrength): string {
  switch (strength) {
    case 'excellent': return '#22c55e'
    case 'good': return '#84cc16'
    case 'fair': return '#eab308'
    case 'poor': return '#f97316'
    case 'none': return '#ef4444'
  }
}

// ============================================
// GeoJSON Generation Functions
// ============================================

/**
 * LTEカバレッジエリアのGeoJSON生成
 * 主要都市圏の広域カバレッジを表示
 */
export function generateLTECoverageGeoJSON(): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = MAJOR_URBAN_AREAS.map((area) => ({
    type: 'Feature',
    properties: {
      id: `lte-${area.name}`,
      name: `${area.name} LTE`,
      type: 'LTE',
      signalStrength: 'good',
      carriers: ['docomo', 'au', 'softbank', 'rakuten']
    },
    geometry: createCirclePolygon([area.lng, area.lat], area.radius)
  }))

  return {
    type: 'FeatureCollection',
    features
  }
}

/**
 * 5GカバレッジエリアのGeoJSON生成
 * 主要都市の中心部のみ（半径5km）
 */
export function generate5GCoverageGeoJSON(): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = MAJOR_URBAN_AREAS.map((area) => ({
    type: 'Feature',
    properties: {
      id: `5g-${area.name}`,
      name: `${area.name} 5G`,
      type: '5G',
      signalStrength: 'excellent',
      carriers: ['docomo', 'au', 'softbank']
    },
    geometry: createCirclePolygon([area.lng, area.lat], 5)
  }))

  return {
    type: 'FeatureCollection',
    features
  }
}

export const NetworkCoverageService = {
  checkLTEAvailability,
  estimateSignalStrength,
  getNetworkCoverage,
  getSignalStrengthLabel,
  getSignalStrengthColor,
  generateLTECoverage: generateLTECoverageGeoJSON,
  generate5GCoverage: generate5GCoverageGeoJSON
}
