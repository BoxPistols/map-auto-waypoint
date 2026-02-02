import { useState, useCallback, useEffect } from 'react'

/**
 * レイヤー表示/非表示を管理するカスタムフック
 *
 * @param {Object} initialSettings - 保存された設定
 * @param {boolean} initialAirportOverlay - 空港オーバーレイの初期状態
 * @returns {Object} レイヤー表示状態と操作関数
 */
export const useLayerVisibility = (initialSettings, initialAirportOverlay) => {
  // レイヤー表示状態
  const [layerVisibility, setLayerVisibility] = useState({
    is3D: initialSettings.is3D,
    showAirportZones: initialAirportOverlay,
    showRestrictionSurfaces: initialAirportOverlay,
    showRedZones: initialSettings.showRedZones ?? false,
    showYellowZones: initialSettings.showYellowZones ?? false,
    showHeliports: initialSettings.showHeliports ?? false,
    showDID: initialSettings.showDID,
    showEmergencyAirspace: initialSettings.showEmergencyAirspace ?? false,
    showRemoteIdZones: initialSettings.showRemoteIdZones ?? false,
    showMannedAircraftZones: initialSettings.showMannedAircraftZones ?? false,
    showGeoFeatures: initialSettings.showGeoFeatures ?? false,
    showRainCloud: initialSettings.showRainCloud ?? false,
    showWind: initialSettings.showWind ?? false,
    showRadioZones: initialSettings.showRadioZones ?? false,
    showNetworkCoverage: initialSettings.showNetworkCoverage ?? false,
    showNuclearPlants: initialSettings.showNuclearPlants ?? false,
    showPrefectures: initialSettings.showPrefectures ?? false,
    showPolice: initialSettings.showPolice ?? false,
    showPrisons: initialSettings.showPrisons ?? false,
    showJSDF: initialSettings.showJSDF ?? false
  })

  // お気に入りグループ
  const [favoriteGroups, setFavoriteGroups] = useState(() => {
    const stored = localStorage.getItem('favoriteLayerGroups')
    return stored ? new Set(JSON.parse(stored)) : new Set()
  })

  // お気に入り状態をlocalStorageに保存
  useEffect(() => {
    localStorage.setItem('favoriteLayerGroups', JSON.stringify(Array.from(favoriteGroups)))
  }, [favoriteGroups])

  // 単一レイヤーのトグル
  const toggleLayer = useCallback((layerKey) => {
    setLayerVisibility(prev => ({ ...prev, [layerKey]: !prev[layerKey] }))
  }, [])

  // 空港オーバーレイのトグル（空港ゾーン + 制限表面）
  const toggleAirportOverlay = useCallback(() => {
    setLayerVisibility(prev => {
      const nextValue = !(prev.showAirportZones || prev.showRestrictionSurfaces)
      return {
        ...prev,
        showAirportZones: nextValue,
        showRestrictionSurfaces: nextValue
      }
    })
  }, [])

  // グループレイヤーの一括トグル
  const toggleGroupLayers = useCallback((layerKeys, enabled) => {
    setLayerVisibility(prev => {
      const updates = {}
      layerKeys.forEach(key => {
        updates[key] = enabled
      })
      return { ...prev, ...updates }
    })
  }, [])

  // お気に入りグループのトグル
  const toggleFavoriteGroup = useCallback((groupId) => {
    setFavoriteGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }, [])

  return {
    layerVisibility,
    setLayerVisibility,
    favoriteGroups,
    setFavoriteGroups,
    toggleLayer,
    toggleAirportOverlay,
    toggleGroupLayers,
    toggleFavoriteGroup,
  }
}
