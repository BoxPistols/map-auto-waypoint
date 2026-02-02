import { useState } from 'react'

/**
 * マップの基本状態を管理するカスタムフック
 *
 * @param {Object} options - オプション
 * @param {Object} options.center - 初期中心座標 { lat, lng }
 * @param {number} options.zoom - 初期ズームレベル
 * @param {Object} options.initialSettings - 保存された設定
 * @returns {Object} マップ状態とセッター
 */
export const useMapState = ({ center, zoom, initialSettings }) => {
  const [viewState, setViewState] = useState({
    latitude: center.lat,
    longitude: center.lng,
    zoom: zoom,
    pitch: initialSettings.is3D ? 60 : 0,
    bearing: 0
  })

  const [isMapReady, setIsMapReady] = useState(false)
  const [mapStyleId, setMapStyleId] = useState(initialSettings.mapStyleId || 'osm')
  const [showStylePicker, setShowStylePicker] = useState(false)
  const [mobileControlsExpanded, setMobileControlsExpanded] = useState(false)

  // 気象レイヤー用のソース
  const [rainCloudSource, setRainCloudSource] = useState(null)
  const [windSource, setWindSource] = useState(null)

  // 制限表面データ
  const [restrictionSurfacesData, setRestrictionSurfacesData] = useState(null)

  return {
    viewState,
    setViewState,
    isMapReady,
    setIsMapReady,
    mapStyleId,
    setMapStyleId,
    showStylePicker,
    setShowStylePicker,
    mobileControlsExpanded,
    setMobileControlsExpanded,
    rainCloudSource,
    setRainCloudSource,
    windSource,
    setWindSource,
    restrictionSurfacesData,
    setRestrictionSurfacesData,
  }
}
