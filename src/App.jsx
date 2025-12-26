import { useState, useEffect, useCallback, useRef } from 'react'
import Map from './components/Map/Map'
import SearchForm from './components/SearchForm/SearchForm'
import PolygonList from './components/PolygonList/PolygonList'
import WaypointList from './components/WaypointList/WaypointList'
import FileImport from './components/FileImport/FileImport'
import ExportPanel from './components/ExportPanel/ExportPanel'
import GridSettingsDialog from './components/GridSettingsDialog/GridSettingsDialog'
import HelpModal from './components/HelpModal/HelpModal'
import { loadPolygons, savePolygons, loadWaypoints, saveWaypoints, saveSearchHistory } from './utils/storage'
import { searchAddress } from './services/geocoding'
import { polygonToWaypoints, generateAllWaypoints, getPolygonCenter, generateGridWaypoints, generatePerimeterWaypoints } from './services/waypointGenerator'
import { addElevationToWaypoints } from './services/elevation'
import { createPolygonFromSearchResult } from './services/polygonGenerator'
import './App.scss'

// Default center: Tokyo Tower
const DEFAULT_CENTER = { lat: 35.6585805, lng: 139.7454329 }

function App() {
  // Map state
  const [center, setCenter] = useState(DEFAULT_CENTER)
  const [zoom, setZoom] = useState(12)

  // Data state
  const [polygons, setPolygons] = useState(() => loadPolygons())
  const [waypoints, setWaypoints] = useState(() => loadWaypoints())
  const [selectedPolygonId, setSelectedPolygonId] = useState(null)

  // UI state
  const [drawMode, setDrawMode] = useState(false)
  const [activePanel, setActivePanel] = useState('polygons') // 'polygons' | 'waypoints'
  const [panelHeight, setPanelHeight] = useState(null) // null = auto
  const [showImport, setShowImport] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [showGridSettings, setShowGridSettings] = useState(null) // polygon for grid generation
  const [showHelp, setShowHelp] = useState(false)
  const [notification, setNotification] = useState(null)
  const [editingPolygon, setEditingPolygon] = useState(null)

  // Waypoint settings
  const [gridSpacing, setGridSpacing] = useState(30)
  const [isLoadingElevation, setIsLoadingElevation] = useState(false)
  const [elevationProgress, setElevationProgress] = useState(null)

  // Show notification (defined early for use in undo/redo)
  const showNotification = useCallback((message, type = 'info') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 2500)
  }, [])

  // Undo/Redo history management
  const MAX_HISTORY = 20
  const historyRef = useRef([{ polygons: loadPolygons(), waypoints: loadWaypoints() }])
  const historyIndexRef = useRef(0)
  const isUndoRedoRef = useRef(false)

  // Push current state to history
  const pushToHistory = useCallback(() => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false
      return
    }

    const currentState = { polygons, waypoints }
    const history = historyRef.current
    const index = historyIndexRef.current

    // Remove future states
    const newHistory = history.slice(0, index + 1)
    newHistory.push(currentState)

    // Limit history size
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift()
    } else {
      historyIndexRef.current = newHistory.length - 1
    }

    historyRef.current = newHistory
  }, [polygons, waypoints])

  // Undo function
  const handleUndo = useCallback(() => {
    const index = historyIndexRef.current
    if (index > 0) {
      isUndoRedoRef.current = true
      historyIndexRef.current = index - 1
      const prevState = historyRef.current[index - 1]
      setPolygons(prevState.polygons)
      setWaypoints(prevState.waypoints)
      showNotification('元に戻しました (Undo)')
    }
  }, [])

  // Redo function
  const handleRedo = useCallback(() => {
    const index = historyIndexRef.current
    const history = historyRef.current
    if (index < history.length - 1) {
      isUndoRedoRef.current = true
      historyIndexRef.current = index + 1
      const nextState = history[index + 1]
      setPolygons(nextState.polygons)
      setWaypoints(nextState.waypoints)
      showNotification('やり直しました (Redo)')
    }
  }, [])

  // Keyboard shortcuts for Undo/Redo and Help
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore shortcuts when typing in input fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return
      }

      // Cmd+K (Mac) or Ctrl+K (Win) for Help
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setShowHelp(true)
        return
      }

      // Cmd+Z (Mac) or Ctrl+Z (Win) for Undo
      // Cmd+Shift+Z (Mac) or Ctrl+Shift+Z (Win) for Redo
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          handleRedo()
        } else {
          handleUndo()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo])

  // Auto-save polygons and push to history
  useEffect(() => {
    savePolygons(polygons)
    pushToHistory()
  }, [polygons])

  // Auto-save waypoints and push to history
  useEffect(() => {
    saveWaypoints(waypoints)
    pushToHistory()
  }, [waypoints])

  // Handle search
  const handleSearch = useCallback(async (query) => {
    const results = await searchAddress(query)
    if (results.length > 0) {
      const first = results[0]
      setCenter({ lat: first.lat, lng: first.lng })
      setZoom(15)
      saveSearchHistory(query, results)
      showNotification(`「${first.displayName.split(',')[0]}」に移動しました`)
    } else {
      showNotification('検索結果が見つかりませんでした', 'error')
    }
  }, [showNotification])

  // Handle search select
  const handleSearchSelect = useCallback((result) => {
    setCenter({ lat: result.lat, lng: result.lng })
    setZoom(16)
  }, [])

  // Generate polygon from search result (auto-generation)
  const handleGeneratePolygon = useCallback((searchResult, options = {}) => {
    const { waypointCount = 8 } = options
    const polygon = createPolygonFromSearchResult(searchResult, options)
    setPolygons(prev => [...prev, polygon])

    // Focus on the new polygon
    setCenter({ lat: searchResult.lat, lng: searchResult.lng })
    setZoom(17)
    setSelectedPolygonId(polygon.id)

    showNotification(`「${polygon.name}」エリアを生成しました`)

    // Auto-generate waypoints along perimeter with specified count
    const newWaypoints = generatePerimeterWaypoints(polygon, waypointCount)
    setWaypoints(prev => [...prev, ...newWaypoints])
    showNotification(`${newWaypoints.length} Waypointを自動生成しました`, 'success')
  }, [showNotification])

  // Handle polygon create
  const handlePolygonCreate = useCallback((polygon) => {
    setPolygons(prev => [...prev, polygon])
    setDrawMode(false)
    showNotification('ポリゴンを作成しました')
  }, [showNotification])

  // Handle polygon update
  const handlePolygonUpdate = useCallback((feature) => {
    setPolygons(prev => prev.map(p =>
      p.id === feature.id ? { ...p, geometry: feature.geometry } : p
    ))
  }, [])

  // Handle polygon delete
  const handlePolygonDelete = useCallback((id) => {
    setPolygons(prev => prev.filter(p => p.id !== id))
    setWaypoints(prev => prev.filter(w => w.polygonId !== id))
    if (selectedPolygonId === id) {
      setSelectedPolygonId(null)
    }
    showNotification('ポリゴンを削除しました')
  }, [selectedPolygonId, showNotification])

  // Handle polygon rename
  const handlePolygonRename = useCallback((id, name) => {
    setPolygons(prev => prev.map(p =>
      p.id === id ? { ...p, name } : p
    ))
    // Update waypoint polygon names
    setWaypoints(prev => prev.map(w =>
      w.polygonId === id ? { ...w, polygonName: name } : w
    ))
  }, [])

  // Handle waypoint link toggle
  const handleToggleWaypointLink = useCallback((id) => {
    setPolygons(prev => prev.map(p =>
      p.id === id ? { ...p, waypointLinked: p.waypointLinked === false ? true : false } : p
    ))
  }, [])

  // Handle polygon shape edit start
  const handleEditPolygonShape = useCallback((polygon) => {
    setEditingPolygon(polygon)
    setSelectedPolygonId(polygon.id)
    setDrawMode(false) // Disable draw mode when editing
    const center = getPolygonCenter(polygon)
    if (center) {
      setCenter(center)
      setZoom(17)
    }
    showNotification('ポリゴンを編集中です。頂点をドラッグして変更してください。')
  }, [showNotification])

  // Handle polygon shape edit complete
  const handlePolygonEditComplete = useCallback((updatedFeature) => {
    // Update polygon geometry
    setPolygons(prev => {
      const updated = prev.map(p =>
        p.id === updatedFeature.id ? { ...p, geometry: updatedFeature.geometry } : p
      )

      // Find the updated polygon
      const polygon = updated.find(p => p.id === updatedFeature.id)

      // If waypoint is linked, regenerate waypoints
      if (polygon && polygon.waypointLinked !== false) {
        // Regenerate waypoints for this polygon
        const newWaypoints = polygonToWaypoints({ ...polygon, geometry: updatedFeature.geometry })
        setWaypoints(prevWaypoints => {
          // Remove old waypoints for this polygon and add new ones
          const otherWaypoints = prevWaypoints.filter(w => w.polygonId !== polygon.id)
          // Recalculate indices
          let index = otherWaypoints.length + 1
          const reindexedNew = newWaypoints.map(wp => ({ ...wp, index: index++ }))
          return [...otherWaypoints, ...reindexedNew]
        })
        showNotification(`ポリゴンを更新し、${newWaypoints.length} Waypointを再生成しました`)
      } else {
        showNotification('ポリゴンを更新しました')
      }

      return updated
    })
  }, [showNotification])

  // Handle finish editing
  const handleFinishEditing = useCallback(() => {
    setEditingPolygon(null)
  }, [])

  // Handle polygon select
  const handlePolygonSelect = useCallback((polygon) => {
    setSelectedPolygonId(polygon.id)
    const center = getPolygonCenter(polygon)
    if (center) {
      setCenter(center)
      setZoom(16)
    }
  }, [])

  // Generate waypoints from single polygon
  const handleGenerateWaypoints = useCallback((polygon, options = {}) => {
    const { includeGrid = false } = options

    // If grid is requested, show settings dialog
    if (includeGrid) {
      setShowGridSettings(polygon)
      return
    }

    // Vertex-only generation
    const newWaypoints = polygonToWaypoints(polygon)

    // Remove existing waypoints for this polygon
    setWaypoints(prev => [
      ...prev.filter(w => w.polygonId !== polygon.id),
      ...newWaypoints
    ])
    showNotification(`${newWaypoints.length} Waypointを生成しました`)
    setActivePanel('waypoints')
  }, [showNotification])

  // Handle grid settings confirm
  const handleGridSettingsConfirm = useCallback((settings) => {
    const polygon = showGridSettings
    if (!polygon) return

    const { spacing, includeVertices } = settings

    let newWaypoints = []
    let globalIndex = 1

    // Add vertex waypoints if requested
    if (includeVertices) {
      const vertexWaypoints = polygonToWaypoints(polygon)
      vertexWaypoints.forEach(wp => {
        wp.index = globalIndex++
        newWaypoints.push(wp)
      })
    }

    // Add grid waypoints
    const gridWaypoints = generateGridWaypoints(polygon, spacing)
    gridWaypoints.forEach(wp => {
      wp.index = globalIndex++
      newWaypoints.push(wp)
    })

    // Remove existing waypoints for this polygon and add new ones
    setWaypoints(prev => [
      ...prev.filter(w => w.polygonId !== polygon.id),
      ...newWaypoints
    ])

    setShowGridSettings(null)
    showNotification(`${newWaypoints.length} Waypointを生成しました（${spacing}m間隔）`)
    setActivePanel('waypoints')
  }, [showGridSettings, showNotification])

  // Generate waypoints from all polygons
  const handleGenerateAllWaypoints = useCallback(() => {
    if (polygons.length === 0) return
    const newWaypoints = generateAllWaypoints(polygons)
    setWaypoints(newWaypoints)
    showNotification(`${newWaypoints.length} Waypointを生成しました`)
    setActivePanel('waypoints')
  }, [polygons, showNotification])

  // Handle waypoint select
  const handleWaypointSelect = useCallback((waypoint) => {
    setCenter({ lat: waypoint.lat, lng: waypoint.lng })
    setZoom(18)
  }, [])

  // Handle waypoint delete
  const handleWaypointDelete = useCallback((id) => {
    setWaypoints(prev => prev.filter(w => w.id !== id))
    showNotification('Waypointを削除しました')
  }, [showNotification])

  // Handle waypoint move (drag)
  const handleWaypointMove = useCallback((id, newPosition) => {
    setWaypoints(prev => prev.map(w =>
      w.id === id ? { ...w, lat: newPosition.lat, lng: newPosition.lng } : w
    ))
  }, [])

  // Handle waypoint update (edit name, coords, etc.)
  const handleWaypointUpdate = useCallback((id, updateData) => {
    setWaypoints(prev => prev.map(w =>
      w.id === id ? { ...w, ...updateData } : w
    ))
    showNotification('Waypointを更新しました')
  }, [showNotification])

  // Handle polygon select from map
  const handlePolygonSelectFromMap = useCallback((polygonId) => {
    setSelectedPolygonId(polygonId)
    const polygon = polygons.find(p => p.id === polygonId)
    if (polygon) {
      const coords = polygon.geometry.coordinates[0]
      // Calculate center of polygon
      const lats = coords.map(c => c[1])
      const lngs = coords.map(c => c[0])
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2
      const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2
      setCenter({ lat: centerLat, lng: centerLng })
      setZoom(17)
    }
  }, [polygons])

  // Handle waypoint clear
  const handleWaypointClear = useCallback(() => {
    setWaypoints([])
    showNotification('すべてのWaypointを削除しました')
  }, [showNotification])

  // Handle elevation fetch
  const handleFetchElevation = useCallback(async () => {
    if (waypoints.length === 0) return

    setIsLoadingElevation(true)
    setElevationProgress({ current: 0, total: waypoints.length })

    try {
      const waypointsWithElevation = await addElevationToWaypoints(
        waypoints,
        (current, total) => setElevationProgress({ current, total })
      )
      setWaypoints(waypointsWithElevation)
      showNotification(`${waypoints.length} 地点の標高を取得しました`)
    } catch (error) {
      console.error('Elevation fetch error:', error)
      showNotification('標高取得中にエラーが発生しました', 'error')
    } finally {
      setIsLoadingElevation(false)
      setElevationProgress(null)
    }
  }, [waypoints, showNotification])

  // Handle grid regeneration with new spacing
  const handleRegenerateGrid = useCallback(() => {
    // Find polygons that have grid waypoints
    const polygonIds = [...new Set(
      waypoints.filter(wp => wp.type === 'grid').map(wp => wp.polygonId)
    )]

    if (polygonIds.length === 0) return

    let newWaypoints = waypoints.filter(wp => wp.type !== 'grid')
    let globalIndex = newWaypoints.length + 1

    polygonIds.forEach(polygonId => {
      const polygon = polygons.find(p => p.id === polygonId)
      if (polygon) {
        const gridWaypoints = generateGridWaypoints(polygon, gridSpacing)
        gridWaypoints.forEach(wp => {
          wp.index = globalIndex++
          newWaypoints.push(wp)
        })
      }
    })

    setWaypoints(newWaypoints)
    showNotification(`グリッドを ${gridSpacing}m 間隔で再生成しました`)
  }, [waypoints, polygons, gridSpacing, showNotification])

  // Handle file import
  const handleImport = useCallback((importedPolygons) => {
    setPolygons(prev => [...prev, ...importedPolygons])
    showNotification(`${importedPolygons.length} ポリゴンをインポートしました`)
  }, [showNotification])

  // Handle map click (add manual waypoint)
  const handleMapClick = useCallback((latlng) => {
    if (!drawMode) {
      // Add manual waypoint
      const newWaypoint = {
        id: crypto.randomUUID(),
        lat: latlng.lat,
        lng: latlng.lng,
        index: waypoints.length + 1,
        polygonId: null,
        polygonName: '手動追加',
        type: 'manual'
      }
      setWaypoints(prev => [...prev, newWaypoint])
      showNotification('Waypointを追加しました')
    }
  }, [drawMode, waypoints.length, showNotification])

  // Mobile detection
  const isMobile = () => window.innerWidth <= 768

  // Panel resize handlers
  const panelContentRef = useRef(null)
  const isResizingRef = useRef(false)

  const handleResizeStart = useCallback((e) => {
    e.preventDefault()
    isResizingRef.current = true
    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'

    const startY = e.clientY
    const startHeight = panelContentRef.current?.offsetHeight || 200

    const handleMouseMove = (moveEvent) => {
      if (!isResizingRef.current) return
      const deltaY = moveEvent.clientY - startY
      const newHeight = Math.max(100, Math.min(600, startHeight + deltaY))
      setPanelHeight(newHeight)
    }

    const handleMouseUp = () => {
      isResizingRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [])

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <h1 className="app-title">Drone Waypoint</h1>
        <div className="header-actions">
          {editingPolygon ? (
            <button
              className="mode-toggle active"
              onClick={handleFinishEditing}
            >
              編集完了
            </button>
          ) : (
            <button
              className={`mode-toggle ${drawMode ? 'active' : ''}`}
              onClick={() => setDrawMode(!drawMode)}
            >
              {drawMode ? '描画中' : '描画モード'}
            </button>
          )}
          <button
            className="action-button"
            onClick={() => setShowImport(true)}
            disabled={!!editingPolygon}
          >
            インポート
          </button>
          <button
            className="action-button"
            onClick={() => setShowExport(true)}
            disabled={!!editingPolygon}
          >
            エクスポート
          </button>
          <button
            className="help-button"
            onClick={() => setShowHelp(true)}
            data-tooltip="ヘルプ (⌘K)"
            data-tooltip-pos="left"
          >
            ?
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="app-main">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="search-section">
            <SearchForm
              onSearch={handleSearch}
              onSelect={handleSearchSelect}
              onGeneratePolygon={handleGeneratePolygon}
            />
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
                onRegenerateGrid={handleRegenerateGrid}
                gridSpacing={gridSpacing}
                onGridSpacingChange={setGridSpacing}
                isLoadingElevation={isLoadingElevation}
                elevationProgress={elevationProgress}
              />
            )}
          </div>
        </aside>

        {/* Map */}
        <div className="map-section">
          <Map
            center={center}
            zoom={zoom}
            polygons={polygons}
            waypoints={waypoints}
            onPolygonCreate={handlePolygonCreate}
            onPolygonUpdate={handlePolygonUpdate}
            onPolygonDelete={handlePolygonDelete}
            onPolygonSelect={handlePolygonSelectFromMap}
            onPolygonEditComplete={handlePolygonEditComplete}
            onMapClick={handleMapClick}
            onWaypointClick={handleWaypointSelect}
            onWaypointDelete={handleWaypointDelete}
            onWaypointMove={handleWaypointMove}
            selectedPolygonId={selectedPolygonId}
            editingPolygon={editingPolygon}
            drawMode={drawMode}
          />

          {/* Draw mode hint */}
          {drawMode && (
            <div className="draw-hint">
              地図をクリックしてポリゴンを描画
              <br />
              最後の点をダブルクリックで完了
            </div>
          )}

          {/* Edit mode hint */}
          {editingPolygon && (
            <div className="draw-hint editing">
              「{editingPolygon.name}」を編集中
              <br />
              頂点をドラッグして変更 / 中点クリックで頂点追加
            </div>
          )}
        </div>
      </main>

      {/* Import Modal */}
      {showImport && (
        <div className="modal-overlay" onClick={() => setShowImport(false)}>
          <div onClick={e => e.stopPropagation()}>
            <FileImport
              onImport={handleImport}
              onClose={() => setShowImport(false)}
            />
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExport && (
        <div className="modal-overlay" onClick={() => setShowExport(false)}>
          <div onClick={e => e.stopPropagation()}>
            <ExportPanel
              waypoints={waypoints}
              polygons={polygons}
              onClose={() => setShowExport(false)}
            />
          </div>
        </div>
      )}

      {/* Grid Settings Modal */}
      {showGridSettings && (
        <div className="modal-overlay" onClick={() => setShowGridSettings(null)}>
          <div onClick={e => e.stopPropagation()}>
            <GridSettingsDialog
              polygon={showGridSettings}
              onConfirm={handleGridSettingsConfirm}
              onCancel={() => setShowGridSettings(null)}
            />
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="modal-overlay" onClick={() => setShowHelp(false)}>
          <div onClick={e => e.stopPropagation()}>
            <HelpModal onClose={() => setShowHelp(false)} />
          </div>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}
    </div>
  )
}

export default App
