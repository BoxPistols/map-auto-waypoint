/**
 * ネットワークカバレッジフック
 * LTE/5G通信可能性の判定
 */

import { useState, useEffect, useCallback } from 'react'
import {
  checkLTEAvailability,
  getNetworkCoverage,
  type NetworkCoverageInfo,
  type SignalStrength
} from '../services/networkCoverage'

export interface NetworkCoverageResult {
  /** LTE利用可能か */
  hasLTE: boolean
  /** 信号強度 */
  signalStrength: SignalStrength
  /** ローディング状態 */
  loading: boolean
  /** エラーメッセージ */
  error: string | null
  /** 詳細なカバレッジ情報 */
  coverageInfo: NetworkCoverageInfo | null
  /** データ再取得 */
  refetch: () => Promise<void>
}

/**
 * ネットワークカバレッジを管理するフック
 *
 * @param lat - 緯度
 * @param lng - 経度
 * @param carrier - オプションのキャリアフィルタ
 * @returns ネットワークカバレッジ情報
 *
 * @example
 * ```tsx
 * const { hasLTE, signalStrength, loading } = useNetworkCoverage(35.6595, 139.7004)
 *
 * if (!hasLTE) {
 *   return <div>LTE圏外です</div>
 * }
 * ```
 */
export function useNetworkCoverage(
  lat: number,
  lng: number,
  carrier?: string
): NetworkCoverageResult {
  const [hasLTE, setHasLTE] = useState<boolean>(false)
  const [signalStrength, setSignalStrength] = useState<SignalStrength>('none')
  const [coverageInfo, setCoverageInfo] = useState<NetworkCoverageInfo | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCoverage = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // 基本的なLTE利用可能性チェック
      const lteAvailable = checkLTEAvailability(lat, lng)
      setHasLTE(lteAvailable)

      // 詳細なカバレッジ情報を取得
      const coverage = await getNetworkCoverage({ lat, lng, carrier })
      setCoverageInfo(coverage)
      setSignalStrength(coverage.signalStrength)
      setHasLTE(coverage.hasLTE)
      setError(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'ネットワークカバレッジの取得に失敗しました'
      setError(errorMessage)
      setHasLTE(false)
      setSignalStrength('none')
      setCoverageInfo(null)
    } finally {
      setLoading(false)
    }
  }, [lat, lng, carrier])

  useEffect(() => {
    fetchCoverage()
  }, [fetchCoverage])

  const refetch = useCallback(async () => {
    await fetchCoverage()
  }, [fetchCoverage])

  return {
    hasLTE,
    signalStrength,
    loading,
    error,
    coverageInfo,
    refetch
  }
}
