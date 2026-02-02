/**
 * Map Layer Configurations
 *
 * 各レイヤーの設定を集約管理
 */

import {
  getAirportZonesGeoJSON,
  getRedZonesGeoJSON,
  getYellowZonesGeoJSON,
  getHeliportsGeoJSON,
  getEmergencyAirspaceGeoJSON,
  getRemoteIdZonesGeoJSON,
  getMannedAircraftZonesGeoJSON,
  getRadioInterferenceZonesGeoJSON,
  getLTECoverageGeoJSON,
  get5GCoverageGeoJSON
} from '../lib'

/**
 * GeoJSON Airspace Layers
 *
 * @param {Object} params - レイヤー設定パラメータ
 * @returns {Array} レイヤー設定配列
 */
export const createAirspaceLayerConfigs = () => {
  return [
    // 空港制限区域
    {
      id: 'airport-zones',
      label: '空港制限区域',
      getData: getAirportZonesGeoJSON,
      visibilityKey: 'isAirportOverlayEnabled',
      additionalCondition: (state) => !state.restrictionSurfacesData,
      layers: [
        {
          id: 'airport-zones-fill',
          type: 'fill',
          paint: {
            'fill-color': '#7B1FA2',
            'fill-opacity': 0.15
          }
        },
        {
          id: 'airport-zones-outline',
          type: 'line',
          paint: {
            'line-color': '#6A1B9A',
            'line-width': 2,
            'line-dasharray': [4, 2]
          }
        },
        {
          id: 'airport-zones-label',
          type: 'symbol',
          layout: {
            'text-field': ['get', 'name'],
            'text-size': 11,
            'text-anchor': 'center'
          },
          paint: {
            'text-color': '#4A148C',
            'text-halo-color': '#fff',
            'text-halo-width': 1
          }
        }
      ]
    },

    // レッドゾーン（国の重要施設・原発・米軍基地）
    {
      id: 'red-zones',
      label: 'レッドゾーン',
      getData: getRedZonesGeoJSON,
      visibilityKey: 'showRedZones',
      layers: [
        {
          id: 'red-zones-fill',
          type: 'fill',
          paint: {
            'fill-color': '#dc2626',
            'fill-opacity': 0.35
          }
        },
        {
          id: 'red-zones-outline',
          type: 'line',
          paint: {
            'line-color': '#dc2626',
            'line-width': 2
          }
        },
        {
          id: 'red-zones-label',
          type: 'symbol',
          layout: {
            'text-field': ['get', 'name'],
            'text-size': 10,
            'text-anchor': 'center'
          },
          paint: {
            'text-color': '#991b1b',
            'text-halo-color': '#fff',
            'text-halo-width': 1
          }
        }
      ]
    },

    // イエローゾーン（外国公館・政党本部）
    {
      id: 'yellow-zones',
      label: 'イエローゾーン',
      getData: getYellowZonesGeoJSON,
      visibilityKey: 'showYellowZones',
      layers: [
        {
          id: 'yellow-zones-fill',
          type: 'fill',
          paint: {
            'fill-color': '#eab308',
            'fill-opacity': 0.2
          }
        },
        {
          id: 'yellow-zones-outline',
          type: 'line',
          paint: {
            'line-color': '#ca8a04',
            'line-width': 2,
            'line-dasharray': [6, 3]
          }
        },
        {
          id: 'yellow-zones-label',
          type: 'symbol',
          minzoom: 13,
          layout: {
            'text-field': ['get', 'name'],
            'text-size': 10,
            'text-anchor': 'center'
          },
          paint: {
            'text-color': '#854d0e',
            'text-halo-color': '#fff',
            'text-halo-width': 1
          }
        }
      ]
    },

    // ヘリポート
    {
      id: 'heliports',
      label: 'ヘリポート',
      getData: getHeliportsGeoJSON,
      visibilityKey: 'showHeliports',
      layers: [
        {
          id: 'heliports-fill',
          type: 'fill',
          paint: {
            'fill-color': '#3b82f6',
            'fill-opacity': 0.25
          }
        },
        {
          id: 'heliports-outline',
          type: 'line',
          paint: {
            'line-color': '#2563eb',
            'line-width': 2,
            'line-dasharray': [3, 2]
          }
        },
        {
          id: 'heliports-label',
          type: 'symbol',
          layout: {
            'text-field': ['get', 'name'],
            'text-size': 10,
            'text-anchor': 'center'
          },
          paint: {
            'text-color': '#1d4ed8',
            'text-halo-color': '#fff',
            'text-halo-width': 1
          }
        }
      ]
    },

    // 緊急用務空域
    {
      id: 'emergency-airspace',
      label: '緊急用務空域',
      getData: getEmergencyAirspaceGeoJSON,
      visibilityKey: 'showEmergencyAirspace',
      layers: [
        {
          id: 'emergency-airspace-fill',
          type: 'fill',
          paint: {
            'fill-color': '#f97316',
            'fill-opacity': 0.25
          }
        },
        {
          id: 'emergency-airspace-outline',
          type: 'line',
          paint: {
            'line-color': '#ea580c',
            'line-width': 2,
            'line-dasharray': [5, 3]
          }
        },
        {
          id: 'emergency-airspace-label',
          type: 'symbol',
          layout: {
            'text-field': ['get', 'name'],
            'text-size': 10,
            'text-anchor': 'center'
          },
          paint: {
            'text-color': '#9a3412',
            'text-halo-color': '#fff',
            'text-halo-width': 1
          }
        }
      ]
    },

    // RemoteID特定区域
    {
      id: 'remote-id-zones',
      label: 'RemoteID特定区域',
      getData: getRemoteIdZonesGeoJSON,
      visibilityKey: 'showRemoteIdZones',
      layers: [
        {
          id: 'remote-id-zones-fill',
          type: 'fill',
          paint: {
            'fill-color': '#8b5cf6',
            'fill-opacity': 0.15
          }
        },
        {
          id: 'remote-id-zones-outline',
          type: 'line',
          paint: {
            'line-color': '#7c3aed',
            'line-width': 1.5,
            'line-dasharray': [4, 2]
          }
        },
        {
          id: 'remote-id-zones-label',
          type: 'symbol',
          layout: {
            'text-field': ['get', 'name'],
            'text-size': 9,
            'text-anchor': 'center'
          },
          paint: {
            'text-color': '#5b21b6',
            'text-halo-color': '#fff',
            'text-halo-width': 1
          }
        }
      ]
    },

    // 有人機活動空域
    {
      id: 'manned-aircraft-zones',
      label: '有人機活動空域',
      getData: getMannedAircraftZonesGeoJSON,
      visibilityKey: 'showMannedAircraftZones',
      layers: [
        {
          id: 'manned-aircraft-zones-fill',
          type: 'fill',
          paint: {
            'fill-color': '#06b6d4',
            'fill-opacity': 0.2
          }
        },
        {
          id: 'manned-aircraft-zones-outline',
          type: 'line',
          paint: {
            'line-color': '#0891b2',
            'line-width': 2,
            'line-dasharray': [6, 3]
          }
        },
        {
          id: 'manned-aircraft-zones-label',
          type: 'symbol',
          layout: {
            'text-field': ['get', 'name'],
            'text-size': 10,
            'text-anchor': 'center'
          },
          paint: {
            'text-color': '#164e63',
            'text-halo-color': '#fff',
            'text-halo-width': 1
          }
        }
      ]
    },

    // 電波干渉エリア
    {
      id: 'radio-interference-zones',
      label: '電波干渉エリア',
      getData: getRadioInterferenceZonesGeoJSON,
      visibilityKey: 'showRadioInterferenceZones',
      layers: [
        {
          id: 'radio-interference-zones-fill',
          type: 'fill',
          paint: {
            'fill-color': '#f43f5e',
            'fill-opacity': 0.15
          }
        },
        {
          id: 'radio-interference-zones-outline',
          type: 'line',
          paint: {
            'line-color': '#e11d48',
            'line-width': 1.5,
            'line-dasharray': [3, 2]
          }
        },
        {
          id: 'radio-interference-zones-label',
          type: 'symbol',
          layout: {
            'text-field': ['get', 'name'],
            'text-size': 9,
            'text-anchor': 'center'
          },
          paint: {
            'text-color': '#881337',
            'text-halo-color': '#fff',
            'text-halo-width': 1
          }
        }
      ]
    },

    // LTE通信カバレッジ
    {
      id: 'lte-coverage',
      label: 'LTE通信カバレッジ',
      getData: getLTECoverageGeoJSON,
      visibilityKey: 'showLTECoverage',
      layers: [
        {
          id: 'lte-coverage-fill',
          type: 'fill',
          paint: {
            'fill-color': '#22c55e',
            'fill-opacity': 0.1
          }
        },
        {
          id: 'lte-coverage-outline',
          type: 'line',
          paint: {
            'line-color': '#16a34a',
            'line-width': 1,
            'line-dasharray': [2, 2]
          }
        }
      ]
    },

    // 5G通信カバレッジ
    {
      id: '5g-coverage',
      label: '5G通信カバレッジ',
      getData: get5GCoverageGeoJSON,
      visibilityKey: 'show5GCoverage',
      layers: [
        {
          id: '5g-coverage-fill',
          type: 'fill',
          paint: {
            'fill-color': '#3b82f6',
            'fill-opacity': 0.1
          }
        },
        {
          id: '5g-coverage-outline',
          type: 'line',
          paint: {
            'line-color': '#2563eb',
            'line-width': 1,
            'line-dasharray': [2, 2]
          }
        }
      ]
    }
  ]
}

/**
 * レイヤーの表示条件を評価
 *
 * @param {Object} config - レイヤー設定
 * @param {Object} layerVisibility - レイヤー表示状態
 * @param {Object} state - 追加の状態（restrictionSurfacesDataなど）
 * @returns {boolean} 表示するかどうか
 */
export const shouldShowLayer = (config, layerVisibility, state = {}) => {
  // visibilityKeyがない場合は常に表示
  if (!config.visibilityKey) {
    return true
  }

  // 特殊なキー（isAirportOverlayEnabled）の処理
  const isVisible = config.visibilityKey === 'isAirportOverlayEnabled'
    ? state.isAirportOverlayEnabled
    : layerVisibility[config.visibilityKey]

  // 追加条件がある場合は評価
  if (config.additionalCondition) {
    return isVisible && config.additionalCondition(state)
  }

  return isVisible
}
