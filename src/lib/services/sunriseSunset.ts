/**
 * Sunrise-Sunset.org API Service
 * ドローン飛行計画のための日出・日没・薄明時刻を提供
 *
 * Civil twilight end（市民薄明終了）はドローンの最終飛行可能時刻の判定に重要
 *
 * @see https://sunrise-sunset.org/api
 */

export interface SunriseSunsetData {
  /** 日の出 (ISO 8601) */
  sunrise: string
  /** 日の入 (ISO 8601) */
  sunset: string
  /** 南中時刻 (ISO 8601) */
  solarNoon: string
  /** 日長（秒） */
  dayLength: number
  /** 市民薄明（Civil Twilight） */
  civilTwilight: {
    begin: string
    end: string
  }
  /** 航海薄明（Nautical Twilight） */
  nauticalTwilight: {
    begin: string
    end: string
  }
  /** 天文薄明（Astronomical Twilight） */
  astronomicalTwilight: {
    begin: string
    end: string
  }
}

interface SunriseSunsetApiResponse {
  results: {
    sunrise: string
    sunset: string
    solar_noon: string
    day_length: string
    civil_twilight_begin: string
    civil_twilight_end: string
    nautical_twilight_begin: string
    nautical_twilight_end: string
    astronomical_twilight_begin: string
    astronomical_twilight_end: string
  }
  status: string
  tzId?: string
}

export interface SunTimesRequest {
  lat: number
  lng: number
  date?: Date
  tzId?: string
}

const API_BASE_URL = 'https://api.sunrise-sunset.org/json'
const DEFAULT_TIMEZONE = 'Asia/Tokyo'

// キャッシュ（同日のリクエストを高速化）
const cache = new Map<string, SunriseSunsetData>()

/**
 * 指定位置・日付の日出日没時刻を取得
 */
export async function fetchSunriseSunset(request: SunTimesRequest): Promise<SunriseSunsetData> {
  const { lat, lng, date = new Date(), tzId = DEFAULT_TIMEZONE } = request

  // キャッシュチェック
  const cacheKey = getCacheKey(lat, lng, date, tzId)
  const cached = cache.get(cacheKey)
  if (cached) {
    return cached
  }

  try {
    const dateStr = formatDateForApi(date)
    const url = `${API_BASE_URL}?lat=${lat}&lng=${lng}&date=${dateStr}&formatted=0&tzid=${tzId}`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Sunrise-Sunset API returned ${response.status}`)
    }

    const apiData: SunriseSunsetApiResponse = await response.json()

    if (apiData.status !== 'OK') {
      throw new Error(`API returned status: ${apiData.status}`)
    }

    const data = parseSunriseSunsetResponse(apiData)

    // キャッシュに保存
    cache.set(cacheKey, data)

    // 古いキャッシュをクリア
    cleanCache()

    return data
  } catch (error) {
    console.error('Failed to fetch sunrise/sunset times:', error)
    return createFallbackSunTimes(date)
  }
}

/**
 * 市民薄明終了時刻を取得（ドローン飛行の最終時刻判定に重要）
 */
export async function getCivilTwilightEnd(
  lat: number,
  lng: number,
  date: Date = new Date()
): Promise<Date> {
  const sunTimes = await fetchSunriseSunset({ lat, lng, date })
  return new Date(sunTimes.civilTwilight.end)
}

/**
 * 指定時刻が昼間（飛行可能時間帯）かどうかを判定
 * 日の出から市民薄明終了までが飛行可能
 */
export async function isDaylight(
  lat: number,
  lng: number,
  time: Date = new Date()
): Promise<boolean> {
  const sunTimes = await fetchSunriseSunset({ lat, lng, date: time })
  const sunrise = new Date(sunTimes.sunrise)
  const twilightEnd = new Date(sunTimes.civilTwilight.end)

  return time >= sunrise && time <= twilightEnd
}

/**
 * 市民薄明終了までの残り分数を取得
 */
export async function getMinutesUntilTwilightEnd(lat: number, lng: number): Promise<number> {
  const twilightEnd = await getCivilTwilightEnd(lat, lng)
  const now = new Date()
  const diffMs = twilightEnd.getTime() - now.getTime()
  return Math.floor(diffMs / (1000 * 60))
}

/**
 * ゴールデンアワー（写真撮影に最適な時間帯）を計算
 * 日の出後1時間、日没前1時間
 */
export async function getGoldenHours(
  lat: number,
  lng: number,
  date: Date = new Date()
): Promise<{
  morning: { start: Date; end: Date }
  evening: { start: Date; end: Date }
}> {
  const sunTimes = await fetchSunriseSunset({ lat, lng, date })
  const sunrise = new Date(sunTimes.sunrise)
  const sunset = new Date(sunTimes.sunset)

  return {
    morning: {
      start: sunrise,
      end: new Date(sunrise.getTime() + 60 * 60 * 1000)
    },
    evening: {
      start: new Date(sunset.getTime() - 60 * 60 * 1000),
      end: sunset
    }
  }
}

/**
 * ドローン飛行可能時間帯を取得
 * 日の出30分後から市民薄明終了まで
 */
export async function getDroneFlightWindow(
  lat: number,
  lng: number,
  date: Date = new Date()
): Promise<{
  start: Date
  end: Date
  durationMinutes: number
}> {
  const sunTimes = await fetchSunriseSunset({ lat, lng, date })
  const sunrise = new Date(sunTimes.sunrise)
  const twilightEnd = new Date(sunTimes.civilTwilight.end)

  // 日の出30分後を開始時刻とする（安全マージン）
  const start = new Date(sunrise.getTime() + 30 * 60 * 1000)
  const end = twilightEnd
  const durationMinutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60))

  return { start, end, durationMinutes }
}

/**
 * APIレスポンスをパース
 */
function parseSunriseSunsetResponse(apiData: SunriseSunsetApiResponse): SunriseSunsetData {
  const { results } = apiData

  const dayLength = parseInt(results.day_length, 10)

  return {
    sunrise: results.sunrise,
    sunset: results.sunset,
    solarNoon: results.solar_noon,
    dayLength,
    civilTwilight: {
      begin: results.civil_twilight_begin,
      end: results.civil_twilight_end
    },
    nauticalTwilight: {
      begin: results.nautical_twilight_begin,
      end: results.nautical_twilight_end
    },
    astronomicalTwilight: {
      begin: results.astronomical_twilight_begin,
      end: results.astronomical_twilight_end
    }
  }
}

/**
 * フォールバック用の日出日没時刻を生成
 * API利用不可時に使用する保守的な推定値
 */
function createFallbackSunTimes(date: Date): SunriseSunsetData {
  // 日本（北緯35度）の保守的な推定値
  // 日の出 ~6:00、日没 ~18:00、市民薄明 ~日没30分後
  const baseDate = new Date(date)
  baseDate.setHours(0, 0, 0, 0)

  const sunrise = new Date(baseDate.getTime() + 6 * 60 * 60 * 1000)
  const sunset = new Date(baseDate.getTime() + 18 * 60 * 60 * 1000)
  const civilTwilightBegin = new Date(sunrise.getTime() - 30 * 60 * 1000)
  const civilTwilightEnd = new Date(sunset.getTime() + 30 * 60 * 1000)
  const nauticalTwilightBegin = new Date(sunrise.getTime() - 60 * 60 * 1000)
  const nauticalTwilightEnd = new Date(sunset.getTime() + 60 * 60 * 1000)
  const astronomicalTwilightBegin = new Date(sunrise.getTime() - 90 * 60 * 1000)
  const astronomicalTwilightEnd = new Date(sunset.getTime() + 90 * 60 * 1000)
  const solarNoon = new Date(baseDate.getTime() + 12 * 60 * 60 * 1000)
  const dayLength = 12 * 60 * 60 // 12時間（秒）

  console.warn('Using fallback sun times - actual times may vary')

  return {
    sunrise: sunrise.toISOString(),
    sunset: sunset.toISOString(),
    solarNoon: solarNoon.toISOString(),
    dayLength,
    civilTwilight: {
      begin: civilTwilightBegin.toISOString(),
      end: civilTwilightEnd.toISOString()
    },
    nauticalTwilight: {
      begin: nauticalTwilightBegin.toISOString(),
      end: nauticalTwilightEnd.toISOString()
    },
    astronomicalTwilight: {
      begin: astronomicalTwilightBegin.toISOString(),
      end: astronomicalTwilightEnd.toISOString()
    }
  }
}

/**
 * 日付をAPI用フォーマット（YYYY-MM-DD）に変換
 */
function formatDateForApi(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * キャッシュキーを生成
 */
function getCacheKey(lat: number, lng: number, date: Date, tzId: string): string {
  const dateStr = formatDateForApi(date)
  return `${lat.toFixed(4)}_${lng.toFixed(4)}_${dateStr}_${tzId}`
}

/**
 * 古いキャッシュをクリア
 */
function cleanCache(): void {
  const today = formatDateForApi(new Date())
  const keysToDelete: string[] = []

  for (const key of cache.keys()) {
    if (!key.includes(today)) {
      keysToDelete.push(key)
    }
  }

  keysToDelete.forEach((key) => cache.delete(key))
}

/**
 * 日出日没時刻を表示用にフォーマット
 */
export function formatSunTimes(data: SunriseSunsetData): string {
  const sunrise = new Date(data.sunrise)
  const sunset = new Date(data.sunset)
  const twilightEnd = new Date(data.civilTwilight.end)

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit'
    })

  return `日の出: ${formatTime(sunrise)}, 日の入: ${formatTime(sunset)}, 薄明終了: ${formatTime(twilightEnd)}`
}

/**
 * 日出日没情報を詳細にフォーマット
 */
export function formatSunTimesDetailed(data: SunriseSunsetData): {
  sunrise: string
  sunset: string
  civilTwilightEnd: string
  dayLengthHours: string
  goldenHourMorning: string
  goldenHourEvening: string
} {
  const sunrise = new Date(data.sunrise)
  const sunset = new Date(data.sunset)
  const civilTwilightEnd = new Date(data.civilTwilight.end)

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit'
    })

  const hours = Math.floor(data.dayLength / 3600)
  const minutes = Math.floor((data.dayLength % 3600) / 60)

  const goldenMorningEnd = new Date(sunrise.getTime() + 60 * 60 * 1000)
  const goldenEveningStart = new Date(sunset.getTime() - 60 * 60 * 1000)

  return {
    sunrise: formatTime(sunrise),
    sunset: formatTime(sunset),
    civilTwilightEnd: formatTime(civilTwilightEnd),
    dayLengthHours: `${hours}時間${minutes}分`,
    goldenHourMorning: `${formatTime(sunrise)}〜${formatTime(goldenMorningEnd)}`,
    goldenHourEvening: `${formatTime(goldenEveningStart)}〜${formatTime(sunset)}`
  }
}

export const SunriseSunsetService = {
  fetchSunriseSunset,
  getCivilTwilightEnd,
  isDaylight,
  getMinutesUntilTwilightEnd,
  getGoldenHours,
  getDroneFlightWindow,
  formatSunTimes,
  formatSunTimesDetailed
}
