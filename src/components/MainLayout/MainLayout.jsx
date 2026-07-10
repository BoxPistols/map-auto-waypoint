import { useState } from 'react'
import MapComponent from '../Map/Map'
import { isFirstVisit } from '../../utils/storage'
import FlightAssistant from '../FlightAssistant'
import ApiSettings from '../ApiSettings'
import FlightRequirements from '../FlightRequirements'
import FlightPlanner from '../FlightPlanner'
import RouteOptimizer from '../RouteOptimizer'
import { WeatherForecastPanel } from '../WeatherForecast'
import { DroneOperationDashboard } from '../drone'
import { useDroneData } from '../../hooks/useDroneData'
import { useNotification } from '../../hooks/useNotification'
import { useTheme } from '../../hooks/useTheme'
import { useCustomLayers } from '../../hooks/useCustomLayers'
import { useConfirmDialog } from '../../hooks/useConfirmDialog'
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog'
import { reindexWaypoints } from '../../services/waypointGenerator'
import { getWaypointNumberingMode } from '../../services/settingsService'
import '../../App.scss'

// 分離した hooks
import { useDIDPreload } from './hooks/useDIDPreload'
import { useCollisionDetection } from './hooks/useCollisionDetection'
import { useMobileDetection } from './hooks/useMobileDetection'
import { usePanelResize } from './hooks/usePanelResize'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useSearchHandling } from './hooks/useSearchHandling'
import { usePolygonOperations } from './hooks/usePolygonOperations'
import { useWaypointOperations } from './hooks/useWaypointOperations'
import { useFlightAssistantHandlers } from './hooks/useFlightAssistantHandlers'
import { useUndoRedoNotify } from './hooks/useUndoRedoNotify'
import { useMapInteractions } from './hooks/useMapInteractions'

// 分離したコンポーネント
import AppHeader from './components/AppHeader'
import AppSidebar from './components/AppSidebar'
import MobileMapControls from './components/MobileMapControls'
import NotificationBanner from './components/NotificationBanner'
import DrawHints from './components/DrawHints'
import AppModals from './components/AppModals'
import { DEFAULT_CENTER } from './utils/constants'

function MainLayout() {
  // ============================================
  // グローバル hooks
  // ============================================
  const {
    polygons, setPolygons,
    waypoints, setWaypoints,
    selectedPolygonId, setSelectedPolygonId,
    undo, redo, canUndo, canRedo
  } = useDroneData()

  const { notification, showNotification, hideNotification } = useNotification()
  const { theme, toggleTheme, THEMES } = useTheme()
  const { dialogState, showConfirm, handleConfirm, handleCancel } = useConfirmDialog()

  // ============================================
  // Map state
  // ============================================
  const [center, setCenter] = useState(DEFAULT_CENTER)
  const [zoom, setZoom] = useState(12)
  // Japan overview toggle state (Issue #52)
  const [savedViewState, setSavedViewState] = useState(null)

  // ============================================
  // UI state
  // ============================================
  const [drawMode, setDrawMode] = useState(false)
  const [activePanel, setActivePanel] = useState('polygons') // 'polygons' | 'waypoints'
  const [isSearchExpanded, setIsSearchExpanded] = useState(true)
  const [showImport, setShowImport] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [showHelp, setShowHelp] = useState(isFirstVisit())
  const [showApiSettings, setShowApiSettings] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showFlightRequirements, setShowFlightRequirements] = useState(false)
  const [showFlightPlanner, setShowFlightPlanner] = useState(false)
  const [showRouteOptimizer, setShowRouteOptimizer] = useState(false)
  const [showWeatherForecast, setShowWeatherForecast] = useState(false)
  const [showDroneDashboard, setShowDroneDashboard] = useState(false)
  // eslint-disable-next-line no-unused-vars
  const [selectedDashboardPoint, setSelectedDashboardPoint] = useState(null)
  const [lastSearchResult, setLastSearchResult] = useState(null)

  // 推奨/ハイライト関連 (FlightAssistant連携)
  const [recommendedWaypoints, setRecommendedWaypoints] = useState(null)
  const [highlightedWaypointIndex, setHighlightedWaypointIndex] = useState(null)

  // ============================================
  // Custom Layers
  // ============================================
  const {
    customLayers,
    visibleCustomLayerIds,
    handleCustomLayerAdded,
    handleCustomLayerRemoved,
    handleCustomLayerToggle
  } = useCustomLayers()

  // ============================================
  // モバイル検出 & サイドバー
  // ============================================
  const {
    isMobile,
    sidebarCollapsed,
    setSidebarCollapsed,
    toggleSidebar,
    fullMapMode,
    setFullMapMode,
    toggleFullMapMode,
  } = useMobileDetection({ onEnterFullMapMode: () => setShowChat(false) })

  // ============================================
  // パネルリサイズ
  // ============================================
  const { panelContentRef, panelHeight, handleResizeStart } = usePanelResize()

  // ============================================
  // DIDデータプリロード (waypoints変更時)
  // ============================================
  const didDataReady = useDIDPreload(waypoints)

  // ============================================
  // 衝突検出 (RBush + DID + ポリゴン重複)
  // ============================================
  const {
    waypointIssueFlagsById,
    setWaypointIssueFlagsById,
    didHighlightedWaypointIndices,
    setDidHighlightedWaypointIndices,
    pathCollisionResult,
    polygonCollisionResult,
  } = useCollisionDetection({ waypoints, polygons, didDataReady })

  // ============================================
  // Undo/Redo (with toast)
  // ============================================
  const { handleUndo, handleRedo } = useUndoRedoNotify({ undo, redo, showNotification })

  // ============================================
  // 検索処理
  // ============================================
  const { handleSearch, handleSearchSelect, handleGeneratePolygon } = useSearchHandling({
    setCenter,
    setZoom,
    setLastSearchResult,
    setShowFlightRequirements,
    setPolygons,
    setWaypoints,
    setShowRouteOptimizer,
    showNotification,
  })

  // ============================================
  // ポリゴン操作
  // ============================================
  const {
    editingPolygon,
    setEditingPolygon,
    showGridSettings,
    setShowGridSettings,
    handlePolygonCreate,
    handlePolygonUpdate,
    handlePolygonDelete,
    handlePolygonRename,
    handleToggleWaypointLink,
    handleEditPolygonShape,
    handlePolygonEditComplete,
    handleFinishEditing,
    handlePolygonSelect,
    handlePolygonSelectFromMap,
    handleGenerateWaypoints,
    handleGridSettingsConfirm,
    handleGenerateAllWaypoints,
  } = usePolygonOperations({
    polygons,
    setPolygons,
    waypoints,
    setWaypoints,
    selectedPolygonId,
    setSelectedPolygonId,
    setDrawMode,
    setCenter,
    setZoom,
    setLastSearchResult,
    setShowFlightRequirements,
    setActivePanel,
    setShowRouteOptimizer,
    showNotification,
    showConfirm,
  })

  // ============================================
  // Waypoint 操作
  // ============================================
  const {
    isLoadingElevation,
    elevationProgress,
    optimizedRoute,
    handleFetchElevation,
    handleApplyOptimizedRoute,
    handleHomePointMove,
    handleWaypointSelect,
    handleWaypointClickOnMap,
    handleWaypointDelete,
    handleWaypointsBulkDelete,
    handleWaypointMove,
    handleWaypointUpdate,
    handleWaypointClear,
  } = useWaypointOperations({
    polygons,
    setPolygons,
    waypoints,
    setWaypoints,
    setSelectedPolygonId,
    setEditingPolygon,
    setDrawMode,
    setCenter,
    setZoom,
    showNotification,
  })

  // ============================================
  // マップクリック / Import
  // ============================================
  const { handleMapClick, handleImport } = useMapInteractions({
    drawMode,
    setWaypoints,
    setPolygons,
    showNotification,
  })

  // ============================================
  // FlightAssistant ハンドラ
  // ============================================
  const { onOptimizationUpdate, onApplyPlan, onWaypointSelect } = useFlightAssistantHandlers({
    waypoints,
    setWaypoints,
    setPolygons,
    setDidHighlightedWaypointIndices,
    setWaypointIssueFlagsById,
    setRecommendedWaypoints,
    setCenter,
    setZoom,
    setHighlightedWaypointIndex,
    showNotification,
  })

  // ============================================
  // キーボードショートカット
  // ============================================
  useKeyboardShortcuts({
    handleUndo,
    handleRedo,
    sidebarCollapsed,
    setSidebarCollapsed,
    setActivePanel,
    setShowChat,
    setShowFlightRequirements,
    setShowWeatherForecast,
    setFullMapMode,
    setShowApiSettings,
    setShowHelp,
    setIsSearchExpanded,
    toggleTheme,
    editingPolygon,
    setEditingPolygon,
    showNotification,
    selectedPolygonId,
    polygons,
    handleEditPolygonShape,
    savedViewState,
    setSavedViewState,
    center,
    zoom,
    setCenter,
    setZoom,
  })

  return (
    <div className={`app ${fullMapMode ? 'full-map-mode' : ''} ${isMobile ? 'is-mobile' : ''}`}>
      {/* Header */}
      <AppHeader
        fullMapMode={fullMapMode}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        editingPolygon={editingPolygon}
        drawMode={drawMode}
        setDrawMode={setDrawMode}
        onFinishEditing={handleFinishEditing}
        onOpenImport={() => setShowImport(true)}
        onOpenExport={() => setShowExport(true)}
        theme={theme}
        THEMES={THEMES}
        toggleTheme={toggleTheme}
        onOpenApiSettings={() => setShowApiSettings(true)}
        onOpenHelp={() => setShowHelp(true)}
      />

      {/* Main content */}
      <main className="app-main">
        {/* Sidebar */}
        <AppSidebar
          sidebarCollapsed={sidebarCollapsed}
          fullMapMode={fullMapMode}
          isMobile={isMobile}
          toggleSidebar={toggleSidebar}
          polygons={polygons}
          waypoints={waypoints}
          activePanel={activePanel}
          setActivePanel={setActivePanel}
          isSearchExpanded={isSearchExpanded}
          setIsSearchExpanded={setIsSearchExpanded}
          panelContentRef={panelContentRef}
          panelHeight={panelHeight}
          handleResizeStart={handleResizeStart}
          handleSearch={handleSearch}
          handleSearchSelect={handleSearchSelect}
          handleGeneratePolygon={handleGeneratePolygon}
          selectedPolygonId={selectedPolygonId}
          handlePolygonSelect={handlePolygonSelect}
          handlePolygonDelete={handlePolygonDelete}
          handlePolygonRename={handlePolygonRename}
          handleEditPolygonShape={handleEditPolygonShape}
          handleToggleWaypointLink={handleToggleWaypointLink}
          handleGenerateWaypoints={handleGenerateWaypoints}
          handleGenerateAllWaypoints={handleGenerateAllWaypoints}
          handleWaypointSelect={handleWaypointSelect}
          handleWaypointDelete={handleWaypointDelete}
          handleWaypointUpdate={handleWaypointUpdate}
          handleWaypointClear={handleWaypointClear}
          handleFetchElevation={handleFetchElevation}
          isLoadingElevation={isLoadingElevation}
          elevationProgress={elevationProgress}
          onOpenRouteOptimizer={() => setShowRouteOptimizer(true)}
        />

        {/* Map */}
        <div className="map-section">
          <MapComponent
            center={center}
            zoom={zoom}
            polygons={polygons}
            waypoints={waypoints}
            customLayers={customLayers}
            visibleCustomLayerIds={visibleCustomLayerIds}
            recommendedWaypoints={recommendedWaypoints}
            didHighlightedWaypointIndices={didHighlightedWaypointIndices}
            waypointIssueFlagsById={waypointIssueFlagsById}
            pathCollisionResult={pathCollisionResult}
            polygonCollisionResult={polygonCollisionResult}
            highlightedWaypointIndex={highlightedWaypointIndex}
            optimizedRoute={optimizedRoute}
            onHomePointMove={handleHomePointMove}
            isMobile={isMobile}
            isChatOpen={showChat}
            onPolygonCreate={handlePolygonCreate}
            onPolygonUpdate={handlePolygonUpdate}
            onPolygonDelete={handlePolygonDelete}
            onPolygonSelect={handlePolygonSelectFromMap}
            onPolygonEditStart={handleEditPolygonShape}
            onPolygonEditComplete={handlePolygonEditComplete}
            onEditFinish={handleFinishEditing}
            onMapClick={handleMapClick}
            onWaypointClick={handleWaypointClickOnMap}
            onWaypointDelete={handleWaypointDelete}
            onWaypointMove={handleWaypointMove}
            onWaypointsBulkDelete={handleWaypointsBulkDelete}
            onCustomLayerAdded={handleCustomLayerAdded}
            onCustomLayerRemoved={handleCustomLayerRemoved}
            onCustomLayerToggle={handleCustomLayerToggle}
            selectedPolygonId={selectedPolygonId}
            editingPolygon={editingPolygon}
            drawMode={drawMode}
          />

          <DrawHints drawMode={drawMode} editingPolygon={editingPolygon} />

          <MobileMapControls
            isMobile={isMobile}
            sidebarCollapsed={sidebarCollapsed}
            fullMapMode={fullMapMode}
            toggleFullMapMode={toggleFullMapMode}
            polygons={polygons}
            waypoints={waypoints}
            setActivePanel={setActivePanel}
            setSidebarCollapsed={setSidebarCollapsed}
            onOpenExport={() => setShowExport(true)}
          />
        </div>
      </main>

      {/* Modal群 (Import / Export / Grid設定 / Help) */}
      <AppModals
        showImport={showImport}
        setShowImport={setShowImport}
        handleImport={handleImport}
        showExport={showExport}
        setShowExport={setShowExport}
        waypoints={waypoints}
        polygons={polygons}
        showGridSettings={showGridSettings}
        setShowGridSettings={setShowGridSettings}
        handleGridSettingsConfirm={handleGridSettingsConfirm}
        showHelp={showHelp}
        setShowHelp={setShowHelp}
      />

      {/* API Settings Modal */}
      <ApiSettings
        isOpen={showApiSettings}
        onClose={() => setShowApiSettings(false)}
      />

      {/* Flight Requirements Panel (法的要件サマリー) */}
      <FlightRequirements
        polygon={selectedPolygonId ? polygons.find(p => p.id === selectedPolygonId) : (polygons.length > 0 ? polygons[0] : null)}
        altitude={50}
        searchResult={lastSearchResult}
        isOpen={showFlightRequirements}
        onClose={() => setShowFlightRequirements(false)}
        sidebarCollapsed={sidebarCollapsed}
      />

      {/* Weather Forecast Panel (天気予報) */}
      <WeatherForecastPanel
        isOpen={showWeatherForecast}
        onClose={() => setShowWeatherForecast(false)}
        center={center}
        sidebarCollapsed={sidebarCollapsed}
      />

      {/* Safety Checker (飛行安全性チェッカー) */}
      {showDroneDashboard && (
        <DroneOperationDashboard
          selectedPoint={selectedDashboardPoint}
          onClose={() => setShowDroneDashboard(false)}
          darkMode={theme === THEMES.DARK}
        />
      )}

      {/* Flight Planner (目的ベースOOUI) */}
      <FlightPlanner
        isOpen={showFlightPlanner}
        onClose={() => setShowFlightPlanner(false)}
        polygons={polygons}
        searchResult={lastSearchResult}
        onApplyRoute={(plan) => {
          if (plan.waypoints && plan.waypoints.length > 0) {
            setWaypoints(prev => reindexWaypoints([...prev, ...plan.waypoints], { mode: getWaypointNumberingMode() }))
            showNotification(`${plan.waypoints.length}個のWaypointを追加しました`, 'success')
          }
        }}
      />

      {/* Route Optimizer (最適巡回ルートプランナー) */}
      <RouteOptimizer
        isOpen={showRouteOptimizer}
        onClose={() => setShowRouteOptimizer(false)}
        waypoints={waypoints}
        onApplyRoute={handleApplyOptimizedRoute}
      />

      {/* Flight Assistant (AI) */}
      <FlightAssistant
        polygons={polygons}
        waypoints={waypoints}
        isOpen={showChat}
        onOpenChange={setShowChat}
        onOptimizationUpdate={onOptimizationUpdate}
        onApplyPlan={onApplyPlan}
        onWaypointSelect={onWaypointSelect}
      />

      {/* Notification */}
      <NotificationBanner notification={notification} hideNotification={hideNotification} />

      <ConfirmDialog
        isOpen={dialogState.isOpen}
        title={dialogState.title}
        message={dialogState.message}
        confirmText={dialogState.confirmText}
        cancelText={dialogState.cancelText}
        variant={dialogState.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  )
}

export default MainLayout
