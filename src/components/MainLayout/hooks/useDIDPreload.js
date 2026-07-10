import { useEffect, useRef, useState } from 'react'
import { preloadDIDDataForCoordinates, isAllDIDCacheReady } from '../../../services/didService'

/**
 * DIDデータプリロード hook
 * 初回waypoints存在時にDIDデータをプリロードし、準備完了フラグを返す
 *
 * @param {Array} waypoints 現在のウェイポイント配列
 * @returns {boolean} DIDデータ準備完了フラグ
 */
export function useDIDPreload(waypoints) {
  const [didDataReady, setDidDataReady] = useState(false)
  const didPreloadAttemptedRef = useRef(false)

  useEffect(() => {
    if (!waypoints || waypoints.length === 0) return
    if (didPreloadAttemptedRef.current) return // 既にプリロード試行済み

    didPreloadAttemptedRef.current = true

    // キャッシュが既に準備できているかチェック
    if (isAllDIDCacheReady(waypoints)) {
      setDidDataReady(true)
      return
    }

    // DIDデータをプリロード
    const preload = async () => {
      try {
        await preloadDIDDataForCoordinates(waypoints)
        setDidDataReady(true)
      } catch (error) {
        console.warn('[DID] Preload failed:', error)
        setDidDataReady(true) // エラーでも続行
      }
    }

    preload()
  }, [waypoints])

  return didDataReady
}
