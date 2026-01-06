import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronDown, Search, Undo2, Redo2, Map as MapIcon, Layers, Settings, Sun, Moon, Menu, Route, Maximize2, Minimize2, X, Download } from 'lucide-react'
import { getTheme, toggleTheme, THEMES } from './services/themeService'
import { getSetting, isDIDAvoidanceModeEnabled } from './services/settingsService'
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
import { createPolygonFromSearchResult } from './services/polygonGenerator'
import { addElevationToWaypoints } from './services/elevation'
import FlightAssistant from './components/FlightAssistant'
import ApiSettings from './components/ApiSettings'
import FlightRequirements from './components/FlightRequirements'
import FlightPlanner from './components/FlightPlanner'
import RouteOptimizer from './components/RouteOptimizer'
import './App.scss'

// Default center: Tokyo Tower
const DEFAULT_CENTER = { lat: 35.6585805, lng: 139.7454329 }

// WP間の総距離を計算 (km)
const calcTotalDistance = (wps) => {
  if (!wps || wps.length < 2) return 0
  let total = 0
  for (let i = 1; i < wps.length; i++) {
    const p1 = wps[i - 1]
    const p2 = wps[i]
    const R = 6371 // km
    const dLat = (p2.lat - p1.lat) * Math.PI / 180
    const dLon = (p2.lng - p1.lng) * Math.PI / 180
    const a = Math.sin(dLat/2) ** 2 + Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) * Math.sin(dLon/2) ** 2
    total += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }
  return total
}

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
  const [isSearchExpanded, setIsSearchExpanded] = useState(true)
  // Mobile detection
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768)
  const [fullMapMode, setFullMapMode] = useState(false)

  // Auto-collapse sidebar on mobile
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed')
    // Default to collapsed on mobile
    if (window.innerWidth <= 768) return true
    return saved === 'true'
  })
  const [showImport, setShowImport] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [showGridSettings, setShowGridSettings] = useState(null) // polygon for grid generation
  const [showHelp, setShowHelp] = useState(false)
  const [showApiSettings, setShowApiSettings] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showFlightRequirements, setShowFlightRequirements] = useState(false)
  const [showFlightPlanner, setShowFlightPlanner] = useState(false)
  const [showRouteOptimizer, setShowRouteOptimizer] = useState(false)
  const [optimizedRoute, setOptimizedRoute] = useState(null)
  const [lastSearchResult, setLastSearchResult] = useState(null)
  const [notification, setNotification] = useState(null)
  const [theme, setThemeState] = useState(() => getTheme())

  // テーマ切り替え
  const handleToggleTheme = () => {
    const newTheme = toggleTheme()
    setThemeState(newTheme)
  }
  const [editingPolygon, setEditingPolygon] = useState(null)

  // Waypoint settings
  const [gridSpacing, setGridSpacing] = useState(30)
  const [isLoadingElevation, setIsLoadingElevation] = useState(false)
  const [elevationProgress, setElevationProgress] = useState(null)

  // Optimization overlay state
  const [recommendedWaypoints, setRecommendedWaypoints] = useState(null)
  // DID warning highlight (indices) - shown even when recommended overlay is suppressed
  const [didHighlightedWaypointIndices, setDidHighlightedWaypointIndices] = useState(() => new Set())
  // Per-waypoint issue flags (airport/prohibited/did) for marker highlighting (recommendedWaypointsと独立)
  const [waypointIssueFlagsById, setWaypointIssueFlagsById] = useState(() => ({}))

  // Highlighted waypoint (for FlightAssistant WP click)
  const [highlightedWaypointIndex, setHighlightedWaypointIndex] = useState(null)

  // Toggle sidebar collapsed state
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      const newValue = !prev
      localStorage.setItem('sidebarCollapsed', String(newValue))
      return newValue
    })
  }, [])

  // Show notification (defined early for use in undo/redo)
  // action: { label: string, onClick: () => void } for actionable notifications
  // persistent: true for notifications that should stay until manually dismissed
  const showNotification = useCallback((message, type = 'info', action = null, persistent = false) => {
    setNotification({ message, type, action, persistent })
    // Don't auto-dismiss persistent notifications (actionable ones)
    if (!persistent && !action) {
      setTimeout(() => setNotification(null), 2500)
    }
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
      saveSearchHistory(query, results)
      setCenter({ lat: first.lat, lng: first.lng })
      setZoom(16)
      showNotification(`「${first.displayName.split(',')[0]}」を表示しました`)
    } else {
      showNotification('検索結果が見つかりませんでした', 'warning')
    }
  }, [showNotification])

  // Handle search select
  const handleSearchSelect = useCallback((result) => {
    if (!result) return
    setCenter({ lat: result.lat, lng: result.lng })
    setZoom(16)
    setLastSearchResult(result)
    setShowFlightRequirements(true)
    showNotification(`「${result.displayName.split(',')[0]}」を表示しました`)
  }, [showNotification])

  // Generate polygon from search result
  const handleGeneratePolygon = useCallback((searchResult, options = {}) => {
    if (!searchResult) return
    const { waypointCount = 8 } = options
    const polygon = createPolygonFromSearchResult(searchResult, options)
    setPolygons(prev => [...prev, polygon])

    // Use generatePerimeterWaypoints to distribute waypoints evenly along the perimeter
    const newWaypoints = generatePerimeterWaypoints(polygon, waypointCount)
    setWaypoints(prev => [...prev, ...newWaypoints])

    const center = getPolygonCenter(polygon.geometry)
    if (center) {
      setCenter(center)
      setZoom(16)
    }

    // Show notification with route optimization action
    if (newWaypoints.length >= 2) {
      showNotification(
        `ポリゴンとWaypoint(${newWaypoints.length}個)を生成しました`,
        'info',
        {
          label: 'ルートを最適化',
          onClick: () => setShowRouteOptimizer(true),
        }
      )
    } else {
      showNotification(`ポリゴンとWaypoint(${newWaypoints.length}個)を生成しました`)
    }
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
      showNotification('標高データを取得しました')
    } catch (error) {
      console.error('Elevation fetch error:', error)
      showNotification('標高取得に失敗しました', 'error')
    } finally {
      setIsLoadingElevation(false)
      setElevationProgress(null)
    }
  }, [waypoints, showNotification])

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

  // Keyboard shortcuts for Undo/Redo, Help, and Panel switching
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore shortcuts when typing in input fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return
      }

      // Cmd+Shift+K (Mac) or Ctrl+Shift+K (Win) for Settings modal
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setShowApiSettings(prev => !prev)
        return
      }

      // Cmd+Shift+D (Mac) or Ctrl+Shift+D (Win) for Theme toggle
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        handleToggleTheme()
        return
      }

      // Cmd+/ (Mac) or Ctrl+/ (Win) for Help
      // Also support ? key (Shift+/ on most keyboards)
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        setShowHelp(prev => !prev)
        return
      }

      // ? key alone for Help (works on all keyboard layouts)
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        setShowHelp(prev => !prev)
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
        return
      }

      // Single key shortcuts (no modifier keys)
      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case 's': // Toggle sidebar
            e.preventDefault()
            setSidebarCollapsed(prev => {
              const newValue = !prev
              localStorage.setItem('sidebarCollapsed', String(newValue))
              return newValue
            })
            break
          case 'p': // Switch to Polygon panel
            e.preventDefault()
            setActivePanel('polygons')
            if (sidebarCollapsed) setSidebarCollapsed(false)
            break
          case 'w': // Switch to Waypoint panel
            e.preventDefault()
            setActivePanel('waypoints')
            if (sidebarCollapsed) setSidebarCollapsed(false)
            break
          case 'c': // Toggle Chat (Flight Assistant)
            e.preventDefault()
            setShowChat(prev => !prev)
            break
          case 'l': // Toggle Flight Requirements (法的要件サマリー)
            e.preventDefault()
            setShowFlightRequirements(prev => !prev)
            break
          case 'f': // Toggle Full Map Mode
            e.preventDefault()
            setFullMapMode(prev => {
              if (!prev) {
                setSidebarCollapsed(true)
                setShowChat(false)
              }
              return !prev
            })
            break
          case 'v': // Edit polygon shape
            e.preventDefault()
            if (selectedPolygonId) {
              const polygon = polygons.find(p => p.id === selectedPolygonId)
              if (polygon) {
                handleEditPolygonShape(polygon)
              }
            }
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo, sidebarCollapsed, selectedPolygonId, polygons, handleEditPolygonShape, handleToggleTheme])

  // Handle polygon shape edit complete
  const handlePolygonEditComplete = useCallback((updatedFeature) => {
    // Update polygon geometry
    setPolygons(prev => {
      const updated = prev.map(p =>
        p.id === updatedFeature.id ? { ...p, geometry: updatedFeature.geometry } : p
      )

      // Find the updated polygon
      const polygon = updated.find(p => p.id === updatedFeature.id)

      // If waypoint is linked, regenerate waypoints preserving type and count
      if (polygon && polygon.waypointLinked !== false) {
        setWaypoints(prevWaypoints => {
          // Get existing waypoints for this polygon
          const existingWaypoints = prevWaypoints.filter(w => w.polygonId === polygon.id)
          const otherWaypoints = prevWaypoints.filter(w => w.polygonId !== polygon.id)

          if (existingWaypoints.length === 0) {
            return prevWaypoints // No waypoints to regenerate
          }

          // Determine waypoint type from existing waypoints
          const waypointType = existingWaypoints[0]?.type || 'vertex'
          const waypointCount = existingWaypoints.length

          let newWaypoints = []
          const updatedPolygon = { ...polygon, geometry: updatedFeature.geometry }

          if (waypointType === 'perimeter') {
            // Regenerate perimeter waypoints with same count
            newWaypoints = generatePerimeterWaypoints(updatedPolygon, waypointCount)
          } else if (waypointType === 'grid') {
            // For grid, just regenerate vertices (grid needs manual regeneration)
            newWaypoints = polygonToWaypoints(updatedPolygon)
          } else {
            // Default: vertex waypoints
            newWaypoints = polygonToWaypoints(updatedPolygon)
          }

          // Recalculate indices
          let index = otherWaypoints.length + 1
          const reindexedNew = newWaypoints.map(wp => ({ ...wp, index: index++ }))

          showNotification(`ポリゴンを更新し、${reindexedNew.length} Waypointを再生成しました`)
          return [...otherWaypoints, ...reindexedNew]
        })
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
    // 飛行要件パネルを表示
    setLastSearchResult(null)
    setShowFlightRequirements(true)
  }, [])

  // Generate waypoints from single polygon
  const handleGenerateWaypoints = useCallback((polygon, options = {}) => {
    const { includeGrid = false } = options

    // If grid is requested, show settings dialog
    if (includeGrid) {
      setShowGridSettings(polygon)
      return
    }

    // Check if there are existing vertex waypoints for this polygon
    const existingVertexWaypoints = waypoints.filter(
      w => w.polygonId === polygon.id && w.type === 'vertex'
    )

    if (existingVertexWaypoints.length > 0) {
      // Ask for confirmation before regenerating
      if (!confirm('既存のWaypointがあります。ポリゴンの頂点位置から再生成しますか？\n（現在のWaypoint位置は失われます）')) {
        return
      }
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
  }, [waypoints, showNotification])

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
    setActivePanel('waypoints')

    // Show notification with route optimization action
    if (newWaypoints.length >= 2) {
      showNotification(
        `${newWaypoints.length} Waypointを生成しました`,
        'info',
        {
          label: 'ルートを最適化',
          onClick: () => setShowRouteOptimizer(true),
        }
      )
    } else {
      showNotification(`${newWaypoints.length} Waypointを生成しました（${spacing}m間隔）`)
    }
  }, [showGridSettings, showNotification])

  // Generate waypoints from all polygons
  const handleGenerateAllWaypoints = useCallback(() => {
    if (polygons.length === 0) return
    const newWaypoints = generateAllWaypoints(polygons)
    setWaypoints(newWaypoints)
    setActivePanel('waypoints')

    // Show notification with route optimization action
    if (newWaypoints.length >= 2) {
      showNotification(
        `${newWaypoints.length} Waypointを生成しました`,
        'info',
        {
          label: 'ルートを最適化',
          onClick: () => setShowRouteOptimizer(true),
        }
      )
    } else {
      showNotification(`${newWaypoints.length} Waypointを生成しました`)
    }
  }, [polygons, showNotification])

  // Handle route optimization result
  const handleApplyOptimizedRoute = useCallback((result) => {
    if (!result || !result.orderedWaypoints) return

    // Reorder waypoints based on optimization
    const reorderedWaypoints = result.orderedWaypoints.map((wp, idx) => ({
      ...wp,
      index: idx + 1,
    }))

    setWaypoints(reorderedWaypoints)
    setOptimizedRoute(result)
    showNotification(`最適ルートを適用しました（${result.totalFlights}フライト）`)
  }, [showNotification])

  // Handle waypoint select from sidebar - start editing parent polygon
  const handleWaypointSelect = useCallback((waypoint) => {
    // Focus on waypoint location
    setCenter({ lat: waypoint.lat, lng: waypoint.lng })
    setZoom(18)

    // If waypoint belongs to a polygon, start editing that polygon
    if (waypoint.polygonId) {
      const parentPolygon = polygons.find(p => p.id === waypoint.polygonId)
      if (parentPolygon) {
        setEditingPolygon(parentPolygon)
        setSelectedPolygonId(parentPolygon.id)
        setDrawMode(false)
        showNotification(`「${parentPolygon.name}」を編集中`)
      }
    }
  }, [polygons, showNotification])

  // Handle waypoint click on map - just select, don't enter edit mode (allows dragging)
  const handleWaypointClickOnMap = useCallback((waypoint) => {
    // Select the parent polygon but don't enter edit mode
    if (waypoint.polygonId) {
      setSelectedPolygonId(waypoint.polygonId)
    }
  }, [])

  // Reindex waypoints to ensure sequential indices
  const reindexWaypoints = useCallback((wps) => {
    return wps.map((wp, idx) => ({ ...wp, index: idx + 1 }))
  }, [])

  // Handle waypoint delete
  const handleWaypointDelete = useCallback((id) => {
    setWaypoints(prev => {
      const filtered = prev.filter(w => w.id !== id)
      return reindexWaypoints(filtered)
    })
    showNotification('Waypointを削除しました（番号再整理済）')
  }, [showNotification, reindexWaypoints])

  // Handle bulk waypoint delete
  const handleWaypointsBulkDelete = useCallback((ids) => {
    const idSet = new Set(ids)
    setWaypoints(prev => {
      const filtered = prev.filter(w => !idSet.has(w.id))
      return reindexWaypoints(filtered)
    })
    showNotification(`${ids.length} 個のWaypointを削除しました（番号再整理済）`)
  }, [showNotification, reindexWaypoints])

  // Handle waypoint move (drag on map) - rebuild polygon from all waypoints
  const handleWaypointMove = useCallback((id, newLat, newLng) => {
    // Find the waypoint being moved
    const waypoint = waypoints.find(w => w.id === id)

    // Update the waypoint position
    const updatedWaypoints = waypoints.map(w =>
      w.id === id ? { ...w, lat: newLat, lng: newLng, elevation: null } : w
    )
    setWaypoints(updatedWaypoints)

    // Skip polygon update for manual or grid waypoints
    if (!waypoint || !waypoint.polygonId || waypoint.type === 'manual' || waypoint.type === 'grid') {
      return
    }

    // Get all waypoints for this polygon (excluding grid and manual)
    const polygonWaypoints = updatedWaypoints
      .filter(w => w.polygonId === waypoint.polygonId && w.type !== 'grid' && w.type !== 'manual')
      .sort((a, b) => a.index - b.index)

    if (polygonWaypoints.length < 3) return

    // Rebuild polygon from waypoint positions
    const newCoords = polygonWaypoints.map(w => [w.lng, w.lat])
    // Close the polygon
    newCoords.push([polygonWaypoints[0].lng, polygonWaypoints[0].lat])

    setPolygons(prev => prev.map(p => {
      if (p.id !== waypoint.polygonId) return p

      return {
        ...p,
        geometry: {
          ...p.geometry,
          coordinates: [newCoords]
        }
      }
    }))
  }, [waypoints])

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

  // Handle map click - no auto waypoint addition
  // Waypoints should be added explicitly via polygon generation or Shift+click
  const handleMapClick = useCallback((latlng, e) => {
    // Only add waypoint with Shift+click (explicit action)
    if (!drawMode && e?.originalEvent?.shiftKey) {
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

  // Mobile detection with resize listener
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)
      // Auto-collapse sidebar when switching to mobile
      if (mobile && !sidebarCollapsed) {
        setSidebarCollapsed(true)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [sidebarCollapsed])

  // Toggle full map mode
  const toggleFullMapMode = useCallback(() => {
    setFullMapMode(prev => {
      if (!prev) {
        // フルマップモードに入る時
        setSidebarCollapsed(true)
        setShowChat(false)
      }
      return !prev
    })
  }, [])

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
    <div className={`app ${fullMapMode ? 'full-map-mode' : ''} ${isMobile ? 'is-mobile' : ''}`}>
      {/* Header */}
      <header className={`app-header ${fullMapMode ? 'hidden' : ''}`}>
        <h1 className="app-title">Drone Waypoint</h1>
        <div className="header-actions">
          <button
            className="icon-button"
            onClick={handleUndo}
            disabled={historyIndexRef.current <= 0}
            data-tooltip="元に戻す (⌘Z)"
            data-tooltip-pos="bottom"
          >
            <Undo2 size={18} />
          </button>
          <button
            className="icon-button"
            onClick={handleRedo}
            disabled={historyIndexRef.current >= historyRef.current.length - 1}
            data-tooltip="やり直す (⌘⇧Z)"
            data-tooltip-pos="bottom"
          >
            <Redo2 size={18} />
          </button>
          <div className="header-divider" />
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
            className="icon-button theme-button"
            onClick={handleToggleTheme}
            data-tooltip={theme === THEMES.DARK ? 'ライトモード' : 'ダークモード'}
            data-tooltip-pos="bottom"
          >
            {theme === THEMES.DARK ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            className="icon-button settings-button"
            onClick={() => setShowApiSettings(true)}
            data-tooltip="設定 (⌘⇧K)"
            data-tooltip-pos="bottom"
          >
            <Settings size={18} />
          </button>
          <button
            className="help-button"
            onClick={() => setShowHelp(true)}
            data-tooltip="ヘルプ (⌘/ or ?)"
            data-tooltip-pos="left"
          >
            ?
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="app-main">
        {/* Sidebar */}
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
                  onClick={() => { setActivePanel('polygons'); toggleSidebar(); }}
                >
                  <Layers size={14} />
                  <span>{polygons.length}</span>
                </div>
                <div
                  className="collapsed-stat clickable"
                  title={`WP: ${waypoints.length}件`}
                  onClick={() => { setActivePanel('waypoints'); toggleSidebar(); }}
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
                    onRegenerateGrid={handleRegenerateGrid}
                    gridSpacing={gridSpacing}
                    onGridSpacingChange={setGridSpacing}
                    isLoadingElevation={isLoadingElevation}
                    elevationProgress={elevationProgress}
                    onOpenRouteOptimizer={() => setShowRouteOptimizer(true)}
                  />
                )}
              </div>
            </>
          )}
        </aside>

        {/* Map */}
        <div className="map-section">
          <Map
            center={center}
            zoom={zoom}
            polygons={polygons}
            waypoints={waypoints}
            recommendedWaypoints={recommendedWaypoints}
            didHighlightedWaypointIndices={didHighlightedWaypointIndices}
            waypointIssueFlagsById={waypointIssueFlagsById}
            highlightedWaypointIndex={highlightedWaypointIndex}
            optimizedRoute={optimizedRoute}
            isMobile={isMobile}
            onPolygonCreate={handlePolygonCreate}
            onPolygonUpdate={handlePolygonUpdate}
            onPolygonDelete={handlePolygonDelete}
            onPolygonSelect={handlePolygonSelectFromMap}
            onPolygonEditComplete={handlePolygonEditComplete}
            onMapClick={handleMapClick}
            onWaypointClick={handleWaypointClickOnMap}
            onWaypointDelete={handleWaypointDelete}
            onWaypointMove={handleWaypointMove}
            onWaypointsBulkDelete={handleWaypointsBulkDelete}
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
                onClick={() => { setActivePanel('polygons'); setSidebarCollapsed(false); }}
              >
                <Layers size={14} />
                <span>{polygons.length}</span>
              </button>
              <button
                className="floating-stat"
                onClick={() => { setActivePanel('waypoints'); setSidebarCollapsed(false); }}
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
                onClick={() => setShowExport(true)}
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

      {/* API Settings Modal */}
      <ApiSettings
        isOpen={showApiSettings}
        onClose={() => setShowApiSettings(false)}
      />

      {/* Flight Requirements Panel (法的要件サマリー) */}
      <FlightRequirements
        polygon={selectedPolygonId ? polygons.find(p => p.id === selectedPolygonId) : polygons[0]}
        waypoints={waypoints}
        altitude={50}
        searchResult={lastSearchResult}
        isOpen={showFlightRequirements}
        onClose={() => setShowFlightRequirements(false)}
      />

      {/* Flight Planner (目的ベースOOUI) */}
      <FlightPlanner
        isOpen={showFlightPlanner}
        onClose={() => setShowFlightPlanner(false)}
        polygons={polygons}
        waypoints={waypoints}
        searchResult={lastSearchResult}
        onApplyRoute={(plan) => {
          // ルートのWaypointを追加
          if (plan.waypoints && plan.waypoints.length > 0) {
            setWaypoints(prev => [...prev, ...plan.waypoints])
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
        onOptimizationUpdate={(optimizationPlan) => {
          // DIDハイライトは、推奨オーバーレイとは独立に保持する（警告のみでも点滅させるため）
          const didSet = new Set()
          /** @type {Record<string, { hasDID: boolean, hasAirport: boolean, hasProhibited: boolean }>} */
          const flagsById = {}
          const gaps = optimizationPlan?.waypointAnalysis?.gaps
          if (Array.isArray(gaps)) {
            for (const gap of gaps) {
              if (!gap?.issues) continue
              const types = new Set(gap.issues.map(i => i?.type).filter(Boolean))
              const hasDID = types.has('did')
              const hasAirport = types.has('airport')
              const hasProhibited = types.has('prohibited')

              if (hasDID && typeof gap.waypointIndex === 'number') didSet.add(gap.waypointIndex)
              if (typeof gap.waypointId === 'string') {
                flagsById[gap.waypointId] = { hasDID, hasAirport, hasProhibited }
              }
            }
          }
          setDidHighlightedWaypointIndices(didSet)
          setWaypointIssueFlagsById(flagsById)

          // 推奨位置のオーバーレイ表示:
          // - DID「警告のみ」の場合でも、空港/禁止などで移動（modified）があるなら推奨を表示する
          // - DIDのみでmodifiedがない場合は推奨を出さない（従来挙動）
          const didWarningOnly = getSetting('didWarningOnlyMode')
          const didAvoidance = isDIDAvoidanceModeEnabled()
          const warningOnlyMode = didWarningOnly && !didAvoidance

          const hasModified =
            Array.isArray(optimizationPlan?.recommendedWaypoints) &&
            optimizationPlan.recommendedWaypoints.some(rw => rw?.modified)

          if (optimizationPlan?.hasIssues && optimizationPlan.recommendedWaypoints) {
            if (warningOnlyMode) {
              setRecommendedWaypoints(hasModified ? optimizationPlan.recommendedWaypoints : null)
            } else {
              setRecommendedWaypoints(optimizationPlan.recommendedWaypoints)
            }
          } else {
            setRecommendedWaypoints(null)
          }
        }}
        onApplyPlan={(plan) => {
          // 推奨プランを適用
          if (plan.waypoints && plan.waypoints.length > 0) {
            // 修正されたWaypointのみ更新
            const updatedWaypoints = waypoints.map(wp => {
              const recommended = plan.waypoints.find(rw => rw.id === wp.id)
              if (recommended && recommended.modified) {
                return {
                  ...wp,
                  lat: recommended.lat,
                  lng: recommended.lng,
                  elevation: null // 座標が変わったので標高はリセット
                }
              }
              return wp
            })
            setWaypoints(updatedWaypoints)
          }

          // ポリゴンも更新（ウェイポイント移動に連動）
          if (plan.polygons && plan.polygons.length > 0) {
            // 複数ポリゴン対応: 各ポリゴンをIDで照合して更新
            setPolygons(prev => prev.map(p => {
              const updated = plan.polygons.find(rp => rp.id === p.id);
              return updated || p;
            }));
          } else if (plan.polygon) {
            // 後方互換: 単一ポリゴン
            setPolygons(prev => prev.map(p =>
              p.id === plan.polygon.id ? plan.polygon : p
            ));
          }

          // オーバーレイをクリア
          setRecommendedWaypoints(null)
          setDidHighlightedWaypointIndices(new Set())
          setWaypointIssueFlagsById({})
          showNotification('プランを安全な位置に最適化しました', 'success')
        }}
        onWaypointSelect={(wpIndex) => {
          // WP番号は1から始まる（表示用）、配列インデックスは0から
          const waypoint = waypoints.find(wp => wp.index === wpIndex) || waypoints[wpIndex - 1]
          if (waypoint) {
            // 地図の中心をWaypointに移動
            setCenter({ lat: waypoint.lat, lng: waypoint.lng })
            setZoom(18) // より高いズームレベル
            // ハイライト表示
            setHighlightedWaypointIndex(wpIndex)
            // 3秒後にハイライトをクリア
            setTimeout(() => setHighlightedWaypointIndex(null), 3000)
            showNotification(`WP${wpIndex}にズームしました`, 'info')
          } else {
            showNotification(`WP${wpIndex}が見つかりません`, 'warning')
          }
        }}
      />

      {/* Notification */}
      {notification && (
        <div className={`notification ${notification.type} ${notification.action ? 'has-action' : ''}`}>
          <span>{notification.message}</span>
          {notification.action && (
            <>
              <button
                className="notification-action"
                onClick={() => {
                  notification.action.onClick()
                  setNotification(null)
                }}
              >
                {notification.action.label}
              </button>
              <button
                className="notification-close"
                onClick={() => setNotification(null)}
                aria-label="閉じる"
              >
                <X size={14} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default App
