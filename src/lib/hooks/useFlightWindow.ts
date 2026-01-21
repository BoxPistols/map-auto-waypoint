/**
 * 飛行可能時間帯フック
 * 市民薄明（Civil Twilight）に基づく飛行可能判定
 */

import { useState, useEffect, useCallback } from 'react'
import {
  getCivilTwilightEnd,
  isDaylight,
  getMinutesUntilTwilightEnd
} from '../services/sunriseSunset'

export interface FlightWindowResult {
  /** 現在飛行可能か */
  flightAllowedNow: boolean
  /** 薄明終了までの残り分数 */
  minutesRemaining: number
  /** 市民薄明終了時刻 */
  civilTwilightEnd: Date | null
  /** ローディング状態 */
  loading: boolean
  /** エラーメッセージ */
  error: string | null
  /** データ再取得 */
  refetch: () => Promise<void>
}

/**
 * 飛行可能時間帯を管理するフック
 * ドローンは市民薄明終了前に着陸する必要がある
 *
 * @param lat - 緯度
 * @param lng - 経度
 * @param date - 確認する日付（デフォルト: 現在の日付）
 * @returns 飛行可能時間帯情報
 *
 * @example
 * ```tsx
 * const { flightAllowedNow, minutesRemaining } = useFlightWindow(35.6595, 139.7004)
 *
 * if (!flightAllowedNow) {
 *   return <div>市民薄明終了後のため飛行不可</div>
 * }
 * ```
 */
export function useFlightWindow(
  lat: number,
  lng: number,
  date?: Date
): FlightWindowResult {
  const [flightAllowedNow, setFlightAllowedNow] = useState<boolean>(false)
  const [minutesRemaining, setMinutesRemaining] = useState<number>(0)
  const [civilTwilightEnd, setCivilTwilightEnd] = useState<Date | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // 日付キー（日付が変わったら再取得）
  const dateKey = date ? date.toDateString() : new Date().toDateString()

  const fetchFlightWindow = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    setError(null)

    try {
      const targetDate = date ?? new Date()

      // 市民薄明終了時刻を取得
      const twilightEnd = await getCivilTwilightEnd(lat, lng, targetDate)
      setCivilTwilightEnd(twilightEnd)

      // 現在時刻が昼間（飛行可能時間帯）かチェック
      const isAllowed = await isDaylight(lat, lng, new Date())
      setFlightAllowedNow(isAllowed)

      // 薄明終了までの残り分数を取得
      const minutes = await getMinutesUntilTwilightEnd(lat, lng)
      setMinutesRemaining(minutes)

      setError(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '飛行可能時間帯の取得に失敗しました'
      setError(errorMessage)
      setFlightAllowedNow(false)
      setMinutesRemaining(0)
      setCivilTwilightEnd(null)
    } finally {
      if (!isSilent) setLoading(false)
    }
  }, [lat, lng, date, dateKey])

  // 位置または日付が変わったら再取得
  useEffect(() => {
    fetchFlightWindow()
  }, [fetchFlightWindow])

  // 1分ごとにバックグラウンド更新
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const isAllowed = await isDaylight(lat, lng, new Date())
        setFlightAllowedNow(isAllowed)
        const minutes = await getMinutesUntilTwilightEnd(lat, lng)
        setMinutesRemaining(minutes)
      } catch (err) {
        // バックグラウンド更新の失敗は無視
        console.warn('飛行可能時間帯のバックグラウンド更新に失敗:', err)
      }
    }, 60000)

    return () => clearInterval(interval)
  }, [lat, lng])

  const refetch = useCallback(async () => {
    await fetchFlightWindow()
  }, [fetchFlightWindow])

  return {
    flightAllowedNow,
    minutesRemaining,
    civilTwilightEnd,
    loading,
    error,
    refetch
  }
}
