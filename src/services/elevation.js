/**
 * 国土地理院 標高API (DEM)
 * https://maps.gsi.go.jp/development/elevation_s.html
 */

const GSI_ELEVATION_URL = 'https://cyberjapandata2.gsi.go.jp/general/dem/scripts/getelevation.php'

/**
 * 単一地点の標高を取得
 * @param {number} lat - 緯度
 * @param {number} lng - 経度
 * @returns {Promise<number|null>} 標高(m) or null
 */
export const getElevation = async (lat, lng) => {
  try {
    const params = new URLSearchParams({
      lon: lng.toString(),
      lat: lat.toString(),
      outtype: 'JSON'
    })

    const response = await fetch(`${GSI_ELEVATION_URL}?${params}`)

    if (!response.ok) {
      throw new Error(`Elevation API error: ${response.status}`)
    }

    const data = await response.json()

    // APIは "-----" を返すことがある（海上など）
    if (data.elevation === '-----' || data.elevation === null) {
      return null
    }

    return parseFloat(data.elevation)
  } catch (error) {
    console.error('Elevation fetch error:', error)
    return null
  }
}

/**
 * 複数地点の標高を一括取得
 * @param {Array<{lat: number, lng: number}>} points - 座標配列
 * @param {number} delay - リクエスト間隔(ms)
 * @returns {Promise<Array<number|null>>} 標高配列
 */
export const getElevations = async (points, delay = 100) => {
  const results = []

  for (let i = 0; i < points.length; i++) {
    const point = points[i]
    const elevation = await getElevation(point.lat, point.lng)
    results.push(elevation)

    // レート制限対策
    if (i < points.length - 1 && delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  return results
}

/**
 * Waypointに標高データを追加
 * @param {Array} waypoints - Waypoint配列
 * @param {Function} onProgress - 進捗コールバック (current, total)
 * @returns {Promise<Array>} 標高付きWaypoint配列
 */
export const addElevationToWaypoints = async (waypoints, onProgress) => {
  const results = []

  for (let i = 0; i < waypoints.length; i++) {
    const wp = waypoints[i]
    const elevation = await getElevation(wp.lat, wp.lng)

    results.push({
      ...wp,
      elevation: elevation,
      altitude: elevation !== null ? elevation + 50 : null // 地上50m
    })

    onProgress?.(i + 1, waypoints.length)

    // レート制限: 100ms間隔
    if (i < waypoints.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  return results
}

/**
 * 標高をフォーマット
 * @param {number|null} elevation
 * @returns {string}
 */
export const formatElevation = (elevation) => {
  if (elevation === null || elevation === undefined) {
    return 'N/A'
  }
  return `${elevation.toFixed(1)}m`
}
