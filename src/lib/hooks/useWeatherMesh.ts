/**
 * 気象メッシュフック
 * JMAメッシュコードに基づく気象データ取得
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { meshCodeToLatLng } from '../utils/meshCode'
import { fetchWeather, type WeatherData } from '../services/weatherApi'

export interface MeshWeatherForecast {
  windSpeed: number
  windDirection: number
  precipitationProbability: number
  temperature: number
  timestamp: string
  meshCode: string
}

export interface MeshTimeSeriesData {
  meshCode: string
  forecasts: MeshWeatherForecast[]
}

export type WindLevel = 'safe' | 'caution' | 'warning' | 'danger'

export interface WeatherMeshResult {
  /** 気象データ */
  data: MeshTimeSeriesData | null
  /** ローディング状態 */
  loading: boolean
  /** エラーメッセージ */
  error: string | null
  /** データ再取得 */
  refetch: () => Promise<void>
}

/**
 * 風速レベルを分類
 * - 0-2 m/s: safe
 * - 2-5 m/s: caution
 * - 5-10 m/s: warning
 * - 10+ m/s: danger
 */
export function classifyWindLevel(windSpeed: number): WindLevel {
  if (windSpeed < 2) return 'safe'
  if (windSpeed < 5) return 'caution'
  if (windSpeed < 10) return 'warning'
  return 'danger'
}

/**
 * 気象メッシュデータを管理するフック
 *
 * @param meshCode - JMAメッシュコード（8桁）
 * @param hours - 予報時間数（デフォルト: 24、最大: 72）
 * @returns 気象データ
 *
 * @example
 * ```tsx
 * const { data, loading, error } = useWeatherMesh('53393599', 24)
 *
 * if (loading) return <div>気象データを読み込み中...</div>
 *
 * const windLevel = classifyWindLevel(data.forecasts[0].windSpeed)
 * ```
 */
export function useWeatherMesh(
  meshCode: string | null,
  hours: number = 24
): WeatherMeshResult {
  const [data, setData] = useState<MeshTimeSeriesData | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!meshCode) {
      setError('メッシュコードが必要です')
      setData(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // メッシュコードから座標を取得
      const center = meshCodeToLatLng(meshCode)

      // Open-Meteo APIから気象データを取得
      const weatherData = await fetchWeather(center.lat, center.lng)

      // 時系列データに変換
      const forecasts: MeshWeatherForecast[] = []
      const now = new Date()
      const hoursToFetch = Math.min(hours, weatherData.hourly.length)

      for (let i = 0; i < hoursToFetch; i++) {
        const hourly = weatherData.hourly[i]
        const forecastTime = new Date(now.getTime() + i * 60 * 60 * 1000)

        forecasts.push({
          windSpeed: hourly.windSpeed,
          windDirection: hourly.windDirection,
          precipitationProbability: hourly.precipitationProbability,
          temperature: hourly.temperature,
          timestamp: forecastTime.toISOString(),
          meshCode
        })
      }

      setData({
        meshCode,
        forecasts
      })
      setError(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '気象データの取得に失敗しました'
      setError(errorMessage)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [meshCode, hours])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const refetch = useCallback(async () => {
    await fetchData()
  }, [fetchData])

  return {
    data,
    loading,
    error,
    refetch
  }
}

/**
 * 現在の気象予報を取得するフック
 */
export function useCurrentWeatherForecast(data: MeshTimeSeriesData | null) {
  return useMemo(() => {
    if (!data || data.forecasts.length === 0) return null
    return data.forecasts[0]
  }, [data])
}
