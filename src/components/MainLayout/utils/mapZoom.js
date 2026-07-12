// マップのズーム計算とポリゴン距離計算の純粋関数群

// ズーム計算時のマップ表示領域の割合（コントロールパネル等を除外）
const MAP_AREA_RATIO = 0.8

/**
 * ポリゴンの境界からズームレベルを計算
 * Web Mercator投影に基づく正確な計算 + パディング考慮
 *
 * @param {object} geometry GeoJSON geometry (Polygon または MultiPolygon)
 * @param {object} [options]
 * @param {number} [options.padding=0.25] 25%のパディング（余裕を持たせる）
 * @param {number} [options.minZoom=10] 最小ズーム
 * @param {number} [options.maxZoom=16] 最大ズーム
 * @param {number} [options.viewportWidth] ビューポート幅 (省略時は window.innerWidth)
 * @param {number} [options.viewportHeight] ビューポート高さ (省略時は window.innerHeight)
 * @returns {number} 算出されたズームレベル（整数）
 */
export const calculateZoomForBounds = (geometry, options = {}) => {
  const {
    padding = 0.25,
    minZoom = 10,
    maxZoom = 16,
    // ウィンドウサイズを自動取得（サーバーサイドレンダリング対応）
    viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 800,
    viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 600
  } = options

  if (!geometry?.coordinates?.[0]) return 14

  const coords = geometry.type === 'MultiPolygon'
    ? geometry.coordinates.flat(2)
    : geometry.coordinates[0]

  if (coords.length === 0) return 14

  const lats = coords.map(c => c[1])
  const lngs = coords.map(c => c[0])

  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)

  // パディングを適用した境界
  const latSpan = (maxLat - minLat) * (1 + padding)
  const lngSpan = (maxLng - minLng) * (1 + padding)

  // 空のスパンの場合のフォールバック
  if (latSpan <= 0 && lngSpan <= 0) return maxZoom

  // Web Mercator投影でのズーム計算
  // 地球の赤道周長（度）= 360度
  // 各ズームレベルでのタイルあたりの度数 = 360 / (2^zoom)

  // ビューポートのアスペクト比を考慮（コントロール領域を除外）
  const effectiveWidth = viewportWidth * MAP_AREA_RATIO
  const effectiveHeight = viewportHeight * MAP_AREA_RATIO

  // 経度方向のズーム計算（単純な線形関係）
  const lngZoom = lngSpan > 0
    ? Math.log2(360 / lngSpan * (effectiveWidth / 256))
    : maxZoom

  // 緯度方向のズーム計算（メルカトル投影の補正）
  // 緯度による歪みを考慮
  const centerLat = (minLat + maxLat) / 2
  const latRadians = centerLat * Math.PI / 180
  const mercatorFactor = Math.cos(latRadians)

  const latZoom = latSpan > 0
    ? Math.log2(180 / latSpan * mercatorFactor * (effectiveHeight / 256))
    : maxZoom

  // 両方向でフィットするより小さいズームを採用
  const calculatedZoom = Math.min(lngZoom, latZoom)

  // 範囲内にクランプして整数に丸める
  const finalZoom = Math.round(Math.max(minZoom, Math.min(maxZoom, calculatedZoom)))

  return finalZoom
}

/**
 * WP間の総距離を計算 (km)
 * @param {Array<{lat:number,lng:number}>} wps Waypoint 配列
 * @returns {number} 総距離(km)
 */
export const calcTotalDistance = (wps) => {
  if (!wps || wps.length < 2) return 0
  let total = 0
  for (let i = 1; i < wps.length; i++) {
    const p1 = wps[i - 1]
    const p2 = wps[i]
    const R = 6371 // km
    const dLat = (p2.lat - p1.lat) * Math.PI / 180
    const dLon = (p2.lng - p1.lng) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180)
      * Math.sin(dLon / 2) ** 2
    total += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }
  return total
}
