/**
 * JMA (気象庁) メッシュコード変換ユーティリティ
 *
 * 緯度経度をJMA標準メッシュコードに変換
 * メッシュシステム:
 * - 1次メッシュ: 約80kmグリッド（2桁 + 2桁）
 * - 2次メッシュ: 約10kmグリッド（+1桁 + 1桁）
 * - 3次メッシュ: 約1kmグリッド（+1桁 + 1桁 = 計8桁）
 *
 * @see https://www.jma.go.jp/jma/kishou/know/mesh/meshinfo.html
 */

/**
 * 緯度経度から8桁メッシュコードに変換
 *
 * @param lat - 緯度（10進法）
 * @param lng - 経度（10進法）
 * @returns 8桁メッシュコード
 *
 * @example
 * // 東京都渋谷区
 * const code = latLngToMeshCode(35.6595, 139.7004)
 * console.log(code) // "53393599"
 */
export function latLngToMeshCode(lat: number, lng: number): string {
  // 日本の範囲チェック
  if (lat < 20 || lat > 46 || lng < 122 || lng > 154) {
    throw new Error('座標が日本の範囲外です')
  }

  // JMAメッシュシステムの定数:
  // - 1.5 = 緯度の変換係数（1° = 1.5メッシュ単位）
  // - 100 = 日本地域の経度ベースオフセット

  // 1次メッシュ（各2桁）
  const p = Math.floor(lat * 1.5)
  const q = Math.floor(lng - 100)

  // 2次メッシュ（各1桁、0-7）
  const lat_1 = lat * 60 - p * 40
  const lng_1 = (lng - 100) * 60 - q * 40
  const a = Math.min(Math.floor(lat_1 / 5), 7)
  const b = Math.min(Math.floor(lng_1 / 7.5), 7)

  // 3次メッシュ（各1桁、0-9）
  const lat_2 = lat_1 - a * 5
  const lng_2 = lng_1 - b * 7.5
  const m = Math.min(Math.floor(lat_2 / 0.5), 9)
  const n = Math.min(Math.floor(lng_2 / 0.75), 9)

  // 8桁メッシュコードとしてフォーマット
  const meshCode = `${String(p).padStart(2, '0')}${String(q).padStart(2, '0')}${a}${b}${m}${n}`

  return meshCode
}

/**
 * メッシュコードを中心座標に変換
 *
 * @param meshCode - 8桁メッシュコード
 * @returns メッシュ中心の緯度経度
 *
 * @example
 * const center = meshCodeToLatLng("53393599")
 * console.log(center) // { lat: 35.xxx, lng: 139.xxx }
 */
export function meshCodeToLatLng(meshCode: string): { lat: number; lng: number } {
  if (meshCode.length !== 8) {
    throw new Error('3次メッシュコードは8桁である必要があります')
  }

  const p = parseInt(meshCode.substring(0, 2), 10)
  const q = parseInt(meshCode.substring(2, 4), 10)
  const a = parseInt(meshCode.substring(4, 5), 10)
  const b = parseInt(meshCode.substring(5, 6), 10)
  const m = parseInt(meshCode.substring(6, 7), 10)
  const n = parseInt(meshCode.substring(7, 8), 10)

  // 南西角を計算
  const lat_sw = p / 1.5 + (a * 5) / 60 + (m * 0.5) / 60
  const lng_sw = q + 100 + (b * 7.5) / 60 + (n * 0.75) / 60

  // メッシュの中心を返す
  const lat = lat_sw + 0.25 / 60 // 0.5分の半分を加算
  const lng = lng_sw + 0.375 / 60 // 0.75分の半分を加算

  return { lat, lng }
}

/**
 * メッシュコードのバウンディングボックスを取得
 *
 * @param meshCode - 8桁メッシュコード
 * @returns バウンディングボックス [minLng, minLat, maxLng, maxLat]
 */
export function meshCodeToBBox(meshCode: string): [number, number, number, number] {
  if (meshCode.length !== 8) {
    throw new Error('3次メッシュコードは8桁である必要があります')
  }

  const p = parseInt(meshCode.substring(0, 2), 10)
  const q = parseInt(meshCode.substring(2, 4), 10)
  const a = parseInt(meshCode.substring(4, 5), 10)
  const b = parseInt(meshCode.substring(5, 6), 10)
  const m = parseInt(meshCode.substring(6, 7), 10)
  const n = parseInt(meshCode.substring(7, 8), 10)

  // 南西角を計算
  const minLat = p / 1.5 + (a * 5) / 60 + (m * 0.5) / 60
  const minLng = q + 100 + (b * 7.5) / 60 + (n * 0.75) / 60

  // 北東角を計算（メッシュサイズ: 緯度0.5分、経度0.75分を加算）
  const maxLat = minLat + 0.5 / 60
  const maxLng = minLng + 0.75 / 60

  return [minLng, minLat, maxLng, maxLat]
}

/**
 * 周囲のメッシュコードを取得（中心 + 8近傍）
 *
 * @param meshCode - 中心メッシュコード
 * @returns 9個のメッシュコード配列（中心 + 8近傍）
 */
export function getSurroundingMeshCodes(meshCode: string): string[] {
  const center = meshCodeToLatLng(meshCode)
  const meshSizeLat = 0.5 / 60 // 0.5分（度）
  const meshSizeLng = 0.75 / 60 // 0.75分（度）

  const meshCodes: string[] = []

  // 3x3グリッドのメッシュコードを生成
  for (let latOffset = -1; latOffset <= 1; latOffset++) {
    for (let lngOffset = -1; lngOffset <= 1; lngOffset++) {
      try {
        const lat = center.lat + latOffset * meshSizeLat
        const lng = center.lng + lngOffset * meshSizeLng
        const code = latLngToMeshCode(lat, lng)
        meshCodes.push(code)
      } catch {
        // 範囲外の場合はスキップ
      }
    }
  }

  return meshCodes
}

/**
 * メッシュコードの妥当性を検証
 *
 * @param meshCode - 検証するメッシュコード
 * @returns 有効な場合true、無効な場合false
 */
export function isValidMeshCode(meshCode: string): boolean {
  if (typeof meshCode !== 'string' || meshCode.length !== 8) {
    return false
  }

  // 全て数字かチェック
  if (!/^\d{8}$/.test(meshCode)) {
    return false
  }

  try {
    const coords = meshCodeToLatLng(meshCode)
    // 座標が日本の範囲内かチェック
    return coords.lat >= 20 && coords.lat <= 46 && coords.lng >= 122 && coords.lng <= 154
  } catch {
    return false
  }
}

/**
 * 1次メッシュコード（4桁）を取得
 */
export function getFirstLevelMeshCode(lat: number, lng: number): string {
  if (lat < 20 || lat > 46 || lng < 122 || lng > 154) {
    throw new Error('座標が日本の範囲外です')
  }

  const p = Math.floor(lat * 1.5)
  const q = Math.floor(lng - 100)

  return `${String(p).padStart(2, '0')}${String(q).padStart(2, '0')}`
}

/**
 * 2次メッシュコード（6桁）を取得
 */
export function getSecondLevelMeshCode(lat: number, lng: number): string {
  if (lat < 20 || lat > 46 || lng < 122 || lng > 154) {
    throw new Error('座標が日本の範囲外です')
  }

  const p = Math.floor(lat * 1.5)
  const q = Math.floor(lng - 100)

  const lat_1 = lat * 60 - p * 40
  const lng_1 = (lng - 100) * 60 - q * 40
  const a = Math.min(Math.floor(lat_1 / 5), 7)
  const b = Math.min(Math.floor(lng_1 / 7.5), 7)

  return `${String(p).padStart(2, '0')}${String(q).padStart(2, '0')}${a}${b}`
}

/**
 * メッシュレベルの情報
 */
export const MESH_LEVELS = {
  FIRST: {
    digits: 4,
    latSize: 40 / 60, // 度
    lngSize: 1, // 度
    approxKm: 80
  },
  SECOND: {
    digits: 6,
    latSize: 5 / 60, // 度
    lngSize: 7.5 / 60, // 度
    approxKm: 10
  },
  THIRD: {
    digits: 8,
    latSize: 0.5 / 60, // 度
    lngSize: 0.75 / 60, // 度
    approxKm: 1
  }
} as const

export const MeshCodeService = {
  latLngToMeshCode,
  meshCodeToLatLng,
  meshCodeToBBox,
  getSurroundingMeshCodes,
  isValidMeshCode,
  getFirstLevelMeshCode,
  getSecondLevelMeshCode,
  MESH_LEVELS
}
