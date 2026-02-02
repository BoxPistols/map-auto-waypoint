import { useState } from 'react'

/**
 * クロスヘア（十字線）の状態を管理するカスタムフック
 *
 * @param {Object} initialSettings - 保存された設定
 * @returns {Object} クロスヘア状態とセッター
 */
export const useCrosshairState = (initialSettings) => {
  const [showCrosshair, setShowCrosshair] = useState(
    initialSettings.showCrosshair ?? false
  )
  const [crosshairDesign, setCrosshairDesign] = useState(
    initialSettings.crosshairDesign ?? 'square'
  )
  const [crosshairColor, setCrosshairColor] = useState(
    initialSettings.crosshairColor ?? '#e53935'
  )
  const [crosshairClickMode, setCrosshairClickMode] = useState(
    initialSettings.crosshairClickMode ?? true
  )
  const [coordinateFormat, setCoordinateFormat] = useState(
    initialSettings.coordinateFormat ?? 'dms'
  )
  const [coordinateDisplay, setCoordinateDisplay] = useState(null) // { lng, lat, screenX, screenY }

  return {
    showCrosshair,
    setShowCrosshair,
    crosshairDesign,
    setCrosshairDesign,
    crosshairColor,
    setCrosshairColor,
    crosshairClickMode,
    setCrosshairClickMode,
    coordinateFormat,
    setCoordinateFormat,
    coordinateDisplay,
    setCoordinateDisplay,
  }
}
