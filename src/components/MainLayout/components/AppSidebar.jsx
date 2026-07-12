import { ChevronDown, Search, Map as MapIcon, Layers, Menu, Route, X, Box, Rotate3D, Satellite } from 'lucide-react'
import SearchForm from '../../SearchForm/SearchForm'
import PolygonList from '../../PolygonList/PolygonList'
import WaypointList from '../../WaypointList/WaypointList'
import { MAP_STYLES, CROSSHAIR_DESIGNS, CROSSHAIR_COLORS, COORDINATE_FORMATS } from '../../Map/mapConstants'
import { calcTotalDistance } from '../utils/mapZoom'

/**
 * アプリケーションサイドバー
 * 検索 / ポリゴンタブ / Waypointタブ
 * 折りたたみ時はミニビュー表示
 */
export default function AppSidebar({
  sidebarCollapsed,
  fullMapMode,
  isMobile,
  toggleSidebar,
  polygons,
  waypoints,
  activePanel,
  setActivePanel,
  isSearchExpanded,
  setIsSearchExpanded,
  panelContentRef,
  panelHeight,
  handleResizeStart,
  // 検索
  handleSearch,
  handleSearchSelect,
  handleGeneratePolygon,
  // 地図操作ミニコントローラ
  isMapQuickControlsExpanded,
  setIsMapQuickControlsExpanded,
  showDIDTooltip,
  setShowDIDTooltip,
  didTooltipAutoFade,
  setDidTooltipAutoFade,
  mapControlsState,
  mapControlsActionsRef,
  // ポリゴン
  selectedPolygonId,
  handlePolygonSelect,
  handlePolygonDelete,
  handlePolygonRename,
  handleEditPolygonShape,
  handleToggleWaypointLink,
  handleGenerateWaypoints,
  handleGenerateAllWaypoints,
  handleLoadExampleData,
  handleResetAll,
  polygonConflicts,
  // Waypoint
  handleWaypointSelect,
  handleWaypointDelete,
  handleWaypointUpdate,
  handleWaypointClear,
  handleFetchElevation,
  isLoadingElevation,
  elevationProgress,
  onOpenRouteOptimizer,
}) {
  return (
    <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${fullMapMode ? 'hidden' : ''}`}>
      {/* Sidebar Toggle Button - 展開時のみ表示 */}
      {!sidebarCollapsed && (
        <button
          className={`sidebar-toggle ${isMobile ? 'mobile-close' : ''}`}
          onClick={toggleSidebar}
          title="閉じる [S]"
        >
          {isMobile ? <X size={28} /> : <Menu size={22} />}
        </button>
      )}

      {/* Collapsed Mini View */}
      {sidebarCollapsed && (
        <div className="sidebar-collapsed-content">
          <button
            className="sidebar-expand-btn"
            onClick={toggleSidebar}
            title="サイドバーを開く [S]"
          >
            <Menu size={20} />
          </button>
          <div className="collapsed-info">
            <div
              className="collapsed-stat clickable"
              title={`エリア: ${polygons.length}件`}
              onClick={() => { setActivePanel('polygons'); toggleSidebar() }}
            >
              <Layers size={14} />
              <span>{polygons.length}</span>
            </div>
            <div
              className="collapsed-stat clickable"
              title={`WP: ${waypoints.length}件`}
              onClick={() => { setActivePanel('waypoints'); toggleSidebar() }}
            >
              <MapIcon size={14} />
              <span>{waypoints.length}</span>
            </div>
            {waypoints.length >= 2 && (
              <div
                className="collapsed-stat small"
                title={`総距離: ${calcTotalDistance(waypoints).toFixed(2)}km`}
              >
                <Route size={12} />
                <span>{calcTotalDistance(waypoints).toFixed(1)}km</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full Sidebar Content */}
      {!sidebarCollapsed && (
        <>
          <div className={`search-section ${!isSearchExpanded ? 'collapsed' : ''}`}>
            <div
              className="search-section-header"
              onClick={() => setIsSearchExpanded(!isSearchExpanded)}
            >
              <div className="search-section-title">
                <Search size={16} />
                <span>住所検索</span>
              </div>
              <ChevronDown
                size={18}
                className={`search-chevron ${isSearchExpanded ? 'expanded' : ''}`}
              />
            </div>
            {isSearchExpanded && (
              <div className="search-section-content">
                <SearchForm
                  onSearch={handleSearch}
                  onSelect={handleSearchSelect}
                  onGeneratePolygon={handleGeneratePolygon}
                />
              </div>
            )}
          </div>

          {/* Map Quick Controls - 地図操作のミニマムコントローラー */}
          <div className={`map-quick-controls ${!isMapQuickControlsExpanded ? 'collapsed' : ''}`}>
            <button
              type="button"
              className="map-quick-controls-header"
              onClick={() => setIsMapQuickControlsExpanded(v => !v)}
              aria-expanded={isMapQuickControlsExpanded}
              aria-controls="map-quick-controls-content"
            >
              <div className="map-quick-controls-title">
                <MapIcon size={14} />
                <span>地図操作</span>
              </div>
              <ChevronDown
                size={16}
                className={`map-quick-controls-chevron ${isMapQuickControlsExpanded ? 'expanded' : ''}`}
              />
            </button>
            {isMapQuickControlsExpanded && (
              <div id="map-quick-controls-content" className="map-quick-controls-content">
                {/* ツールチップセクション */}
                <div className="map-quick-controls-section">
                  <div className="map-quick-controls-section-label">情報表示</div>
                  <label
                    className="map-quick-control-item"
                    data-tooltip="ホバーで施設情報を表示 [T]"
                    data-tooltip-pos="right"
                  >
                    <input
                      type="checkbox"
                      checked={showDIDTooltip}
                      onChange={(e) => setShowDIDTooltip(e.target.checked)}
                    />
                    <span>ツールチップ</span>
                    <kbd>T</kbd>
                  </label>
                  <label
                    className="map-quick-control-item"
                    data-tooltip="オフにするとマウスを離すまで表示し続けます"
                    data-tooltip-pos="right"
                  >
                    <input
                      type="checkbox"
                      checked={didTooltipAutoFade}
                      onChange={(e) => setDidTooltipAutoFade(e.target.checked)}
                      disabled={!showDIDTooltip}
                    />
                    <span>自動で消える</span>
                  </label>
                  <p className="map-quick-controls-desc-note">
                    対象：危険・制限エリア（DID／空港／禁止区域 等）のみ
                  </p>
                </div>

                {/* ビューセクション */}
                <div className="map-quick-controls-section">
                  <div className="map-quick-controls-section-label">ビュー</div>
                  <button
                    type="button"
                    className={`map-quick-control-button ${mapControlsState.is3D ? 'active' : ''}`}
                    onClick={() => mapControlsActionsRef.current.toggle3D()}
                    data-tooltip={mapControlsState.is3D ? '平面表示に切り替え [3]' : '立体表示に切り替え [3]'}
                    data-tooltip-pos="right"
                  >
                    {mapControlsState.is3D ? <Box size={14} /> : <Rotate3D size={14} />}
                    <span>{mapControlsState.is3D ? '3D 表示中' : '3D'}</span>
                    <kbd>3</kbd>
                  </button>
                </div>

                {/* 中心十字セクション */}
                <div className="map-quick-controls-section">
                  <div className="map-quick-controls-section-label">中心十字</div>
                  <label
                    className="map-quick-control-item"
                    data-tooltip="地図中心に十字線を表示 [X]"
                    data-tooltip-pos="right"
                  >
                    <input
                      type="checkbox"
                      checked={mapControlsState.showCrosshair}
                      onChange={(e) => mapControlsActionsRef.current.setShowCrosshair(e.target.checked)}
                    />
                    <span>表示</span>
                    <kbd>X</kbd>
                  </label>
                  {mapControlsState.showCrosshair && (
                    <>
                      <div className="map-quick-controls-row">
                        <select
                          className="map-quick-controls-select"
                          value={mapControlsState.crosshairDesign}
                          onChange={(e) => mapControlsActionsRef.current.setCrosshairDesign(e.target.value)}
                        >
                          {CROSSHAIR_DESIGNS.map(d => (
                            <option key={d.id} value={d.id}>{d.icon} {d.label}</option>
                          ))}
                        </select>
                        <select
                          className="map-quick-controls-select"
                          value={mapControlsState.crosshairColor}
                          onChange={(e) => mapControlsActionsRef.current.setCrosshairColor(e.target.value)}
                        >
                          {CROSSHAIR_COLORS.map(c => (
                            <option key={c.id} value={c.id}>{c.label}</option>
                          ))}
                        </select>
                      </div>
                      <label className="map-quick-control-item">
                        <input
                          type="checkbox"
                          checked={mapControlsState.crosshairClickMode}
                          onChange={(e) => mapControlsActionsRef.current.setCrosshairClickMode(e.target.checked)}
                        />
                        <span>クリックで座標</span>
                      </label>
                      <div className="map-quick-controls-row">
                        <select
                          className="map-quick-controls-select full-width"
                          value={mapControlsState.coordinateFormat}
                          onChange={(e) => mapControlsActionsRef.current.setCoordinateFormat(e.target.value)}
                          disabled={!mapControlsState.crosshairClickMode}
                        >
                          {COORDINATE_FORMATS.map(f => (
                            <option key={f.id} value={f.id}>座標形式: {f.label}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>

                {/* 地図スタイルセクション */}
                <div className="map-quick-controls-section">
                  <div className="map-quick-controls-section-label">
                    <span>地図スタイル</span>
                    <kbd data-tooltip="Mで次へ / Shift+Mで前へ" data-tooltip-pos="top">M</kbd>
                  </div>
                  <div className="map-quick-controls-style-grid">
                    {Object.keys(MAP_STYLES).map(key => {
                      const style = MAP_STYLES[key]
                      const isActive = mapControlsState.mapStyleId === key
                      return (
                        <button
                          key={key}
                          type="button"
                          className={`map-quick-controls-style-btn ${isActive ? 'active' : ''}`}
                          onClick={() => mapControlsActionsRef.current.setMapStyleId(key)}
                          data-tooltip={style.name}
                          data-tooltip-pos="top"
                        >
                          {key === 'gsi_photo' && <Satellite size={12} />}
                          {key !== 'gsi_photo' && <MapIcon size={12} />}
                          <span>{style.shortName}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="panel-tabs">
            <button
              className={`tab ${activePanel === 'polygons' ? 'active' : ''}`}
              onClick={() => setActivePanel('polygons')}
            >
              ポリゴン ({polygons.length})
            </button>
            <button
              className={`tab ${activePanel === 'waypoints' ? 'active' : ''}`}
              onClick={() => setActivePanel('waypoints')}
            >
              Waypoint ({waypoints.length})
            </button>
          </div>

          <div
            className="panel-content"
            ref={panelContentRef}
            style={panelHeight ? { height: panelHeight, flex: 'none' } : undefined}
          >
            <div className="resize-handle" onMouseDown={handleResizeStart} />
            {activePanel === 'polygons' ? (
              <PolygonList
                polygons={polygons}
                selectedPolygonId={selectedPolygonId}
                onSelect={handlePolygonSelect}
                onDelete={handlePolygonDelete}
                onRename={handlePolygonRename}
                onEditShape={handleEditPolygonShape}
                onToggleWaypointLink={handleToggleWaypointLink}
                onGenerateWaypoints={handleGenerateWaypoints}
                onGenerateAllWaypoints={handleGenerateAllWaypoints}
                onLoadExampleData={handleLoadExampleData}
                onResetAll={handleResetAll}
                polygonConflicts={polygonConflicts}
              />
            ) : (
              <WaypointList
                waypoints={waypoints}
                onSelect={handleWaypointSelect}
                onDelete={handleWaypointDelete}
                onUpdate={handleWaypointUpdate}
                onClear={handleWaypointClear}
                onFetchElevation={handleFetchElevation}
                isLoadingElevation={isLoadingElevation}
                elevationProgress={elevationProgress}
                onOpenRouteOptimizer={onOpenRouteOptimizer}
              />
            )}
          </div>
        </>
      )}
    </aside>
  )
}
