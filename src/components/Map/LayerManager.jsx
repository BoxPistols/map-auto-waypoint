/**
 * LayerManager Component
 *
 * レイヤー設定に基づいてMapLibreのSource/Layerコンポーネントをレンダリング
 */

import { useMemo } from 'react'
import { Source, Layer } from 'react-map-gl/maplibre'
import { shouldShowLayer } from '../../config/layerConfigs'

/**
 * LayerManager - レイヤー描画管理コンポーネント
 *
 * @param {Object} props
 * @param {Array} props.layerConfigs - レイヤー設定配列
 * @param {Object} props.layerVisibility - レイヤー表示状態
 * @param {Object} props.state - 追加の状態（restrictionSurfacesDataなど）
 */
const LayerManager = ({ layerConfigs, layerVisibility, state = {} }) => {
  // レイヤーデータをメモ化
  const layerDataMap = useMemo(() => {
    const map = new Map()
    layerConfigs.forEach((config) => {
      if (config.getData) {
        map.set(config.id, config.getData())
      }
    })
    return map
  }, [layerConfigs])

  return (
    <>
      {layerConfigs.map((config) => {
        // 表示条件を評価
        if (!shouldShowLayer(config, layerVisibility, state)) {
          return null
        }

        // データを取得
        const data = layerDataMap.get(config.id)

        return (
          <Source key={config.id} id={config.id} type="geojson" data={data}>
            {config.layers.map((layer) => (
              <Layer key={layer.id} {...layer} />
            ))}
          </Source>
        )
      })}
    </>
  )
}

export default LayerManager
