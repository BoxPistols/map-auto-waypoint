import { ChevronDown, Search, Map as MapIcon, Layers, Menu, Route, X } from 'lucide-react'
import SearchForm from '../../SearchForm/SearchForm'
import PolygonList from '../../PolygonList/PolygonList'
import WaypointList from '../../WaypointList/WaypointList'
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
  // ポリゴン
  selectedPolygonId,
  handlePolygonSelect,
  handlePolygonDelete,
  handlePolygonRename,
  handleEditPolygonShape,
  handleToggleWaypointLink,
  handleGenerateWaypoints,
  handleGenerateAllWaypoints,
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
