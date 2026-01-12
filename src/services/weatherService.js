/**
 * 天候情報サービス
 *
 * 雨雲レーダーと風向・風量データを提供
 * 参照: 気象庁ナウキャスト、OpenWeatherMap等
 */

// 気象庁ナウキャスト 雨雲レーダータイル（内部フォールバック用）
// 参照: https://www.jma.go.jp/bosai/nowc/
const getRainRadarSourceConfig = () => {
  // 現在時刻から最新のタイル時刻を計算（5分単位）
  const now = new Date()
  const minutes = Math.floor(now.getMinutes() / 5) * 5
  now.setMinutes(minutes, 0, 0)
  const timestamp = now.toISOString().replace(/[-:]/g, '').slice(0, 12)

  return {
    type: 'raster',
    tiles: [
      `https://www.jma.go.jp/bosai/jmatile/data/nowc/${timestamp}/none/${timestamp}/surf/hrpns/{z}/{x}/{y}.png`
    ],
    tileSize: 256,
    minzoom: 4,
    maxzoom: 10,
    attribution: '気象庁'
  }
}

// OpenWeatherMap 風向・風量タイル（APIキーが必要）
// 注意: 現在Map.jsxでは未使用だが、APIキー設定後に使用予定
export const getWindLayerSourceConfig = (apiKey = null) => {
  if (apiKey) {
    return {
      type: 'raster',
      tiles: [
        `https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${apiKey}`
      ],
      tileSize: 256,
      minzoom: 1,
      maxzoom: 18,
      attribution: 'OpenWeatherMap'
    }
  }

  // APIキーがない場合は気象庁の風データを使用（利用可能な場合）
  return {
    type: 'raster',
    tiles: [
      'https://www.jma.go.jp/bosai/jmatile/data/wdist/none/none/none/surf/wm/{z}/{x}/{y}.png'
    ],
    tileSize: 256,
    minzoom: 4,
    maxzoom: 10,
    attribution: '気象庁'
  }
}

// RainViewer 雨雲レーダー（無料・APIキー不要）
// 参照: https://www.rainviewer.com/api.html
let cachedRainViewerData = null
let lastFetchTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5分キャッシュ

export const fetchRainViewerData = async () => {
  const now = Date.now()

  // キャッシュが有効な場合はそれを返す
  if (cachedRainViewerData && (now - lastFetchTime) < CACHE_DURATION) {
    return cachedRainViewerData
  }

  try {
    const response = await fetch('https://api.rainviewer.com/public/weather-maps.json')
    if (!response.ok) throw new Error('Failed to fetch RainViewer data')

    const data = await response.json()
    cachedRainViewerData = data
    lastFetchTime = now

    return data
  } catch (error) {
    console.error('RainViewer API error:', error)
    return null
  }
}

export const getRainViewerSourceConfig = async () => {
  const data = await fetchRainViewerData()

  if (!data || !data.radar || !data.radar.past || data.radar.past.length === 0) {
    // フォールバック: 気象庁のナウキャストを使用
    return getRainRadarSourceConfig()
  }

  // 最新のレーダーデータを使用
  const latestRadar = data.radar.past[data.radar.past.length - 1]
  const host = data.host

  return {
    type: 'raster',
    tiles: [
      `${host}${latestRadar.path}/256/{z}/{x}/{y}/2/1_1.png`
    ],
    tileSize: 256,
    minzoom: 1,
    maxzoom: 12,
    attribution: 'RainViewer'
  }
}

