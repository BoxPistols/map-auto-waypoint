import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronDown, Search, Undo2, Redo2, Map as MapIcon, Layers, Settings, Sun, Moon, Menu, Route, Maximize2, Minimize2, X, Download } from 'lucide-react'
import { getSetting, isDIDAvoidanceModeEnabled, getWaypointNumberingMode } from '../../services/settingsService'
import { getDetailedCollisionResults, checkAllWaypointsDID, checkAllPolygonsCollision } from '../../services/riskService'
import { preloadDIDDataForCoordinates, isAllDIDCacheReady } from '../../services/didService'
import MapComponent from '../Map/Map'
import SearchForm from '../SearchForm/SearchForm'
import PolygonList from '../PolygonList/PolygonList'
import WaypointList from '../WaypointList/WaypointList'
import FileImport from '../FileImport/FileImport'
import ExportPanel from '../ExportPanel/ExportPanel'
import GridSettingsDialog from '../GridSettingsDialog/GridSettingsDialog'
import HelpModal from '../HelpModal/HelpModal'
import { saveSearchHistory } from '../../utils/storage'
import { searchAddress } from '../../services/geocoding'
import { polygonToWaypoints, generateAllWaypoints, getPolygonCenter, generateGridWaypoints, generatePerimeterWaypoints, reindexWaypoints } from '../../services/waypointGenerator'
import { createPolygonFromSearchResult } from '../../services/polygonGenerator'
import { addElevationToWaypoints } from '../../services/elevation'
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
import '../../App.scss'

// Default center: Tokyo Tower
const DEFAULT_CENTER = { lat: 35.6585805, lng: 139.7454329 }

// ポリゴンの境界からズームレベルを計算
// maxZoom: 14 に制限（近寄りすぎ防止）
const calculateZoomForBounds = (geometry) => {
  if (!geometry?.coordinates?.[0]) return 14

  const coords = geometry.type === 'MultiPolygon'
    ? geometry.coordinates.flat(2)
    : geometry.coordinates[0]

  if (coords.length === 0) return 14

  const lats = coords.map(c => c[1])
  const lngs = coords.map(c => c[0])

  const latSpan = Math.max(...lats) - Math.min(...lats)
  const lngSpan = Math.max(...lngs) - Math.min(...lngs)
  const maxSpan = Math.max(latSpan, lngSpan)

  // maxSpanに基づいてズームレベルを計算（最大14に制限）
  if (maxSpan > 0.5) return 10
  if (maxSpan > 0.2) return 11
  if (maxSpan > 0.1) return 12
  if (maxSpan > 0.05) return 13
  return 14 // 最大ズームを14に制限
}

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

function MainLayout() {

  // Hooks
  const { 
    polygons, setPolygons, 
    waypoints, setWaypoints, 
    selectedPolygonId, setSelectedPolygonId,
    undo, redo, canUndo, canRedo
  } = useDroneData()
  
  const { notification, showNotification, hideNotification } = useNotification()
  const { theme, toggleTheme, THEMES } = useTheme()
  const { dialogState, showConfirm, handleConfirm, handleCancel } = useConfirmDialog()

  // Map state
  const [center, setCenter] = useState(DEFAULT_CENTER)
  const [zoom, setZoom] = useState(12)

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
  const [showWeatherForecast, setShowWeatherForecast] = useState(false)
  const [showDroneDashboard, setShowDroneDashboard] = useState(false)
  const [selectedDashboardPoint, setSelectedDashboardPoint] = useState(null)
  const [optimizedRoute, setOptimizedRoute] = useState(null)
  const [lastSearchResult, setLastSearchResult] = useState(null)
  
  // Custom Layers
  const {
    customLayers,
    visibleCustomLayerIds,
    handleCustomLayerAdded,
    handleCustomLayerRemoved,
    handleCustomLayerToggle
  } = useCustomLayers()

  const [editingPolygon, setEditingPolygon] = useState(null)

  // Waypoint settings
  const [isLoadingElevation, setIsLoadingElevation] = useState(false)
  const [elevationProgress, setElevationProgress] = useState(null)

  // Optimization overlay state
  const [recommendedWaypoints, setRecommendedWaypoints] = useState(null)
  // DID warning highlight (indices) - shown even when recommended overlay is suppressed
  const [didHighlightedWaypointIndices, setDidHighlightedWaypointIndices] = useState(() => new Set())
  // Per-waypoint issue flags (airport/prohibited/did) for marker highlighting (recommendedWaypointsと独立)
  const [waypointIssueFlagsById, setWaypointIssueFlagsById] = useState(() => ({}))
  // Path collision results (intersection points and affected segments)
  const [pathCollisionResult, setPathCollisionResult] = useState(null)
  // Polygon collision results (overlap areas)
  const [polygonCollisionResult, setPolygonCollisionResult] = useState(null)

  // Highlighted waypoint (for FlightAssistant WP click)
  const [highlightedWaypointIndex, setHighlightedWaypointIndex] = useState(null)

  // DIDデータプリロード完了フラグ
  const [didDataReady, setDidDataReady] = useState(false)
  const didPreloadAttemptedRef = useRef(false)

  // ============================================
  // DIDデータのプリロード（初回ロード時）
  // ============================================
  useEffect(() => {
    if (!waypoints || waypoints.length === 0) return
    if (didPreloadAttemptedRef.current) return // 既にプリロード試行済み

    didPreloadAttemptedRef.current = true

    // キャッシュが既に準備できているかチェック
    if (isAllDIDCacheReady(waypoints)) {
      setDidDataReady(true)
      return
    }

    // DIDデータをプリロード
    const preload = async () => {
      try {
        await preloadDIDDataForCoordinates(waypoints)
        setDidDataReady(true)
        console.log('[DID] Preload complete, triggering re-check')
      } catch (error) {
        console.warn('[DID] Preload failed:', error)
        setDidDataReady(true) // エラーでも続行
      }
    }

    preload()
  }, [waypoints])

  // ============================================
  // 自動衝突検出 (RBush空間インデックス + DID GeoJSON)
  // 初期ロード時・リロード時・waypoint変更時に常時実行
  // ============================================
  useEffect(() => {
    if (!waypoints || waypoints.length === 0) {
      setWaypointIssueFlagsById({})
      setDidHighlightedWaypointIndices(new Set())
      setPathCollisionResult(null)
      return
    }

    let cancelled = false

    // 衝突検出を非同期で実行
    const checkCollisions = async () => {
      try {
        // 1. RBush空間インデックスによる空港・禁止区域検出（即座に実行）
        const { results, byType } = getDetailedCollisionResults(waypoints)

        const newFlags = {}
        const didSet = new Set()

        for (const [waypointId, result] of results.entries()) {
          if (result.isColliding) {
            const wp = waypoints.find(w => w.id === waypointId)
            // RBush空間インデックスにはDIDは含まれていないはず
            // (airports + noFlyZones のみ)
            const hasDID = false // RBushからはDID判定しない
            const hasAirport = result.collisionType === 'AIRPORT' || result.collisionType === 'MILITARY'
            const hasProhibited = result.collisionType === 'RED_ZONE' || result.collisionType === 'YELLOW_ZONE'

            newFlags[waypointId] = { hasDID, hasAirport, hasProhibited }

            // デバッグ: RBushで何が検出されたか
            if (import.meta.env.DEV && wp) {
              console.log(`[CollisionCheck] RBush: WP${wp.index} -> ${result.collisionType} (${result.areaName})`)
            }
          }
        }

        // 2. DID GeoJSONによるDID検出（非同期・エラーでも継続）
        try {
          if (import.meta.env.DEV) {
            console.log(`[CollisionCheck] DIDチェック開始: ${waypoints.length}個のウェイポイント`)
          }

          const didResult = await checkAllWaypointsDID(waypoints)

          if (import.meta.env.DEV) {
            console.log(`[CollisionCheck] DIDチェック完了:`, {
              hasDIDWaypoints: didResult?.hasDIDWaypoints,
              didCount: didResult?.didWaypoints?.length || 0,
              didWaypoints: didResult?.didWaypoints?.map(dw => ({
                index: waypoints.find(w => w.id === dw.waypointId)?.index,
                lat: dw.lat.toFixed(6),
                lng: dw.lng.toFixed(6),
                area: dw.area
              }))
            })
          }

          if (!cancelled && didResult?.hasDIDWaypoints) {
            for (const didWp of didResult.didWaypoints) {
              const wp = waypoints.find(w => w.id === didWp.waypointId)
              if (wp) {
                // デバッグ: どの座標がDID判定されたか
                if (import.meta.env.DEV) {
                  console.log(`[CollisionCheck] DID検出: WP${wp.index} (${wp.lat.toFixed(6)}, ${wp.lng.toFixed(6)}) -> ${didWp.area}`)
                }
                if (newFlags[wp.id]) {
                  newFlags[wp.id].hasDID = true
                } else {
                  newFlags[wp.id] = { hasDID: true, hasAirport: false, hasProhibited: false }
                }
                didSet.add(wp.index)
              }
            }
          }
        } catch (didError) {
          // DIDチェック失敗しても他の判定は続行
          console.warn('[CollisionCheck] DIDチェックエラー（継続）:', didError)
        }

        if (cancelled) return

        // 3. 危険セグメント検出（両端点が同一制限区域内のセグメント）
        const dangerSegments = []

        // ポリゴンごとにWaypointをグループ化
        const waypointsByPolygon = new Map()
        for (const wp of waypoints) {
          const polygonId = wp.polygonId || wp.polygonName || 'default'
          if (!waypointsByPolygon.has(polygonId)) {
            waypointsByPolygon.set(polygonId, [])
          }
          waypointsByPolygon.get(polygonId).push(wp)
        }

        // 各ポリゴン内のセグメントをチェック
        for (const [, polygonWaypoints] of waypointsByPolygon.entries()) {
          if (polygonWaypoints.length < 2) continue

          const sortedWaypoints = [...polygonWaypoints].sort((a, b) => a.index - b.index)

          for (let i = 0; i < sortedWaypoints.length - 1; i++) {
            const wpFrom = sortedWaypoints[i]
            const wpTo = sortedWaypoints[i + 1]
            const flagsFrom = newFlags[wpFrom.id] || {}
            const flagsTo = newFlags[wpTo.id] || {}

            let segmentType = null
            let segmentColor = null

            if (flagsFrom.hasDID && flagsTo.hasDID) {
              segmentType = 'DID'
              segmentColor = '#dc2626'
            } else if (flagsFrom.hasAirport && flagsTo.hasAirport) {
              segmentType = 'AIRPORT'
              segmentColor = '#9333ea'
            } else if (flagsFrom.hasProhibited && flagsTo.hasProhibited) {
              segmentType = 'PROHIBITED'
              segmentColor = '#dc2626'
            }

            if (segmentType) {
              dangerSegments.push({
                fromWaypoint: wpFrom,
                toWaypoint: wpTo,
                segmentType,
                segmentColor
              })
            }
          }
        }

        setWaypointIssueFlagsById(newFlags)
        setDidHighlightedWaypointIndices(didSet)
        setPathCollisionResult(dangerSegments.length > 0 ? {
          isColliding: true,
          dangerSegments,
          intersectionPoints: [],
          affectedSegments: []
        } : null)

        if (import.meta.env.DEV && (Object.keys(byType).length > 0 || didSet.size > 0 || dangerSegments.length > 0)) {
          console.log('[CollisionCheck] 自動検出結果:', {
            rbush: byType,
            did: didSet.size > 0 ? `${didSet.size}件` : 'なし',
            dangerSegments: dangerSegments.length > 0 ? `${dangerSegments.length}セグメント` : 'なし'
          })
        }
      } catch (error) {
        console.warn('[CollisionCheck] 衝突検出エラー:', error)
      }
    }

    // 即座に実行（debounce短縮: 100ms）
    const timeoutId = setTimeout(checkCollisions, 100)
    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [waypoints]) // waypointsのみに依存（didDataReady削除で初期ロード時も実行）

  // DIDデータ準備完了時に再チェック
  useEffect(() => {
    if (didDataReady && waypoints && waypoints.length > 0) {
      // waypointsを強制的に更新して再チェックをトリガー
      // （既にuseEffectが走っているので、ここでは追加のDIDチェックのみ）
      const recheckDID = async () => {
        try {
          const didResult = await checkAllWaypointsDID(waypoints)
          if (didResult?.hasDIDWaypoints) {
            setWaypointIssueFlagsById(prev => {
              const updated = { ...prev }
              for (const didWp of didResult.didWaypoints) {
                if (updated[didWp.waypointId]) {
                  updated[didWp.waypointId].hasDID = true
                } else {
                  updated[didWp.waypointId] = { hasDID: true, hasAirport: false, hasProhibited: false }
                }
              }
              return updated
            })
            setDidHighlightedWaypointIndices(prev => {
              const newSet = new Set(prev)
              for (const didWp of didResult.didWaypoints) {
                newSet.add(didWp.waypointIndex)
              }
              return newSet
            })
            if (import.meta.env.DEV) {
              console.log('[CollisionCheck] DIDデータ準備完了、再チェック:', didResult.didCount + '件')
            }
          }
        } catch (error) {
          console.warn('[CollisionCheck] DID再チェックエラー:', error)
        }
      }
      recheckDID()
    }
  }, [didDataReady, waypoints])

  // ============================================
  // ポリゴン衝突検出
  // ============================================
  useEffect(() => {
    if (!polygons || polygons.length === 0) {
      setPolygonCollisionResult(null)
      return
    }

    // debounce: 500ms待ってから実行
    const timeoutId = setTimeout(() => {
      const result = checkAllPolygonsCollision(polygons)
      setPolygonCollisionResult(result.hasCollisions ? result : null)

      if (import.meta.env.DEV && result.hasCollisions) {
        console.log('[CollisionCheck] ポリゴン衝突検出:', {
          collisions: result.polygonResults.length,
          totalOverlapArea: Math.round(result.totalOverlapArea) + 'm²'
        })
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [polygons])

  // Toggle sidebar collapsed state
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      const newValue = !prev
      localStorage.setItem('sidebarCollapsed', String(newValue))
      return newValue
    })
  }, [])

  // Undo function wrapper
  const handleUndo = useCallback(() => {
    if (undo()) {
      showNotification('元に戻しました (Undo)')
    }
  }, [undo, showNotification])

  // Redo function wrapper
  const handleRedo = useCallback(() => {
    if (redo()) {
      showNotification('やり直しました (Redo)')
    }
  }, [redo, showNotification])

  // Handle search
  const handleSearch = useCallback(async (query) => {
    const results = await searchAddress(query)
    if (results.length > 0) {
      const first = results[0]
      saveSearchHistory(query, results)
      setCenter({ lat: first.lat, lng: first.lng })
      setZoom(14)
      showNotification(`「${first.displayName.split(',')[0]}」を表示しました`)
    } else {
      showNotification('検索結果が見つかりませんでした', 'warning')
    }
  }, [showNotification])

  // Handle search select
  const handleSearchSelect = useCallback((result) => {
    if (!result) return
    setCenter({ lat: result.lat, lng: result.lng })
    setZoom(14)
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
    setWaypoints(prev => reindexWaypoints([...prev, ...newWaypoints], { mode: getWaypointNumberingMode() }))

    const center = getPolygonCenter(polygon.geometry)
    if (center) {
      setCenter(center)
      const appropriateZoom = calculateZoomForBounds(polygon.geometry)
      setZoom(appropriateZoom)
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
  }, [setPolygons, setWaypoints, showNotification])

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
  }, [waypoints, setWaypoints, showNotification])

  // Handle polygon create
  const handlePolygonCreate = useCallback((polygon) => {
    setPolygons(prev => [...prev, polygon])
    setDrawMode(false)
    showNotification('ポリゴンを作成しました')
  }, [setPolygons, showNotification])

  // Handle polygon update
  const handlePolygonUpdate = useCallback((feature) => {
    setPolygons(prev => prev.map(p =>
      p.id === feature.id ? { ...p, geometry: feature.geometry } : p
    ))
  }, [setPolygons])

  // Handle polygon delete
  const handlePolygonDelete = useCallback((id) => {
    setPolygons(prev => prev.filter(p => p.id !== id))
    setWaypoints(prev => reindexWaypoints(prev.filter(w => w.polygonId !== id), { mode: getWaypointNumberingMode() }))
    if (selectedPolygonId === id) {
      setSelectedPolygonId(null)
    }
    showNotification('ポリゴンを削除しました')
  }, [selectedPolygonId, setPolygons, setWaypoints, setSelectedPolygonId, showNotification])

  // Handle polygon rename
  const handlePolygonRename = useCallback((id, name) => {
    setPolygons(prev => prev.map(p =>
      p.id === id ? { ...p, name } : p
    ))
    // Update waypoint polygon names
    setWaypoints(prev => prev.map(w =>
      w.polygonId === id ? { ...w, polygonName: name } : w
    ))
  }, [setPolygons, setWaypoints])

  // Handle waypoint link toggle
  const handleToggleWaypointLink = useCallback((id) => {
    setPolygons(prev => prev.map(p =>
      p.id === id ? { ...p, waypointLinked: p.waypointLinked === false ? true : false } : p
    ))
  }, [setPolygons])

  // Handle polygon shape edit start
  const handleEditPolygonShape = useCallback((polygon) => {
    setEditingPolygon(polygon)
    setSelectedPolygonId(polygon.id)
    setDrawMode(false) // Disable draw mode when editing
    // Note: Don't auto-zoom - user is already at appropriate zoom when double-clicking
    showNotification('ポリゴンを編集中です。頂点をドラッグして変更、または外側をクリックで完了。')
  }, [setSelectedPolygonId, showNotification])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore shortcuts when typing in input fields
      // Cmd+K (Mac) or Ctrl+K (Win) for Search - must be before input check
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsSearchExpanded(true)
        // SearchForm's useEffect will handle focus
        return
      }

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
        toggleTheme()
        return
      }

      // Cmd+/ (Mac) or Ctrl+/ (Win) for Help
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        setShowHelp(prev => !prev)
        return
      }

      // ? key
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        setShowHelp(prev => !prev)
        return
      }

      // Cmd+Z (Mac) or Ctrl+Z (Win) for Undo
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          handleRedo()
        } else {
          handleUndo()
        }
        return
      }

      // ESC key - cancel editing mode
      if (e.key === 'Escape' && editingPolygon) {
        e.preventDefault()
        setEditingPolygon(null)
        showNotification('編集をキャンセルしました')
        return
      }

      // Single key shortcuts
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
          case 'c': // Toggle Chat
            e.preventDefault()
            setShowChat(prev => !prev)
            break
          case 'l': // Toggle Flight Requirements
            e.preventDefault()
            setShowFlightRequirements(prev => !prev)
            break
          case 'o': // Toggle Weather Forecast
            e.preventDefault()
            setShowWeatherForecast(prev => !prev)
            break
          // TODO: Issue #39 - 安全性チェッカーのエラー解決後に復活
          // case 'k': // Toggle Safety Checker
          //   e.preventDefault()
          //   setShowDroneDashboard(prev => !prev)
          //   break
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
  }, [handleUndo, handleRedo, sidebarCollapsed, selectedPolygonId, polygons, handleEditPolygonShape, toggleTheme, editingPolygon, showNotification, setIsSearchExpanded])

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
  }, [setPolygons, setWaypoints, showNotification])

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
      // ポリゴン全体が見えるズームレベルを計算
      const appropriateZoom = calculateZoomForBounds(polygon.geometry)
      setZoom(appropriateZoom)
    }
    // 飛行要件パネルを表示
    setLastSearchResult(null)
    setShowFlightRequirements(true)
  }, [setSelectedPolygonId])

  // Generate waypoints from single polygon
  const handleGenerateWaypoints = useCallback(async (polygon, options = {}) => {
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
      const confirmed = await showConfirm({
        title: 'Waypoint再生成',
        message: '既存のWaypointがあります。ポリゴンの頂点位置から再生成しますか？（現在のWaypoint位置は失われます）',
        confirmText: '再生成',
        cancelText: 'キャンセル',
        variant: 'warning'
      })
      if (!confirmed) {
        return
      }
    }

    // Vertex-only generation
    const newWaypoints = polygonToWaypoints(polygon)

    // Remove existing waypoints for this polygon and reindex
    setWaypoints(prev => reindexWaypoints([
      ...prev.filter(w => w.polygonId !== polygon.id),
      ...newWaypoints
    ], { mode: getWaypointNumberingMode() }))
    showNotification(`${newWaypoints.length} Waypointを生成しました`)
    setActivePanel('waypoints')
  }, [waypoints, setWaypoints, showNotification, showConfirm])

  // Handle grid settings confirm
  const handleGridSettingsConfirm = useCallback((settings) => {
    const polygon = showGridSettings
    if (!polygon) return

    const { spacing, includeVertices } = settings

    let newWaypoints = []

    // Add vertex waypoints if requested
    if (includeVertices) {
      const vertexWaypoints = polygonToWaypoints(polygon)
      newWaypoints.push(...vertexWaypoints)
    }

    // Add grid waypoints
    const gridWaypoints = generateGridWaypoints(polygon, spacing)
    newWaypoints.push(...gridWaypoints)

    // Remove existing waypoints for this polygon and reindex all
    setWaypoints(prev => reindexWaypoints([
      ...prev.filter(w => w.polygonId !== polygon.id),
      ...newWaypoints
    ], { mode: getWaypointNumberingMode() }))

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
  }, [showGridSettings, setWaypoints, showNotification])

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
  }, [polygons, setWaypoints, showNotification])

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
  }, [setWaypoints, showNotification])

  // Handle home point move on map
  const handleHomePointMove = useCallback((newPosition) => {
    if (!optimizedRoute) return

    setOptimizedRoute(prev => ({
      ...prev,
      homePoint: newPosition
    }))
    showNotification('ホームポイントを移動しました')
  }, [optimizedRoute, showNotification])

  // Handle waypoint select from sidebar - start editing parent polygon
  const handleWaypointSelect = useCallback((waypoint) => {
    // Focus on waypoint location
    setCenter({ lat: waypoint.lat, lng: waypoint.lng })
    setZoom(14)

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
  }, [polygons, setSelectedPolygonId, showNotification])

  // Handle waypoint click on map - just select, don't enter edit mode (allows dragging)
  const handleWaypointClickOnMap = useCallback((waypoint) => {
    // Select the parent polygon but don't enter edit mode
    if (waypoint.polygonId) {
      setSelectedPolygonId(waypoint.polygonId)
    }
  }, [setSelectedPolygonId])

  // Handle waypoint delete (uses reindexWaypoints from waypointGenerator with mode)
  const handleWaypointDelete = useCallback((id) => {
    setWaypoints(prev => {
      const filtered = prev.filter(w => w.id !== id)
      return reindexWaypoints(filtered, { mode: getWaypointNumberingMode() })
    })
    showNotification('Waypointを削除しました（番号再整理済）')
  }, [setWaypoints, showNotification])

  // Handle bulk waypoint delete
  const handleWaypointsBulkDelete = useCallback((ids) => {
    const idSet = new Set(ids)
    setWaypoints(prev => {
      const filtered = prev.filter(w => !idSet.has(w.id))
      return reindexWaypoints(filtered, { mode: getWaypointNumberingMode() })
    })
    showNotification(`${ids.length} 個のWaypointを削除しました（番号再整理済）`)
  }, [setWaypoints, showNotification])

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
  }, [waypoints, setWaypoints, setPolygons])

  // Handle waypoint update (edit name, coords, etc.)
  const handleWaypointUpdate = useCallback((id, updateData) => {
    setWaypoints(prev => prev.map(w =>
      w.id === id ? { ...w, ...updateData } : w
    ))
    showNotification('Waypointを更新しました')
  }, [setWaypoints, showNotification])

  // Handle polygon select from map
  const handlePolygonSelectFromMap = useCallback((polygonId) => {
    setSelectedPolygonId(polygonId)
    const polygon = polygons.find(p => p.id === polygonId)
    if (polygon) {
      const center = getPolygonCenter(polygon)
      if (center) {
        setCenter(center)
        setZoom(calculateZoomForBounds(polygon.geometry))
      }
    }
  }, [polygons, setSelectedPolygonId])

  // Handle waypoint clear
  const handleWaypointClear = useCallback(() => {
    setWaypoints([])
    showNotification('すべてのWaypointを削除しました')
  }, [setWaypoints, showNotification])

  // Handle file import
  const handleImport = useCallback((importedPolygons) => {
    setPolygons(prev => [...prev, ...importedPolygons])
    showNotification(`${importedPolygons.length} ポリゴンをインポートしました`)
  }, [setPolygons, showNotification])

  // Handle map click - no auto waypoint addition
  // Waypoints should be added explicitly via polygon generation or Shift+click
  const handleMapClick = useCallback((latlng, e) => {
    // Only add waypoint with Shift+click (explicit action)
    if (!drawMode && e?.originalEvent?.shiftKey) {
      const newWaypoint = {
        id: crypto.randomUUID(),
        lat: latlng.lat,
        lng: latlng.lng,
        index: 0, // Will be reindexed
        polygonId: null,
        polygonName: '手動追加',
        type: 'manual'
      }
      setWaypoints(prev => reindexWaypoints([...prev, newWaypoint], { mode: getWaypointNumberingMode() }))

      // TODO: Issue #39 - 安全性チェッカーのエラー解決後に復活
      // ダッシュボードに選択地点を設定
      // setSelectedDashboardPoint({ lat: latlng.lat, lng: latlng.lng })
      // if (!showDroneDashboard) {
      //   setShowDroneDashboard(true)
      // }

      showNotification('Waypointを追加しました')
    }
  }, [drawMode, setWaypoints, showNotification])

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
            disabled={!canUndo}
            data-tooltip="元に戻す (⌘Z)"
            data-tooltip-pos="bottom"
          >
            <Undo2 size={18} />
          </button>
          <button
            className="icon-button"
            onClick={handleRedo}
            disabled={!canRedo}
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
            onClick={toggleTheme}
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
              <br />
              <span style={{ opacity: 0.8, fontSize: '0.85em' }}>外側クリックで完了 / ESCでキャンセル</span>
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
          // ルートのWaypointを追加
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
          setDidHighlightedWaypointIndices(prev => {
            const merged = new Set(prev)
            for (const index of didSet) {
              merged.add(index)
            }
            return merged
          })
          setWaypointIssueFlagsById(prev => {
            const merged = { ...prev }
            for (const [waypointId, nextFlags] of Object.entries(flagsById)) {
              const prevFlags = merged[waypointId] || {}
              merged[waypointId] = {
                hasDID: Boolean(prevFlags.hasDID || nextFlags.hasDID),
                hasAirport: Boolean(prevFlags.hasAirport || nextFlags.hasAirport),
                hasProhibited: Boolean(prevFlags.hasProhibited || nextFlags.hasProhibited)
              }
            }
            return merged
          })

          // 推奨位置のオーバーレイ表示
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
            setZoom(14) // 周辺も見えるズームレベル
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
                        hideNotification()
                      }}
                    >
                      {notification.action.label}
                    </button>
                    <button
                      className="notification-close"
                      onClick={() => hideNotification()}
                      aria-label="閉じる"
                    >
                      <X size={14} />
                    </button>
                  </>
                )}
              </div>
            )}
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
