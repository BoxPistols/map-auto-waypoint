/**
 * useMapKeyboardShortcuts Hook
 *
 * 地図コントロール用のキーボードショートカット
 */

import { useEffect } from 'react'

/**
 * Map keyboard shortcuts configuration
 */
const MAP_STYLES = {
  streets: 'https://tile.openstreetmap.jp/styles/osm-bright-ja/style.json',
  satellite: 'https://gsi-cyberjapan.github.io/gsimaps-vector-experiment/std.json',
  terrain: 'https://demotiles.maplibre.org/style.json'
}

/**
 * @param {Object} params
 * @param {Function} params.toggle3D - Toggle 3D mode
 * @param {Function} params.toggleLayer - Toggle layer visibility
 * @param {Function} params.toggleAirportOverlay - Toggle airport overlay
 * @param {Function} params.setShowCrosshair - Set crosshair visibility
 * @param {string} params.mapStyleId - Current map style ID
 * @param {Function} params.setMapStyleId - Set map style ID
 */
export const useMapKeyboardShortcuts = ({
  toggle3D,
  toggleLayer,
  toggleAirportOverlay,
  setShowCrosshair,
  mapStyleId,
  setMapStyleId
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input field
      const activeElement = document.activeElement
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.isContentEditable
      )
      if (isInputFocused) return

      // Ignore if modifier keys are pressed
      if (e.ctrlKey || e.metaKey || e.altKey) return

      switch (e.key.toLowerCase()) {
        case 'd': // DID toggle
          e.preventDefault()
          toggleLayer('showDID')
          break
        case 'a': // Airport zones + restriction surfaces toggle
          e.preventDefault()
          toggleAirportOverlay()
          break
        case 'r': // Red zones toggle
          e.preventDefault()
          toggleLayer('showRedZones')
          break
        case 'y': // Yellow zones toggle
          e.preventDefault()
          toggleLayer('showYellowZones')
          break
        case 'h': // Heliport toggle
          e.preventDefault()
          toggleLayer('showHeliports')
          break
        case 'm': // Map style cycle (M: next, Shift+M: previous)
          {
            e.preventDefault()
            const styleKeys = Object.keys(MAP_STYLES)
            const currentIndex = styleKeys.indexOf(mapStyleId)
            const nextIndex = (currentIndex + 1) % styleKeys.length
            const prevIndex = (currentIndex - 1 + styleKeys.length) % styleKeys.length
            setMapStyleId(styleKeys[e.shiftKey ? prevIndex : nextIndex])
          }
          break
        case '3': // 3D toggle
          e.preventDefault()
          toggle3D()
          break
        // UTM新規レイヤーのキーボードショートカット
        case 'e': // Emergency airspace toggle
          e.preventDefault()
          toggleLayer('showEmergencyAirspace')
          break
        case 'i': // Remote ID zones toggle
          e.preventDefault()
          toggleLayer('showRemoteIdZones')
          break
        case 'u': // Manned aircraft zones toggle
          e.preventDefault()
          toggleLayer('showMannedAircraftZones')
          break
        case 'g': // Geographic features toggle
          e.preventDefault()
          toggleLayer('showGeoFeatures')
          break
        case 'n': // Rain cloud toggle
          e.preventDefault()
          toggleLayer('showRainCloud')
          break
        // 'o' key is reserved for Weather Forecast panel (MainLayout.jsx)
        // Wind toggle will be re-enabled when the feature is implemented
        case 't': // Radio zones (LTE) toggle
          e.preventDefault()
          toggleLayer('showRadioZones')
          break
        case 'l': // Network coverage (LTE/5G) toggle
          e.preventDefault()
          toggleLayer('showNetworkCoverage')
          break
        case 'x': // Crosshair toggle
          e.preventDefault()
          setShowCrosshair(prev => !prev)
          break
        // 新しい禁止区域カテゴリーのショートカット
        case 'q': // Nuclear plants toggle
          e.preventDefault()
          toggleLayer('showNuclearPlants')
          break
        case 'p': // Prefectures toggle (Note: conflicts with existing 'P' for Polygon panel)
          if (!e.shiftKey) { // Only lowercase 'p'
            e.preventDefault()
            toggleLayer('showPrefectures')
          }
          break
        case 'k': // Police facilities toggle
          e.preventDefault()
          toggleLayer('showPolice')
          break
        case 'j': // Prisons toggle
          e.preventDefault()
          toggleLayer('showPrisons')
          break
        case 'b': // JSDF facilities toggle
          e.preventDefault()
          toggleLayer('showJSDF')
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggle3D, toggleLayer, toggleAirportOverlay, mapStyleId, setMapStyleId, setShowCrosshair])
}
