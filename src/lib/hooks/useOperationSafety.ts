/**
 * 運用安全性統合フック
 * 気象・通信・昼光条件を統合した安全性評価
 */

import { useMemo, useCallback } from 'react'
import { useWeatherMesh } from './useWeatherMesh'
import { useNetworkCoverage } from './useNetworkCoverage'
import { useFlightWindow } from './useFlightWindow'

export type SafetyLevel = 'safe' | 'caution' | 'warning' | 'danger' | 'prohibited'

export interface SafetyReason {
  category: 'weather' | 'network' | 'daylight' | 'wind' | 'precipitation'
  severity: 'info' | 'warning' | 'critical'
  message: string
  value?: number
  unit?: string
  threshold?: number
}

export interface OperationSafetyResult {
  /** 飛行可能か */
  canFly: boolean
  /** 安全性に関する理由リスト */
  reasons: SafetyReason[]
  /** 安全レベル */
  safetyLevel: SafetyLevel
  /** 次の安全な飛行可能時間帯 */
  nextSafeWindow: Date | null
  /** ローディング状態 */
  loading: boolean
  /** エラーメッセージ */
  error: string | null
  /** 全データ再取得 */
  refetch: () => Promise<void>
  /** 気象データ（詳細用） */
  weatherData?: {
    windSpeed?: number
    windDirection?: number
    precipitationProbability?: number
    temperature?: number
  }
  /** 通信データ（詳細用） */
  networkData?: {
    hasLTE: boolean
    signalStrength: string
  }
  /** 飛行可能時間帯データ（詳細用） */
  flightWindowData?: {
    flightAllowedNow: boolean
    minutesRemaining: number | null
  }
}

/**
 * ドローン運用の総合的な安全性を評価するフック
 *
 * 安全ルール:
 * - 風速 >= 10 m/s → 飛行不可
 * - LTE圏外 → 飛行不可
 * - 市民薄明終了後 → 飛行不可
 * - 降水確率 > 50% → 飛行不可
 *
 * @param lat - 緯度
 * @param lng - 経度
 * @param meshCode - JMAメッシュコード（8桁）
 * @returns 総合的な安全性評価結果
 *
 * @example
 * ```tsx
 * const safety = useOperationSafety(35.6595, 139.7004, '53393599')
 *
 * if (safety.loading) return <div>安全性を確認中...</div>
 *
 * if (!safety.canFly) {
 *   return (
 *     <div>
 *       <h3>飛行不可</h3>
 *       <ul>
 *         {safety.reasons.map((reason, i) => (
 *           <li key={i}>{reason.message}</li>
 *         ))}
 *       </ul>
 *     </div>
 *   )
 * }
 * ```
 */
export function useOperationSafety(
  lat: number,
  lng: number,
  meshCode: string | null
): OperationSafetyResult {
  // 各安全データを取得
  const weather = useWeatherMesh(meshCode)
  const network = useNetworkCoverage(lat, lng)
  const flightWindow = useFlightWindow(lat, lng)

  // ローディング状態を統合
  const loading = weather.loading || network.loading || flightWindow.loading

  // エラー状態を統合
  const error = weather.error || network.error || flightWindow.error

  // 安全性評価
  const safetyEvaluation = useMemo(() => {
    const reasons: SafetyReason[] = []
    let canFly = true
    let safetyLevel: SafetyLevel = 'safe'

    // データが利用可能かチェック
    if (!weather.data || !flightWindow.civilTwilightEnd) {
      return {
        canFly: false,
        reasons: [{
          category: 'weather' as const,
          severity: 'critical' as const,
          message: '安全データを読み込めませんでした'
        }],
        safetyLevel: 'prohibited' as SafetyLevel,
        nextSafeWindow: null
      }
    }

    const currentForecast = weather.data.forecasts[0]

    // 風速チェック（critical: >= 10 m/s）
    if (currentForecast.windSpeed >= 10) {
      canFly = false
      safetyLevel = 'danger'
      reasons.push({
        category: 'wind',
        severity: 'critical',
        message: `風速が高すぎます: ${currentForecast.windSpeed.toFixed(1)} m/s（上限: 10 m/s）`,
        value: currentForecast.windSpeed,
        unit: 'm/s',
        threshold: 10
      })
    } else if (currentForecast.windSpeed >= 5) {
      safetyLevel = 'warning'
      reasons.push({
        category: 'wind',
        severity: 'warning',
        message: `中程度の風速: ${currentForecast.windSpeed.toFixed(1)} m/s（注意が必要）`,
        value: currentForecast.windSpeed,
        unit: 'm/s',
        threshold: 5
      })
    } else if (currentForecast.windSpeed >= 2) {
      if (safetyLevel === 'safe') safetyLevel = 'caution'
      reasons.push({
        category: 'wind',
        severity: 'info',
        message: `微風: ${currentForecast.windSpeed.toFixed(1)} m/s`,
        value: currentForecast.windSpeed,
        unit: 'm/s',
        threshold: 2
      })
    }

    // 降水確率チェック（critical: > 50%）
    if (currentForecast.precipitationProbability > 50) {
      canFly = false
      if (safetyLevel !== 'danger') safetyLevel = 'danger'
      reasons.push({
        category: 'precipitation',
        severity: 'critical',
        message: `降水確率が高すぎます: ${currentForecast.precipitationProbability}%（上限: 50%）`,
        value: currentForecast.precipitationProbability,
        unit: '%',
        threshold: 50
      })
    } else if (currentForecast.precipitationProbability > 30) {
      if (safetyLevel === 'safe') safetyLevel = 'caution'
      reasons.push({
        category: 'precipitation',
        severity: 'warning',
        message: `中程度の降水確率: ${currentForecast.precipitationProbability}%`,
        value: currentForecast.precipitationProbability,
        unit: '%',
        threshold: 30
      })
    }

    // LTE利用可能性チェック（critical）
    if (!network.hasLTE) {
      canFly = false
      safetyLevel = 'prohibited'
      reasons.push({
        category: 'network',
        severity: 'critical',
        message: 'この地点ではLTE通信が利用できません'
      })
    } else if (network.signalStrength === 'poor') {
      if (safetyLevel === 'safe') safetyLevel = 'caution'
      reasons.push({
        category: 'network',
        severity: 'warning',
        message: 'ネットワーク信号が弱いです'
      })
    }

    // 昼光/市民薄明チェック（critical）
    if (!flightWindow.flightAllowedNow) {
      canFly = false
      safetyLevel = 'prohibited'
      reasons.push({
        category: 'daylight',
        severity: 'critical',
        message: '市民薄明終了後のため飛行禁止です'
      })
    } else if (flightWindow.minutesRemaining < 30 && flightWindow.minutesRemaining > 0) {
      if (safetyLevel === 'safe') safetyLevel = 'caution'
      reasons.push({
        category: 'daylight',
        severity: 'warning',
        message: `薄明終了まで残り${flightWindow.minutesRemaining}分です`
      })
    }

    // 次の安全な飛行可能時間帯を計算
    let nextSafeWindow: Date | null = null
    if (!canFly) {
      if (!network.hasLTE) {
        // LTE圏外の場合は飛行不可能
        nextSafeWindow = null
      } else if (!flightWindow.flightAllowedNow && flightWindow.civilTwilightEnd) {
        // 夜間の場合は翌朝
        const tomorrow = new Date(flightWindow.civilTwilightEnd)
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(6, 0, 0, 0)
        nextSafeWindow = tomorrow
      } else {
        // 気象条件が改善する時間を探す
        const safeForecast = weather.data.forecasts.find(f => {
          const isWeatherSafe = f.windSpeed < 10 && f.precipitationProbability <= 50
          const forecastTime = new Date(f.timestamp)
          const isDaylightSafe = flightWindow.civilTwilightEnd
            ? forecastTime < flightWindow.civilTwilightEnd
            : true
          return isWeatherSafe && isDaylightSafe
        })

        if (safeForecast) {
          nextSafeWindow = new Date(safeForecast.timestamp)
        } else if (flightWindow.civilTwilightEnd) {
          // 今日中に改善しない場合は翌朝
          const tomorrow = new Date(flightWindow.civilTwilightEnd)
          tomorrow.setDate(tomorrow.getDate() + 1)
          tomorrow.setHours(6, 0, 0, 0)
          nextSafeWindow = tomorrow
        }
      }
    }

    // 全条件がクリアの場合
    if (canFly && reasons.length === 0) {
      reasons.push({
        category: 'weather',
        severity: 'info',
        message: '全ての安全条件を満たしています - 飛行可能'
      })
    }

    return {
      canFly,
      reasons,
      safetyLevel,
      nextSafeWindow
    }
  }, [
    weather.data,
    network.hasLTE,
    network.signalStrength,
    flightWindow.flightAllowedNow,
    flightWindow.minutesRemaining,
    flightWindow.civilTwilightEnd
  ])

  const { refetch: refetchWeather } = weather
  const { refetch: refetchNetwork } = network
  const { refetch: refetchFlightWindow } = flightWindow

  // 全データを再取得
  const refetch = useCallback(async () => {
    await Promise.all([
      refetchWeather(),
      refetchNetwork(),
      refetchFlightWindow()
    ])
  }, [refetchWeather, refetchNetwork, refetchFlightWindow])

  const reasons = Array.isArray(safetyEvaluation?.reasons)
    ? safetyEvaluation.reasons
    : []

  return {
    canFly: safetyEvaluation?.canFly ?? false,
    reasons,
    safetyLevel: safetyEvaluation?.safetyLevel ?? 'prohibited',
    nextSafeWindow: safetyEvaluation?.nextSafeWindow ?? null,
    loading,
    error,
    refetch,
    weatherData: weather.data?.forecasts[0] ? {
      windSpeed: weather.data.forecasts[0].windSpeed,
      windDirection: weather.data.forecasts[0].windDirection,
      precipitationProbability: weather.data.forecasts[0].precipitationProbability,
      temperature: weather.data.forecasts[0].temperature
    } : undefined,
    networkData: {
      hasLTE: network.hasLTE,
      signalStrength: network.signalStrength
    },
    flightWindowData: {
      flightAllowedNow: flightWindow.flightAllowedNow,
      minutesRemaining: flightWindow.minutesRemaining
    }
  }
}

/**
 * 安全レベルの色を取得
 */
export function getSafetyLevelColor(level: SafetyLevel): string {
  switch (level) {
    case 'safe': return '#22c55e' // green
    case 'caution': return '#eab308' // yellow
    case 'warning': return '#f97316' // orange
    case 'danger': return '#ef4444' // red
    case 'prohibited': return '#991b1b' // dark red
    default: return '#6b7280' // gray
  }
}

/**
 * 安全レベルのテキストを取得
 */
export function getSafetyLevelText(level: SafetyLevel): string {
  switch (level) {
    case 'safe': return '安全'
    case 'caution': return '注意'
    case 'warning': return '警告'
    case 'danger': return '危険'
    case 'prohibited': return '飛行禁止'
    default: return '不明'
  }
}
