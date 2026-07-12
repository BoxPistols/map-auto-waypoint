import { Map as MapIcon, Layers, Menu, Route, Maximize2, Minimize2, Download } from 'lucide-react'
import { calcTotalDistance } from '../utils/mapZoom'

/**
 * モバイル時にマップ上に表示するコントロール群
 *  - フルマップモード切替ボタン
 *  - サイドバー折りたたみ時のFloating Stats (ポリゴン数 / WP数 / 距離 / エクスポート / 展開)
 */
export default function MobileMapControls({
  isMobile,
  sidebarCollapsed,
  fullMapMode,
  toggleFullMapMode,
  polygons,
  waypoints,
  setActivePanel,
  setSidebarCollapsed,
  onOpenExport,
}) {
  return (
    <>
      {/* Mobile Full Map Mode Toggle - サイドバー折りたたみ時のみ表示 */}
      {isMobile && sidebarCollapsed && !fullMapMode && (
        <button
          className="full-map-toggle"
          onClick={toggleFullMapMode}
          title="マップに集中 [F]"
        >
          <Maximize2 size={20} />
        </button>
      )}

      {/* フルマップモード解除ボタン */}
      {isMobile && fullMapMode && (
        <button
          className="full-map-toggle active"
          onClick={toggleFullMapMode}
          title="UIを表示 [F]"
        >
          <Minimize2 size={20} />
        </button>
      )}

      {/* Mobile Floating Stats (when sidebar collapsed) */}
      {isMobile && sidebarCollapsed && !fullMapMode && (
        <div className="mobile-floating-stats">
          <button
            className="floating-stat"
            onClick={() => { setActivePanel('polygons'); setSidebarCollapsed(false) }}
          >
            <Layers size={14} />
            <span>{polygons.length}</span>
          </button>
          <button
            className="floating-stat"
            onClick={() => { setActivePanel('waypoints'); setSidebarCollapsed(false) }}
          >
            <MapIcon size={14} />
            <span>{waypoints.length}</span>
          </button>
          {waypoints.length >= 2 && (
            <div className="floating-stat distance">
              <Route size={12} />
              <span>{calcTotalDistance(waypoints).toFixed(1)}km</span>
            </div>
          )}
          <button
            className="floating-stat export"
            onClick={onOpenExport}
            title="エクスポート"
          >
            <Download size={14} />
          </button>
          <button
            className="floating-stat expand"
            onClick={() => setSidebarCollapsed(false)}
            title="サイドバーを開く"
          >
            <Menu size={16} />
          </button>
        </div>
      )}
    </>
  )
}
