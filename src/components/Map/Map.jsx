import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import MapGL, { NavigationControl, ScaleControl, Marker, Source, Layer, AttributionControl } from 'react-map-gl/maplibre'
import { Box, Rotate3D, Plane, ShieldAlert, Users, Map as MapIcon, Layers, Building2, Landmark, Satellite, Settings2, X, AlertTriangle, Radio, MapPinned, CloudRain, Wind, Wifi, Crosshair, Signal, Zap, Building, Shield, Lock, Target, Star } from 'lucide-react'
import * as turf from '@turf/turf'
import 'maplibre-gl/dist/maplibre-gl.css'
import DrawControl from './DrawControl'
import ContextMenu from '../ContextMenu'
import MapTooltip from '../MapTooltip'
import VertexListModal from '../VertexListModal'
import FocusCrosshair from '../FocusCrosshair'
import CoordinateDisplay from '../CoordinateDisplay'
import ControlGroup from './ControlGroup'
import FacilityPopup from '../FacilityPopup/FacilityPopup'
import LayerManager from './LayerManager'
import MapControls from './MapControls'
import {
  useMapState,
  useLayerVisibility,
  useCrosshairState,
  useMapInteractions,
  useMapSelection,
  useMapKeyboardShortcuts
} from './hooks'
import { createAirspaceLayerConfigs } from '../../config/layerConfigs'
import { MAP_STYLES, LAYER_COLORS } from './mapConstants'
import {
  formatDateToJST,
  formatDMSCoordinate,
  formatDecimalCoordinate,
  formatWaypointList,
  formatWaypointListCSV,
  copyToClipboard
} from '../../utils/formatters'
import {
  getEmergencyAirspaceGeoJSON,
  getRemoteIdZonesGeoJSON,
  getMannedAircraftZonesGeoJSON,
  getRadioInterferenceZonesGeoJSON,
  getGeographicFeaturesSourceConfig,
  getRainViewerSourceConfig,
  getWindLayerSourceConfig,
  getLTECoverageGeoJSON,
  get5GCoverageGeoJSON,
  generateNuclearPlantsGeoJSON,
  generatePrefecturesGeoJSON,
  generatePoliceFacilitiesGeoJSON,
  generatePrisonsGeoJSON,
  generateJSDFFacilitiesGeoJSON
} from '../../lib'
import {
  fetchRestrictionSurfaceTiles,
  RESTRICTION_SURFACE_STYLES,
  getVisibleTileRange,
  KOKUAREA_TILE_ZOOM,
  KOKUAREA_MAX_TILES
} from '../../lib/services/restrictionSurfaces'
import { loadMapSettings, saveMapSettings } from '../../utils/storage'
import styles from './Map.module.scss'

// Default center: Tokyo Tower
const DEFAULT_CENTER = { lat: 35.6585805, lng: 139.7454329 }
const DEFAULT_ZOOM = 12

const Map = ({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  polygons = [],
  waypoints = [],
  recommendedWaypoints = null,
  didHighlightedWaypointIndices = null,
  waypointIssueFlagsById = null,
  pathCollisionResult = null,
  polygonCollisionResult = null,
  highlightedWaypointIndex = null,
  optimizedRoute = null,
  onHomePointMove,
  isMobile = false,
  isChatOpen = false,
  onPolygonCreate,
  onPolygonUpdate,
  onPolygonDelete,
  onPolygonSelect,
  onPolygonEditStart,
  onPolygonEditComplete,
  onEditFinish,
  onMapClick,
  onWaypointClick,
  onWaypointDelete,
  onWaypointMove,
  onWaypointsBulkDelete,
  selectedPolygonId,
  editingPolygon = null,
  drawMode = false
}) => {
  const mapRef = useRef(null)

  // Load map settings from localStorage (must be before hooks init)
  const initialSettings = useMemo(() => loadMapSettings(), [])
  const initialAirportOverlay = Boolean(
    initialSettings.showAirportZones || initialSettings.showRestrictionSurfaces
  )

  // ========================================
  // Custom Hooks (状態管理の分離)
  // ========================================

  // マップの基本状態
  const {
    viewState,
    setViewState,
    isMapReady,
    setIsMapReady,
    mapStyleId,
    setMapStyleId,
    showStylePicker,
    setShowStylePicker,
    mobileControlsExpanded,
    setMobileControlsExpanded,
    rainCloudSource,
    setRainCloudSource,
    windSource,
    setWindSource,
    restrictionSurfacesData,
    setRestrictionSurfacesData,
  } = useMapState({ center, zoom, initialSettings })

  // レイヤー表示状態
  const {
    layerVisibility,
    setLayerVisibility,
    favoriteGroups,
    setFavoriteGroups,
    toggleLayer,
    toggleAirportOverlay,
    toggleGroupLayers,
    toggleFavoriteGroup,
  } = useLayerVisibility(initialSettings, initialAirportOverlay)

  // クロスヘア状態
  const {
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
  } = useCrosshairState(initialSettings)

  // UI相互作用状態
  const {
    contextMenu,
    setContextMenu,
    polygonContextMenu,
    setPolygonContextMenu,
    vertexListModal,
    setVertexListModal,
    tooltip,
    setTooltip,
    hoverTimeoutRef,
    isWaypointHoveringRef,
    facilityPopup,
    setFacilityPopup,
    lastRestrictionSurfaceKey,
  } = useMapInteractions()

  // 選択ボックス機能
  const {
    isSelecting,
    selectionBox,
    selectedWaypointIds,
    setSelectedWaypointIds,
    handlers: selectionHandlers
  } = useMapSelection({
    mapRef,
    waypoints,
    drawMode,
    editingPolygon,
    onWaypointsBulkDelete
  })
  const hasDuplicateWaypointIndices = useMemo(() => {
    const seen = new Set()
    for (const wp of waypoints) {
      if (seen.has(wp.index)) return true
      seen.add(wp.index)
    }
    return false
  }, [waypoints])

  // Toggle 3D mode
  const toggle3D = useCallback(() => {
    setLayerVisibility(prev => {
      const newIs3D = !prev.is3D
      setViewState(v => ({
        ...v,
        pitch: newIs3D ? 60 : 0
      }))
      return {
        ...prev,
        is3D: newIs3D
      }
    })
  }, [setLayerVisibility, setViewState])

  // キーボードショートカット
  useMapKeyboardShortcuts({
    toggle3D,
    toggleLayer,
    toggleAirportOverlay,
    setShowCrosshair,
    mapStyleId,
    setMapStyleId
  })

  // toggleLayer, toggleAirportOverlay, toggleGroupLayers, toggleFavoriteGroup
  // → useLayerVisibility hook から提供されるため削除

  // isMobile is now passed as a prop from App.jsx to avoid duplication

  // 現在の地図スタイル
  const currentMapStyle = MAP_STYLES[mapStyleId]?.style || MAP_STYLES.osm.style

  // Save map settings when they change
  useEffect(() => {
    saveMapSettings({
      ...layerVisibility,
      showCrosshair,
      crosshairDesign,
      crosshairColor,
      crosshairClickMode,
      coordinateFormat,
      mapStyleId
    })
  }, [layerVisibility, showCrosshair, crosshairDesign, crosshairColor, crosshairClickMode, coordinateFormat, mapStyleId])

  // 雨雲レーダーソースを取得
  useEffect(() => {
    let isActive = true
    if (layerVisibility.showRainCloud) {
      getRainViewerSourceConfig()
        .then(config => {
          if (isActive) {
            setRainCloudSource(config)
          }
        })
        .catch(error => {
          console.error('Failed to fetch rain cloud source:', error)
          if (isActive) {
            setRainCloudSource(null) // エラー時はソースをクリア
          }
        })
    } else {
      setRainCloudSource(null) // 非表示になったらソースをクリア
    }

    return () => {
      isActive = false
    }
  }, [layerVisibility.showRainCloud])

  // 風データソースを取得（環境変数からAPIキーを読み込み）
  useEffect(() => {
    if (layerVisibility.showWind) {
      // VITE_OPENWEATHER_API_KEY環境変数からAPIキーを取得
      const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY
      const config = getWindLayerSourceConfig(apiKey)
      setWindSource(config)
    } else {
      setWindSource(null)
    }
  }, [layerVisibility.showWind])

  const isAirportOverlayEnabled =
    layerVisibility.showAirportZones || layerVisibility.showRestrictionSurfaces

  // 制限表面データを取得（表示範囲変更時）
  useEffect(() => {
    if (!isAirportOverlayEnabled || !isMapReady || !mapRef.current) {
      lastRestrictionSurfaceKey.current = null
      setRestrictionSurfacesData(null)
      return
    }

    let isActive = true
    let timeoutId = null

    const fetchSurfaces = async () => {
      const map = mapRef.current?.getMap()
      if (!map) return

      const bounds = map.getBounds()
      const zoom = map.getZoom()

      // ズームレベルが低すぎる場合は取得しない（パフォーマンス対策）
      if (zoom < 8) {
        lastRestrictionSurfaceKey.current = null
        setRestrictionSurfacesData(null)
        return
      }

      const range = getVisibleTileRange(
        {
          west: bounds.getWest(),
          east: bounds.getEast(),
          south: bounds.getSouth(),
          north: bounds.getNorth()
        },
        KOKUAREA_TILE_ZOOM
      )
      const rangeKey = `${range.z}:${range.xMin}-${range.xMax}:${range.yMin}-${range.yMax}`

      if (range.count > KOKUAREA_MAX_TILES) {
        lastRestrictionSurfaceKey.current = rangeKey
        setRestrictionSurfacesData(null)
        return
      }

      if (lastRestrictionSurfaceKey.current === rangeKey) {
        return
      }
      lastRestrictionSurfaceKey.current = rangeKey

      try {
        const data = await fetchRestrictionSurfaceTiles(
          {
            west: bounds.getWest(),
            east: bounds.getEast(),
            south: bounds.getSouth(),
            north: bounds.getNorth()
          },
          zoom
        )
        if (isActive && data.features.length > 0) {
          setRestrictionSurfacesData(data)
        } else if (isActive) {
          setRestrictionSurfacesData(null)
        }
      } catch (error) {
        console.error('Failed to fetch restriction surfaces:', error)
        if (isActive) {
          setRestrictionSurfacesData(null)
        }
      }
    }

    // 初回取得
    fetchSurfaces()

    // マップ移動時に再取得（デバウンス）
    const handleMoveEnd = () => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(fetchSurfaces, 500)
    }

    const map = mapRef.current?.getMap()
    if (map) {
      map.on('moveend', handleMoveEnd)
    }

    return () => {
      isActive = false
      if (timeoutId) clearTimeout(timeoutId)
      const mapInstance = mapRef.current?.getMap()
      if (mapInstance) {
        mapInstance.off('moveend', handleMoveEnd)
      }
    }
  }, [isAirportOverlayEnabled, isMapReady])

  // Sync viewState when center/zoom props change from parent (e.g., WP click)
  useEffect(() => {
    if (center && zoom) {
       
      setViewState(prev => ({
        ...prev,
        latitude: center.lat,
        longitude: center.lng,
        zoom: zoom
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng, zoom])

  // Airspace layer configurations (moved to LayerManager)
  const airspaceLayerConfigs = useMemo(() => createAirspaceLayerConfigs(), [])
  // UTM新規レイヤーのGeoJSON
  const emergencyAirspaceGeoJSON = useMemo(() => getEmergencyAirspaceGeoJSON(), [])
  const remoteIdZonesGeoJSON = useMemo(() => getRemoteIdZonesGeoJSON(), [])
  const mannedAircraftZonesGeoJSON = useMemo(() => getMannedAircraftZonesGeoJSON(), [])
  const radioInterferenceZonesGeoJSON = useMemo(() => getRadioInterferenceZonesGeoJSON(), [])
  const geoFeaturesSourceConfig = useMemo(() => getGeographicFeaturesSourceConfig(), [])
  // ネットワークカバレッジGeoJSON
  const lteCoverageGeoJSON = useMemo(() => getLTECoverageGeoJSON(), [])
  const fiveGCoverageGeoJSON = useMemo(() => get5GCoverageGeoJSON(), [])
  // 禁止区域カテゴリー別GeoJSON
  const nuclearPlantsGeoJSON = useMemo(() => generateNuclearPlantsGeoJSON(), [])
  const prefecturesGeoJSON = useMemo(() => generatePrefecturesGeoJSON(), [])
  const policeFacilitiesGeoJSON = useMemo(() => generatePoliceFacilitiesGeoJSON(), [])
  const prisonsGeoJSON = useMemo(() => generatePrisonsGeoJSON(), [])
  const jsdfFacilitiesGeoJSON = useMemo(() => generateJSDFFacilitiesGeoJSON(), [])

  // GeoJSONレイヤーの設定配列（データ駆動でレンダリング）
  const geoJsonLayerConfigs = useMemo(() => [
    {
      id: 'nuclear-plants',
      show: layerVisibility.showNuclearPlants,
      data: nuclearPlantsGeoJSON,
      // 稼働状況による色分け（データドリブンスタイル）
      fillColor: [
        'match',
        ['get', 'operationalStatus'],
        'operational', '#dc2626',         // 運転中: 赤
        'stopped', '#f97316',              // 停止中: オレンジ
        'decommissioning', '#eab308',      // 廃炉作業中: 黄色
        'decommissioned', '#6b7280',       // 廃炉完了: グレー
        '#9333ea'                          // デフォルト: 紫
      ],
      fillOpacity: 0.35,
      lineColor: [
        'match',
        ['get', 'operationalStatus'],
        'operational', '#b91c1c',
        'stopped', '#ea580c',
        'decommissioning', '#ca8a04',
        'decommissioned', '#4b5563',
        '#7c3aed'
      ],
      lineWidth: 2,
      lineDasharray: [3, 3],
      labelColor: '#7c3aed',
      labelSize: 10,
      // ラベルに施設名と稼働状況を表示
      labelField: [
        'concat',
        ['get', 'name'],
        ' (',
        [
          'match',
          ['get', 'operationalStatus'],
          'operational', '運転中',
          'stopped', '停止中',
          'decommissioning', '廃炉中',
          'decommissioned', '廃炉完了',
          ''
        ],
        ')'
      ]
    },
    {
      id: 'prefectures',
      show: layerVisibility.showPrefectures,
      data: prefecturesGeoJSON,
      fillColor: LAYER_COLORS.PREFECTURE,
      fillOpacity: 0.25,
      lineColor: '#cc5200',
      lineWidth: 2,
      labelColor: '#993d00',
      labelSize: 10
    },
    {
      id: 'police',
      show: layerVisibility.showPolice,
      data: policeFacilitiesGeoJSON,
      fillColor: LAYER_COLORS.POLICE,
      fillOpacity: 0.25,
      lineColor: '#0052cc',
      lineWidth: 2,
      labelColor: '#003d99',
      labelSize: 10
    },
    {
      id: 'prisons',
      show: layerVisibility.showPrisons,
      data: prisonsGeoJSON,
      fillColor: LAYER_COLORS.PRISON,
      fillOpacity: 0.3,
      lineColor: '#4d4d4d',
      lineWidth: 2,
      labelColor: '#333333',
      labelSize: 10
    },
    {
      id: 'jsdf',
      show: layerVisibility.showJSDF,
      data: jsdfFacilitiesGeoJSON,
      fillColor: LAYER_COLORS.JSDF,
      fillOpacity: 0.25,
      lineColor: '#009900',
      lineWidth: 2,
      labelColor: '#006600',
      labelSize: 10
    },
    {
      id: 'emergency-airspace',
      show: layerVisibility.showEmergencyAirspace,
      data: emergencyAirspaceGeoJSON,
      fillColor: LAYER_COLORS.EMERGENCY_AIRSPACE,
      fillOpacity: 0.25,
      lineColor: '#dc2626',
      lineWidth: 2,
      lineDasharray: [5, 3],
      labelColor: '#b91c1c',
      labelSize: 11
    },
    {
      id: 'remote-id-zones',
      show: layerVisibility.showRemoteIdZones,
      data: remoteIdZonesGeoJSON,
      fillColor: LAYER_COLORS.REMOTE_ID,
      fillOpacity: 0.15,
      lineColor: '#2563eb',
      lineWidth: 2,
      lineDasharray: [4, 4],
      labelColor: '#1d4ed8',
      labelSize: 11
    },
    {
      id: 'manned-aircraft-zones',
      show: layerVisibility.showMannedAircraftZones,
      data: mannedAircraftZonesGeoJSON,
      fillColor: LAYER_COLORS.MANNED_AIRCRAFT,
      fillOpacity: 0.2,
      lineColor: '#db2777',
      lineWidth: 2,
      labelColor: '#be185d',
      labelSize: 10
    },
    {
      id: 'radio-zones',
      show: layerVisibility.showRadioZones,
      data: radioInterferenceZonesGeoJSON,
      fillColor: LAYER_COLORS.RADIO_INTERFERENCE,
      fillOpacity: 0.2,
      lineColor: '#9333ea',
      lineWidth: 2,
      lineDasharray: [2, 2],
      labelColor: '#7c3aed',
      labelSize: 10,
      labelField: ['concat', ['get', 'name'], ' (', ['get', 'frequency'], ')']  // 特別なラベルフィールド
    },
    {
      id: 'lte-coverage',
      show: layerVisibility.showNetworkCoverage,
      data: lteCoverageGeoJSON,
      fillColor: LAYER_COLORS.LTE_COVERAGE,
      fillOpacity: 0.1,
      lineColor: '#059669',
      lineWidth: 1,
      lineDasharray: [4, 2],
      labelColor: '#047857',
      labelSize: 9,
      labelField: ['get', 'name']
    },
    {
      id: '5g-coverage',
      show: layerVisibility.showNetworkCoverage,
      data: fiveGCoverageGeoJSON,
      fillColor: LAYER_COLORS.FIVE_G_COVERAGE,
      fillOpacity: 0.15,
      lineColor: '#0891b2',
      lineWidth: 2,
      labelColor: '#0e7490',
      labelSize: 10,
      labelField: ['get', 'name']
    }
  ], [
    layerVisibility.showNuclearPlants,
    layerVisibility.showPrefectures,
    layerVisibility.showPolice,
    layerVisibility.showPrisons,
    layerVisibility.showJSDF,
    layerVisibility.showEmergencyAirspace,
    layerVisibility.showRemoteIdZones,
    layerVisibility.showMannedAircraftZones,
    layerVisibility.showRadioZones,
    layerVisibility.showNetworkCoverage,
    nuclearPlantsGeoJSON,
    prefecturesGeoJSON,
    policeFacilitiesGeoJSON,
    prisonsGeoJSON,
    jsdfFacilitiesGeoJSON,
    emergencyAirspaceGeoJSON,
    remoteIdZonesGeoJSON,
    mannedAircraftZonesGeoJSON,
    radioInterferenceZonesGeoJSON,
    lteCoverageGeoJSON,
    fiveGCoverageGeoJSON
  ])

  // Memoize optimized route GeoJSON (lines connecting waypoints in optimal order)
  const optimizedRouteGeoJSON = useMemo(() => {
    if (!optimizedRoute || !optimizedRoute.flights || optimizedRoute.flights.length === 0) return null

    const features = []
    const homePoint = optimizedRoute.homePoint

    // Flight colors: Flight 1 = blue, Flight 2 = green, Flight 3+ = red
    const flightColors = ['#2563eb', '#16a34a', '#dc2626', '#f59e0b', '#8b5cf6']

    optimizedRoute.flights.forEach((flight, flightIdx) => {
      const color = flightColors[Math.min(flightIdx, flightColors.length - 1)]
      const wps = flight.waypoints

      if (wps.length === 0) return

      // Line from home to first waypoint
      features.push({
        type: 'Feature',
        properties: { flightNumber: flight.flightNumber, color, isReturn: false },
        geometry: {
          type: 'LineString',
          coordinates: [
            [homePoint.lng, homePoint.lat],
            [wps[0].lng, wps[0].lat]
          ]
        }
      })

      // Lines between waypoints
      for (let i = 0; i < wps.length - 1; i++) {
        features.push({
          type: 'Feature',
          properties: { flightNumber: flight.flightNumber, color, isReturn: false },
          geometry: {
            type: 'LineString',
            coordinates: [
              [wps[i].lng, wps[i].lat],
              [wps[i + 1].lng, wps[i + 1].lat]
            ]
          }
        })
      }

      // Line from last waypoint back to home
      features.push({
        type: 'Feature',
        properties: { flightNumber: flight.flightNumber, color, isReturn: true },
        geometry: {
          type: 'LineString',
          coordinates: [
            [wps[wps.length - 1].lng, wps[wps.length - 1].lat],
            [homePoint.lng, homePoint.lat]
          ]
        }
      })
    })

    return {
      type: 'FeatureCollection',
      features
    }
  }, [optimizedRoute])

  // Memoize optimization overlay GeoJSON (lines from current to recommended positions + zone warnings)
  const optimizationOverlayGeoJSON = useMemo(() => {
    if (!recommendedWaypoints || recommendedWaypoints.length === 0) return null

    const features = []

    recommendedWaypoints.forEach(rw => {
      // Determine warning type
      let warningType = 'optimization'
      if (rw.hasProhibited) warningType = 'prohibited'
      else if (rw.hasAirport) warningType = 'airport'
      else if (rw.hasDID) warningType = 'did'

      // Add zone warning at current position if there are issues
      if (rw.hasProhibited || rw.hasAirport || rw.hasDID) {
        const original = waypoints.find(w => w.id === rw.id)
        if (original) {
          features.push({
            type: 'Feature',
            properties: { type: 'zone-warning-point', index: rw.index, warningType },
            geometry: {
              type: 'Point',
              coordinates: [original.lng, original.lat]
            }
          })
        }
      }

      if (rw.modified) {
        // Find original waypoint
        const original = waypoints.find(w => w.id === rw.id)
        if (original) {
          // Line from original to recommended position
          features.push({
            type: 'Feature',
            properties: { type: 'optimization-line', warningType },
            geometry: {
              type: 'LineString',
              coordinates: [
                [original.lng, original.lat],
                [rw.lng, rw.lat]
              ]
            }
          })
          // Recommended position point
          features.push({
            type: 'Feature',
            properties: { type: 'recommended-point', index: rw.index, warningType },
            geometry: {
              type: 'Point',
              coordinates: [rw.lng, rw.lat]
            }
          })
        }
      }
    })

    if (features.length === 0) return null

    return {
      type: 'FeatureCollection',
      features
    }
  }, [recommendedWaypoints, waypoints])

  // Path collision overlay GeoJSON (danger segments where both endpoints are in same zone)
  const pathCollisionGeoJSON = useMemo(() => {
    if (!pathCollisionResult || !pathCollisionResult.isColliding) return null

    const features = []

    // 新形式: dangerSegments（両端点が同一制限区域内）
    pathCollisionResult.dangerSegments?.forEach((segment, idx) => {
      if (segment.fromWaypoint && segment.toWaypoint) {
        features.push({
          type: 'Feature',
          properties: {
            type: 'danger-segment',
            segmentType: segment.segmentType,
            color: segment.segmentColor,
            index: idx
          },
          geometry: {
            type: 'LineString',
            coordinates: [
              [segment.fromWaypoint.lng, segment.fromWaypoint.lat],
              [segment.toWaypoint.lng, segment.toWaypoint.lat]
            ]
          }
        })
      }
    })

    if (features.length === 0) return null

    return {
      type: 'FeatureCollection',
      features
    }
  }, [pathCollisionResult])

  // Polygon collision overlay GeoJSON (intersection/overlap areas)
  const polygonCollisionGeoJSON = useMemo(() => {
    if (!polygonCollisionResult || !polygonCollisionResult.hasCollisions) return null

    const features = polygonCollisionResult.intersectionPolygons.map((ip, idx) => ({
      type: 'Feature',
      properties: {
        ...ip.properties,
        index: idx,
        type: 'polygon-overlap'
      },
      geometry: ip.geometry
    }))

    if (features.length === 0) return null

    return {
      type: 'FeatureCollection',
      features
    }
  }, [polygonCollisionResult])

  // DID tile source configuration (令和2年国勢調査データ)
  // Note: GSI DID tiles have limited zoom range, maxzoom 14 is safe
  const didTileSource = useMemo(() => ({
    type: 'raster',
    tiles: ['https://cyberjapandata.gsi.go.jp/xyz/did2020/{z}/{x}/{y}.png'],
    tileSize: 256,
    minzoom: 8,
    maxzoom: 14,
    attribution: '国土地理院・総務省統計局（令和2年）'
  }), [])

  // Handle map click
  const handleClick = useCallback((e) => {
    const features = e.features || []
    const polygonFeature = features.find(f => f.layer?.id === 'polygon-fill')

    // 施設レイヤーのフィーチャーをチェック（ポップアップ表示）
    const facilityLayerIds = [
      'nuclear-plants-fill',
      'prefectures-fill',
      'police-fill',
      'prisons-fill',
      'jsdf-fill',
      'red-zones-fill',
      'yellow-zones-fill'
    ]
    const facilityFeature = features.find(f =>
      facilityLayerIds.includes(f.layer?.id)
    )

    // ポリゴン描画/編集モード中は施設ポップアップを表示しない
    if (facilityFeature && !drawMode && !editingPolygon) {
      // ツールチップをクリア（競合を避けるため）
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
        hoverTimeoutRef.current = null
      }
      setTooltip(null)

      // 施設ポップアップを表示
      setFacilityPopup({
        facility: facilityFeature.properties,
        screenX: e.point.x,
        screenY: e.point.y
      })
      return
    }

    // If in edit mode and clicking outside the polygon, finish editing
    if (editingPolygon && !polygonFeature) {
      onEditFinish?.()
      return
    }

    if (polygonFeature) {
      onPolygonSelect?.(polygonFeature.properties.id)
      return
    }

    if (onMapClick && !drawMode) {
      onMapClick({
        lat: e.lngLat.lat,
        lng: e.lngLat.lng
      }, e)
    }
  }, [onMapClick, onPolygonSelect, drawMode, editingPolygon, onEditFinish])

  // Handle crosshair click to show center coordinates
  const handleCrosshairClick = useCallback(() => {
    if (!mapRef.current) return
    const center = mapRef.current.getMap().getCenter()
    setCoordinateDisplay({
      lng: center.lng,
      lat: center.lat,
      screenX: window.innerWidth / 2,
      screenY: window.innerHeight / 2
    })
  }, [])

  // Handle double-click on polygon to enter edit mode
  const handleDoubleClick = useCallback((e) => {
    // Prevent default zoom behavior
    e.preventDefault()
    if (e.originalEvent) {
      e.originalEvent.preventDefault()
      e.originalEvent.stopPropagation()
    }

    const features = e.features || []
    const polygonFeature = features.find(f => f.layer?.id === 'polygon-fill')

    if (polygonFeature && onPolygonEditStart) {
      const polygonId = polygonFeature.properties.id
      const polygon = polygons.find(p => p.id === polygonId)
      if (polygon) {
        onPolygonEditStart(polygon)
      }
    }
  }, [polygons, onPolygonEditStart])

  // Handle polygon right-click for context menu
  const handlePolygonRightClick = useCallback((e) => {
    const features = e.features || []
    const polygonFeature = features.find(f => f.layer?.id === 'polygon-fill')

    if (polygonFeature) {
      e.preventDefault()

      // Clear tooltip when context menu opens
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
        hoverTimeoutRef.current = null
      }
      setTooltip(null)

      const polygonId = polygonFeature.properties.id
      const polygon = polygons.find(p => p.id === polygonId)
      if (polygon) {
        // Auto-select polygon on right-click
        if (onPolygonSelect) {
          onPolygonSelect(polygon.id)
        }

        setPolygonContextMenu({
          isOpen: true,
          position: { x: e.point.x, y: e.point.y },
          polygon
        })
      }
    }
  }, [polygons, onPolygonSelect])

  // Handle polygon creation from draw control
  const handleCreate = useCallback((features) => {
    if (onPolygonCreate && features.length > 0) {
      const feature = features[0]
      const polygon = {
        id: crypto.randomUUID(),
        name: `エリア ${Date.now()}`,
        geometry: feature.geometry,
        createdAt: Date.now(),
        color: '#45B7D1'
      }
      onPolygonCreate(polygon)
    }
  }, [onPolygonCreate])

  const handleUpdate = useCallback((features) => {
    if (onPolygonUpdate && features.length > 0) {
      onPolygonUpdate(features[0])
    }
  }, [onPolygonUpdate])

  const handleDelete = useCallback((features) => {
    if (onPolygonDelete && features.length > 0) {
      onPolygonDelete(features[0].id)
    }
  }, [onPolygonDelete])

  // Get waypoint airspace restrictions (DID, Airport, Prohibited, etc.)
  const getWaypointAirspaceRestrictions = useCallback((wp) => {
    const flags = waypointIssueFlagsById?.[wp.id] || {}
    const restrictions = []

    if (flags.hasDID) {
      restrictions.push({ type: 'DID', label: 'DID（人口集中地区）', color: '#dc2626', icon: '🏙️' })
    }
    if (flags.hasAirport) {
      restrictions.push({ type: 'AIRPORT', label: '空港等周辺', color: '#9333ea', icon: '✈️' })
    }
    if (flags.hasProhibited) {
      restrictions.push({ type: 'PROHIBITED', label: '飛行禁止区域', color: '#dc2626', icon: '🚫' })
    }
    if (flags.hasYellowZone) {
      restrictions.push({ type: 'YELLOW_ZONE', label: '重要施設周辺（イエロー）', color: '#eab308', icon: '⚠️' })
    }

    if (restrictions.length === 0) {
      restrictions.push({ type: 'NORMAL', label: '通常空域', color: '#10b981', icon: '✓' })
    }

    return restrictions
  }, [waypointIssueFlagsById])

  // Handle waypoint right-click - open context menu
  const handleWaypointRightClick = useCallback((e, wp) => {
    e.preventDefault()
    e.stopPropagation()
    // Clear tooltip when context menu opens
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    setTooltip(null)
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      waypoint: { ...wp, airspaceRestrictions: getWaypointAirspaceRestrictions(wp) }
    })
  }, [getWaypointAirspaceRestrictions])

  // Handle waypoint hover - show tooltip
  const handleWaypointHover = useCallback((e, wp) => {
    e.stopPropagation()

    if (import.meta.env.DEV) {
      console.log(`[Map] Waypoint hover: WP${wp.index}`, { x: e.clientX, y: e.clientY })
    }

    // Don't show tooltip during draw mode or editing
    if (drawMode || editingPolygon) {
      if (import.meta.env.DEV) {
        console.log('[Map] Waypoint hover blocked: draw/edit mode active')
      }
      return
    }

    // Don't show tooltip if context menu is open
    if (contextMenu?.isOpen || polygonContextMenu?.isOpen) {
      if (import.meta.env.DEV) {
        console.log('[Map] Waypoint hover blocked: context menu open')
      }
      return
    }

    // Mark waypoint as hovering (to prevent polygon hover from triggering)
    isWaypointHoveringRef.current = true

    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }

    // Set tooltip with 3 second delay to avoid interference
    hoverTimeoutRef.current = setTimeout(() => {
      const restrictions = getWaypointAirspaceRestrictions(wp)
      if (import.meta.env.DEV) {
        console.log(`[Map] Showing waypoint tooltip: WP${wp.index}`, { restrictions })
      }
      setTooltip({
        isVisible: true,
        position: { x: e.clientX, y: e.clientY },
        data: { ...wp, airspaceRestrictions: restrictions },
        type: 'waypoint'
      })
    }, 3000)
  }, [contextMenu, polygonContextMenu, drawMode, editingPolygon, getWaypointAirspaceRestrictions])

  // Handle waypoint hover end - hide tooltip
  const handleWaypointHoverEnd = useCallback(() => {
    isWaypointHoveringRef.current = false
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    setTooltip(null)
  }, [])

  // Handle polygon hover - show tooltip
  const handlePolygonHover = useCallback((e) => {
    if (!mapRef.current) return

    // Don't show tooltip during draw mode or editing
    if (drawMode || editingPolygon) {
      return
    }

    // Don't show tooltip if context menu is open or waypoint is hovering
    if (contextMenu?.isOpen || polygonContextMenu?.isOpen || isWaypointHoveringRef.current) {
      return
    }

    const map = mapRef.current.getMap()

    // Get mouse position - try e.point first, fallback to calculating from event
    let point = e.point
    if (!point && e.originalEvent) {
      const canvas = map.getCanvas()
      const rect = canvas.getBoundingClientRect()
      point = {
        x: e.originalEvent.clientX - rect.left,
        y: e.originalEvent.clientY - rect.top
      }
    }

    if (!point) return

    // Check if polygon-fill layer exists before querying
    if (!map.getLayer('polygon-fill')) return

    // Query features at the mouse position
    const features = map.queryRenderedFeatures(point, {
      layers: ['polygon-fill']
    })

    if (features && features.length > 0) {
      const polygonFeature = features[0]
      const polygonId = polygonFeature.properties.id
      const polygon = polygons.find(p => p.id === polygonId)

      if (polygon) {
        // Clear any existing timeout
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current)
        }

        // Calculate area using turf
        const area = turf.area(polygon.geometry)

        // Count waypoints for this polygon
        const waypointCount = waypoints.filter(wp => wp.polygonId === polygon.id).length

        // 3 second delay to avoid accidental tooltip during editing
        hoverTimeoutRef.current = setTimeout(() => {
          setTooltip({
            isVisible: true,
            position: { x: e.originalEvent.clientX, y: e.originalEvent.clientY },
            data: {
              ...polygon,
              area,
              waypointCount
            },
            type: 'polygon'
          })
        }, 3000)
      }
    } else {
      // No polygon under cursor, clear tooltip
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
        hoverTimeoutRef.current = null
      }
      setTooltip(null)
    }
  }, [polygons, waypoints, contextMenu, polygonContextMenu, drawMode, editingPolygon])

  // Handle polygon hover end - hide tooltip
  const handlePolygonHoverEnd = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    setTooltip(null)
  }, [])

  // Cleanup hover timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  // Handle context menu actions
  const handleContextMenuAction = useCallback((action, _data) => {
    if (!contextMenu?.waypoint) return
    const wp = contextMenu.waypoint

    switch (action) {
      case 'delete':
        if (onWaypointDelete) {
          if (confirm(`Waypoint #${wp.index} を削除しますか？`)) {
            onWaypointDelete(wp.id)
          }
        }
        break
      case 'copy-coords':
        copyToClipboard(formatDecimalCoordinate(wp.lat, wp.lng))
        break
      case 'copy-coords-dms':
        copyToClipboard(formatDMSCoordinate(wp.lat, wp.lng))
        break
      case 'focus':
        if (onWaypointClick) {
          onWaypointClick(wp)
        }
        break
      default:
        break
    }
  }, [contextMenu, onWaypointDelete, onWaypointClick])

  // Build context menu items for waypoint
  const waypointContextMenuItems = useMemo(() => {
    if (!contextMenu?.waypoint) return []
    const wp = contextMenu.waypoint
    
    // Find polygon name if available
    const polygon = polygons.find(p => p.id === wp.polygonId)
    
    const items = [
      { id: 'header', type: 'header', label: `WP #${wp.index}` }
    ]
    
    // Add polygon name if available
    if (polygon) {
      items.push({
        id: 'info-polygon',
        type: 'info',
        label: 'ポリゴン',
        content: (
          <div style={{ fontSize: '12px' }}>
            <div style={{ color: 'rgba(255, 255, 255, 0.9)' }}>{polygon.name}</div>
          </div>
        )
      })
    }
    
    // Add coordinate info
    items.push({
      id: 'info-coords',
      type: 'info',
      label: '座標',
      content: (
        <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
          <div>Decimal: {formatDecimalCoordinate(wp.lat, wp.lng)}</div>
          <div style={{ marginTop: '4px' }}>DMS: {formatDMSCoordinate(wp.lat, wp.lng)}</div>
        </div>
      )
    })
    
    // Add creation date if available
    if (wp.createdAt) {
      items.push({
        id: 'info-created',
        type: 'info',
        label: '作成日時',
        content: formatDateToJST(wp.createdAt)
      })
    }

    // Add airspace restrictions info
    if (wp.airspaceRestrictions && wp.airspaceRestrictions.length > 0) {
      items.push({
        id: 'info-airspace',
        type: 'info',
        label: '飛行制限',
        content: (
          <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
            {wp.airspaceRestrictions.map((r, idx) => (
              <div
                key={idx}
                style={{
                  color: r.color,
                  fontWeight: r.type !== 'NORMAL' ? '600' : '400',
                  marginTop: idx > 0 ? '4px' : '0'
                }}
              >
                {r.icon} {r.label}
              </div>
            ))}
          </div>
        )
      })
    }

    items.push(
      { id: 'divider1', divider: true },
      { id: 'copy-coords', icon: '📋', label: '座標をコピー (decimal)', action: 'copy-coords' },
      { id: 'copy-coords-dms', icon: '🌐', label: '座標をコピー (DMS)', action: 'copy-coords-dms' },
      { id: 'divider2', divider: true },
      { id: 'delete', icon: '🗑️', label: '削除', action: 'delete', danger: true }
    )
    
    return items
  }, [contextMenu, polygons])

  // Handle polygon context menu actions
  const handlePolygonContextMenuAction = useCallback(async (action) => {
    if (!polygonContextMenu?.polygon) return
    const polygon = polygonContextMenu.polygon

    switch (action) {
      case 'delete':
        if (onPolygonDelete) {
          if (confirm(`「${polygon.name}」を削除しますか？`)) {
            onPolygonDelete(polygon.id)
          }
        }
        break
      case 'edit':
        if (onPolygonEditStart) {
          onPolygonEditStart(polygon)
        }
        break
      case 'copy-waypoints-decimal': {
        const polygonWaypoints = waypoints.filter(wp => wp.polygonId === polygon.id)
        const text = formatWaypointList(polygonWaypoints, 'decimal', polygon.name)
        await copyToClipboard(text)
        break
      }
      case 'copy-waypoints-dms': {
        const polygonWaypoints = waypoints.filter(wp => wp.polygonId === polygon.id)
        const text = formatWaypointList(polygonWaypoints, 'dms', polygon.name)
        await copyToClipboard(text)
        break
      }
      case 'copy-waypoints-decimal-csv': {
        const polygonWaypoints = waypoints.filter(wp => wp.polygonId === polygon.id)
        const text = formatWaypointListCSV(polygonWaypoints, 'decimal', polygon.name)
        await copyToClipboard(text)
        break
      }
      case 'copy-waypoints-dms-csv': {
        const polygonWaypoints = waypoints.filter(wp => wp.polygonId === polygon.id)
        const text = formatWaypointListCSV(polygonWaypoints, 'dms', polygon.name)
        await copyToClipboard(text)
        break
      }
      case 'show-vertices':
        setVertexListModal({ polygon })
        break
      default:
        break
    }
  }, [polygonContextMenu, onPolygonDelete, onPolygonEditStart, waypoints])

  // Build context menu items for polygon
  const polygonContextMenuItems = useMemo(() => {
    if (!polygonContextMenu?.polygon) return []
    const polygon = polygonContextMenu.polygon
    
    // Get waypoints for this polygon
    const polygonWaypoints = waypoints.filter(wp => wp.polygonId === polygon.id)
    
    const items = [
      { id: 'header', type: 'header', label: `【${polygon.name}】` }
    ]
    
    // Add waypoint list if available
    if (polygonWaypoints.length > 0) {
      const waypointListDecimal = polygonWaypoints
        .map(wp => `WP${wp.index}: ${formatDecimalCoordinate(wp.lat, wp.lng)}`)
        .join('\n')
      
      items.push({
        id: 'info-waypoints',
        type: 'info',
        label: `Waypoint一覧 (${polygonWaypoints.length}個)`,
        content: <pre style={{ fontSize: '12px', lineHeight: '1.5' }}>{waypointListDecimal}</pre>
      })
    }
    
    // Add area if available
    const area = turf.area(polygon.geometry)
    if (area) {
      items.push({
        id: 'info-area',
        type: 'info',
        label: '面積',
        content: `${area.toFixed(2)} m²`
      })
    }
    
    // Add creation date if available
    if (polygon.createdAt) {
      items.push({
        id: 'info-created',
        type: 'info',
        label: '作成日時',
        content: formatDateToJST(polygon.createdAt)
      })
    }
    
    items.push({ id: 'divider1', divider: true })
    
    // Add copy actions if waypoints exist
    if (polygonWaypoints.length > 0) {
      items.push(
        { id: 'show-vertices', icon: '📍', label: 'Waypoint頂点一覧を表示', action: 'show-vertices' },
        { id: 'copy-waypoints-decimal', icon: '📋', label: 'WP一覧をコピー (decimal)', action: 'copy-waypoints-decimal' },
        { id: 'copy-waypoints-dms', icon: '🌐', label: 'WP一覧をコピー (DMS)', action: 'copy-waypoints-dms' },
        { id: 'copy-waypoints-decimal-csv', icon: '📊', label: 'WP一覧をコピー (CSV decimal)', action: 'copy-waypoints-decimal-csv' },
        { id: 'copy-waypoints-dms-csv', icon: '📊', label: 'WP一覧をコピー (CSV DMS)', action: 'copy-waypoints-dms-csv' },
        { id: 'divider2', divider: true }
      )
    }
    
    items.push(
      { id: 'edit', icon: '✏️', label: '形状を編集', action: 'edit' },
      { id: 'divider3', divider: true },
      { id: 'delete', icon: '🗑️', label: '削除', action: 'delete', danger: true }
    )
    
    return items
  }, [polygonContextMenu, waypoints])

  // Convert polygons to GeoJSON for display (exclude polygon being edited)
  const polygonsGeoJSON = {
    type: 'FeatureCollection',
    features: polygons
      .filter(p => !editingPolygon || p.id !== editingPolygon.id)
      .map(p => ({
        type: 'Feature',
        id: p.id,
        properties: {
          id: p.id,
          name: p.name,
          color: p.color,
          selected: p.id === selectedPolygonId
        },
        geometry: p.geometry
      }))
  }

  const interactiveLayerIds = [
    'polygon-fill',
    'nuclear-plants-fill',
    'prefectures-fill',
    'police-fill',
    'prisons-fill',
    'jsdf-fill',
    'red-zones-fill',
    'yellow-zones-fill'
  ]

  return (
    <div className={styles.mapContainer}>
      <MapGL
        ref={mapRef}
        {...viewState}
        onMove={e => setViewState(e.viewState)}
        onClick={handleClick}
        onDblClick={handleDoubleClick}
        onContextMenu={handlePolygonRightClick}
        onLoad={() => setIsMapReady(true)}
        onMouseDown={selectionHandlers.onMouseDown}
        onMouseMove={(e) => {
          selectionHandlers.onMouseMove(e)
          // Handle polygon hover when not selecting
          if (!isSelecting) {
            handlePolygonHover(e)
          }
        }}
        onMouseUp={selectionHandlers.onMouseUp}
        onMouseLeave={handlePolygonHoverEnd}
        interactiveLayerIds={interactiveLayerIds}
        mapStyle={currentMapStyle}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
        doubleClickZoom={false}
        maxZoom={20}
        dragPan={!isSelecting}
        touchZoomRotate={true}
        touchPitch={true}
      >
        {/* ナビゲーションコントロール - 右下固定 */}
        <NavigationControl position="bottom-right" visualizePitch={true} />
        <ScaleControl position="bottom-left" unit="metric" />
        <AttributionControl position="bottom-left" />

        <DrawControl
          position="top-left"
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onEditComplete={onPolygonEditComplete}
          active={drawMode}
          editingPolygon={editingPolygon}
        />

        {/* Airspace Layers (managed by LayerManager) */}
        <LayerManager
          layerConfigs={airspaceLayerConfigs}
          layerVisibility={layerVisibility}
          state={{
            isAirportOverlayEnabled,
            restrictionSurfacesData
          }}
        />

        {/* 制限表面 (航空法に基づく空港周辺の制限表面) */}
        {isAirportOverlayEnabled && restrictionSurfacesData && (
          <Source id="restriction-surfaces" type="geojson" data={restrictionSurfacesData}>
            <Layer
              id="restriction-surfaces-fill"
              type="fill"
              paint={{
                'fill-color': [
                  'coalesce',
                  ['get', '__fill_color'],
                  RESTRICTION_SURFACE_STYLES.other.fillColor
                ],
                'fill-opacity': [
                  'coalesce',
                  ['get', '__fill_opacity'],
                  RESTRICTION_SURFACE_STYLES.other.fillOpacity
                ]
              }}
            />
            <Layer
              id="restriction-surfaces-outline"
              type="line"
              paint={{
                'line-color': [
                  'coalesce',
                  ['get', '__line_color'],
                  RESTRICTION_SURFACE_STYLES.other.lineColor
                ],
                'line-width': [
                  'coalesce',
                  ['get', '__line_width'],
                  RESTRICTION_SURFACE_STYLES.other.lineWidth
                ]
              }}
            />
            <Layer
              id="restriction-surfaces-label"
              type="symbol"
              minzoom={10}
              layout={{
                'text-field': ['coalesce', ['get', '__surface_label'], ['get', 'name']],
                'text-size': 10,
                'text-anchor': 'center'
              }}
              paint={{
                'text-color': '#4A148C',
                'text-halo-color': '#fff',
                'text-halo-width': 1
              }}
            />
          </Source>
        )}

        {/* DID (人口集中地区) raster tiles */}
        {layerVisibility.showDID && (
          <Source id="did-tiles" {...didTileSource}>
            <Layer
              id="did-layer"
              type="raster"
              paint={{
                'raster-opacity': 0.6
              }}
            />
          </Source>
        )}

        {/* GeoJSONレイヤー（データ駆動でレンダリング） */}
        {geoJsonLayerConfigs.map(config => config.show && (
          <Source key={config.id} id={config.id} type="geojson" data={config.data}>
            {/* Fill layer */}
            <Layer
              id={`${config.id}-fill`}
              type="fill"
              paint={{
                'fill-color': config.fillColor,
                'fill-opacity': config.fillOpacity
              }}
            />
            {/* Outline layer */}
            <Layer
              id={`${config.id}-outline`}
              type="line"
              paint={{
                'line-color': config.lineColor,
                'line-width': config.lineWidth,
                ...(config.lineDasharray && { 'line-dasharray': config.lineDasharray })
              }}
            />
            {/* Label layer */}
            <Layer
              id={`${config.id}-label`}
              type="symbol"
              layout={{
                'text-field': config.labelField || ['get', 'name'],
                'text-size': config.labelSize,
                'text-anchor': 'center'
              }}
              paint={{
                'text-color': config.labelColor,
                'text-halo-color': '#fff',
                'text-halo-width': 1
              }}
            />
          </Source>
        ))}

        {/* 地物レイヤー */}
        {layerVisibility.showGeoFeatures && (
          <Source id="geo-features" {...geoFeaturesSourceConfig}>
            <Layer
              id="geo-features-layer"
              type="raster"
              paint={{
                'raster-opacity': 0.7
              }}
            />
          </Source>
        )}

        {/* 雨雲レーダー */}
        {layerVisibility.showRainCloud && rainCloudSource && (
          <Source id="rain-cloud" {...rainCloudSource}>
            <Layer
              id="rain-cloud-layer"
              type="raster"
              paint={{
                'raster-opacity': 0.6
              }}
            />
          </Source>
        )}

        {/* 風向・風量 */}
        {layerVisibility.showWind && windSource && (
          <Source id="wind-layer" {...windSource}>
            <Layer
              id="wind-layer-display"
              type="raster"
              paint={{
                'raster-opacity': 0.5
              }}
            />
          </Source>
        )}

        {/* Optimization overlay - recommended positions */}
        {optimizationOverlayGeoJSON && (
          <Source id="optimization-overlay" type="geojson" data={optimizationOverlayGeoJSON}>
            {/* Lines from current to recommended position */}
            <Layer
              id="optimization-lines"
              type="line"
              filter={['==', ['get', 'type'], 'optimization-line']}
              paint={{
                'line-color': '#10b981',
                'line-width': 3,
                'line-dasharray': [3, 2]
              }}
            />
            {/* Recommended position circles */}
            <Layer
              id="optimization-points"
              type="circle"
              filter={['==', ['get', 'type'], 'recommended-point']}
              paint={{
                'circle-radius': 10,
                'circle-color': '#10b981',
                'circle-stroke-color': '#ffffff',
                'circle-stroke-width': 2,
                'circle-opacity': 0.8
              }}
            />
            {/* Labels for recommended positions */}
            <Layer
              id="optimization-labels"
              type="symbol"
              filter={['==', ['get', 'type'], 'recommended-point']}
              layout={{
                'text-field': '推奨',
                'text-size': 10,
                'text-offset': [0, 1.5]
              }}
              paint={{
                'text-color': '#059669',
                'text-halo-color': '#ffffff',
                'text-halo-width': 1
              }}
            />
            {/* Zone warning circles - color based on warningType */}
            <Layer
              id="zone-warning-points"
              type="circle"
              filter={['==', ['get', 'type'], 'zone-warning-point']}
              paint={{
                'circle-radius': 18,
                'circle-color': 'transparent',
                'circle-stroke-color': [
                  'case',
                  ['==', ['get', 'warningType'], 'prohibited'], '#9932CC',
                  ['==', ['get', 'warningType'], 'airport'], '#FF8C00',
                  '#FF4444' // DID - red
                ],
                'circle-stroke-width': 3,
                'circle-opacity': 1
              }}
            />
            {/* Zone warning labels */}
            <Layer
              id="zone-warning-labels"
              type="symbol"
              filter={['==', ['get', 'type'], 'zone-warning-point']}
              layout={{
                'text-field': [
                  'case',
                  ['==', ['get', 'warningType'], 'prohibited'], '禁止',
                  ['==', ['get', 'warningType'], 'airport'], '空港',
                  'DID'
                ],
                'text-size': 9,
                'text-offset': [0, 2.2],
                'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold']
              }}
              paint={{
                'text-color': [
                  'case',
                  ['==', ['get', 'warningType'], 'prohibited'], '#9932CC',
                  ['==', ['get', 'warningType'], 'airport'], '#FF8C00',
                  '#FF4444'
                ],
                'text-halo-color': '#000000',
                'text-halo-width': 1
              }}
            />
          </Source>
        )}

        {/* Path collision overlay - intersection points and dangerous segments */}
        {pathCollisionGeoJSON && (
          <Source id="path-collision-overlay" type="geojson" data={pathCollisionGeoJSON}>
            {/* Danger segment lines (both endpoints in same restricted zone) */}
            <Layer
              id="path-collision-segments"
              type="line"
              filter={['==', ['get', 'type'], 'danger-segment']}
              paint={{
                'line-color': ['get', 'color'],
                'line-width': 5,
                'line-opacity': 0.8
              }}
            />
          </Source>
        )}

        {/* Polygon collision overlay - overlap areas with prohibited zones */}
        {polygonCollisionGeoJSON && (
          <Source id="polygon-collision-overlay" type="geojson" data={polygonCollisionGeoJSON}>
            {/* Overlap area fill (red semi-transparent) */}
            <Layer
              id="polygon-collision-fill"
              type="fill"
              filter={['==', ['get', 'type'], 'polygon-overlap']}
              paint={{
                'fill-color': [
                  'case',
                  ['==', ['get', 'severity'], 'DANGER'], '#FF0000',
                  '#FF6600' // WARNING
                ],
                'fill-opacity': 0.4
              }}
            />
            {/* Overlap area outline */}
            <Layer
              id="polygon-collision-outline"
              type="line"
              filter={['==', ['get', 'type'], 'polygon-overlap']}
              paint={{
                'line-color': [
                  'case',
                  ['==', ['get', 'severity'], 'DANGER'], '#FF0000',
                  '#FF6600'
                ],
                'line-width': 3,
                'line-dasharray': [4, 2]
              }}
            />
          </Source>
        )}

        {/* Display saved polygons */}
        <Source id="polygons" type="geojson" data={polygonsGeoJSON}>
          <Layer
            id="polygon-fill"
            type="fill"
            paint={{
              'fill-color': ['get', 'color'],
              'fill-opacity': [
                'case',
                ['get', 'selected'],
                0.5,
                0.3
              ]
            }}
          />
          <Layer
            id="polygon-outline"
            type="line"
            paint={{
              'line-color': ['get', 'color'],
              'line-width': [
                'case',
                ['get', 'selected'],
                3,
                2
              ]
            }}
          />
        </Source>

        {/* Display optimized route lines */}
        {optimizedRouteGeoJSON && (
          <Source id="optimized-route" type="geojson" data={optimizedRouteGeoJSON}>
            <Layer
              id="optimized-route-line"
              type="line"
              paint={{
                'line-color': ['get', 'color'],
                'line-width': 3,
                'line-dasharray': [2, 1],
                'line-opacity': ['case', ['get', 'isReturn'], 0.5, 0.9]
              }}
            />
          </Source>
        )}

        {/* Display home point marker for optimized route (draggable) */}
        {optimizedRoute?.homePoint && (
          <Marker
            latitude={optimizedRoute.homePoint.lat}
            longitude={optimizedRoute.homePoint.lng}
            draggable={!!onHomePointMove}
            onDragEnd={(e) => {
              if (onHomePointMove) {
                onHomePointMove({
                  lat: e.lngLat.lat,
                  lng: e.lngLat.lng
                })
              }
            }}
          >
            <div
              className={`${styles.homeMarker} ${onHomePointMove ? styles.draggable : ''}`}
              title="ホームポイント（離発着地点）- ドラッグで移動可能"
            >
              <span>H</span>
            </div>
          </Marker>
        )}

        {/* Display waypoints as draggable markers (non-interactive during polygon edit) */}
        {waypoints.map((wp) => {
            const isHighlighted = highlightedWaypointIndex === wp.index
            // Check zone violations for this waypoint
            const recommendedWp = recommendedWaypoints?.find(
                (rw) => rw.id === wp.id
            )
            const flags = waypointIssueFlagsById && wp.id ? waypointIssueFlagsById[wp.id] : null
            const didFromIndex =
                !hasDuplicateWaypointIndices &&
                didHighlightedWaypointIndices instanceof Set &&
                didHighlightedWaypointIndices.has(wp.index)
            // DID判定はwaypointIssueFlagsById (ID-based) を優先
            // index-based は重複インデックスがない場合のみフォールバック
            const isInDID =
                (flags?.hasDID || false) ||
                (recommendedWp?.hasDID || false) ||
                didFromIndex
            const isInAirport = (flags?.hasAirport || false) || (recommendedWp?.hasAirport || false)
            const isInProhibited = (flags?.hasProhibited || false) || (recommendedWp?.hasProhibited || false)
            const isInYellowZone = (flags?.hasYellowZone || false) || (recommendedWp?.hasYellowZone || false)

            // Build zone class (priority: prohibited > airport > yellowZone > DID)
            let zoneClass = ''
            let zoneLabel = ''
            if (isInProhibited) {
                zoneClass = styles.inProhibited
                zoneLabel = ' [禁止区域]'
            } else if (isInAirport) {
                zoneClass = styles.inAirport
                zoneLabel = ' [空港制限]'
            } else if (isInYellowZone) {
                zoneClass = styles.inYellowZone
                zoneLabel = ' [注意区域]'
            } else if (isInDID) {
                zoneClass = styles.inDID
                zoneLabel = ' [DID内]'
            }

            // DIDは他の制限（空港/禁止）と併存しうるため、視認性のためリング表示も付与する
            // DIDは「警告のみ」でも「回避」でも点滅させたい（他の警告と独立）
            const didRingClass = isInDID ? styles.didRing : ''
            const multiLabel =
                isInDID && zoneLabel && !zoneLabel.includes('DID')
                    ? `${zoneLabel} [DID内]`
                    : zoneLabel

            return (
                <Marker
                    key={wp.id}
                    latitude={wp.lat}
                    longitude={wp.lng}
                    draggable={!editingPolygon}
                    onDragEnd={(e) => {
                        onWaypointMove?.(wp.id, e.lngLat.lat, e.lngLat.lng)
                    }}
                    onClick={(e) => {
                        if (editingPolygon) return
                        e.originalEvent.stopPropagation()
                        onWaypointClick?.(wp)
                    }}
                >
                    <div
                        className={`${styles.waypointMarker} ${
                            wp.type === 'grid' ? styles.gridMarker : ''
                        } ${
                            selectedWaypointIds.has(wp.id)
                                ? styles.selected
                                : ''
                        } ${
                            isHighlighted ? styles.highlighted : ''
                        } ${zoneClass} ${didRingClass}`}
                        style={
                            editingPolygon
                                ? { pointerEvents: 'none', opacity: 0.5 }
                                : undefined
                        }
                        onContextMenu={(e) => handleWaypointRightClick(e, wp)}
                        onMouseEnter={(e) => handleWaypointHover(e, wp)}
                        onMouseLeave={handleWaypointHoverEnd}
                    >
                        {wp.index}
                    </div>
                </Marker>
            )
        })}
      </MapGL>

      {/* Selection box overlay */}
      {selectionBox && (
        <div
          className={styles.selectionBox}
          style={{
            left: Math.min(selectionBox.startX, selectionBox.endX),
            top: Math.min(selectionBox.startY, selectionBox.endY),
            width: Math.abs(selectionBox.endX - selectionBox.startX),
            height: Math.abs(selectionBox.endY - selectionBox.startY)
          }}
        />
      )}

      {/* Selection info */}
      {selectedWaypointIds.size > 0 && (
        <div className={styles.selectionInfo}>
          {selectedWaypointIds.size} 個選択中 - Delete/Backspaceで削除 / Escでキャンセル
        </div>
      )}

      {/* Map control buttons */}
      <div className={`${styles.mapControls} ${isMobile ? styles.mobileControls : ''} ${mobileControlsExpanded ? styles.expanded : ''} ${isChatOpen ? styles.chatOpen : ''}`}>
        {/* Mobile toggle button */}
        {isMobile && (
          <button
            className={`${styles.toggleButton} ${styles.mobileToggle} ${mobileControlsExpanded ? styles.active : ''}`}
            onClick={() => setMobileControlsExpanded(!mobileControlsExpanded)}
            data-tooltip={mobileControlsExpanded ? '閉じる' : 'コントロール'}
            data-tooltip-pos="left"
          >
            {mobileControlsExpanded ? <X size={18} /> : <Settings2 size={18} />}
          </button>
        )}

        {/* Controls - always visible on desktop, togglable on mobile */}
        <MapControls
          layerVisibility={layerVisibility}
          setLayerVisibility={setLayerVisibility}
          toggleLayer={toggleLayer}
          toggleAirportOverlay={toggleAirportOverlay}
          toggleGroupLayers={toggleGroupLayers}
          toggle3D={toggle3D}
          favoriteGroups={favoriteGroups}
          toggleFavoriteGroup={toggleFavoriteGroup}
          showCrosshair={showCrosshair}
          setShowCrosshair={setShowCrosshair}
          crosshairDesign={crosshairDesign}
          setCrosshairDesign={setCrosshairDesign}
          crosshairColor={crosshairColor}
          setCrosshairColor={setCrosshairColor}
          crosshairClickMode={crosshairClickMode}
          setCrosshairClickMode={setCrosshairClickMode}
          coordinateFormat={coordinateFormat}
          setCoordinateFormat={setCoordinateFormat}
          mapStyleId={mapStyleId}
          setMapStyleId={setMapStyleId}
          isMobile={isMobile}
          mobileControlsExpanded={mobileControlsExpanded}
          showStylePicker={showStylePicker}
          setShowStylePicker={setShowStylePicker}
        />
      </div>

      {/* Instructions overlay */}
      <div className={styles.instructions}>
        {editingPolygon ? (
          <span>編集中: 頂点をドラッグ / 外側クリックで完了 / ESCでキャンセル</span>
        ) : (
          <>
            <span>ポリゴン: クリック=選択</span>
            <span>Waypoint: ドラッグ=移動 / 右クリック=メニュー</span>
          </>
        )}
      </div>

      {/* Waypoint Context Menu */}
      {contextMenu && (
        <ContextMenu
          isOpen={contextMenu.isOpen}
          position={contextMenu.position}
          menuItems={waypointContextMenuItems}
          onClose={() => setContextMenu(null)}
          onAction={handleContextMenuAction}
        />
      )}

      {/* Polygon Context Menu */}
      {polygonContextMenu && (
        <ContextMenu
          isOpen={polygonContextMenu.isOpen}
          position={polygonContextMenu.position}
          menuItems={polygonContextMenuItems}
          onClose={() => setPolygonContextMenu(null)}
          onAction={handlePolygonContextMenuAction}
        />
      )}

      {/* Map Tooltip */}
      {tooltip && (
        <MapTooltip
          isVisible={tooltip.isVisible}
          position={tooltip.position}
          data={tooltip.data}
          type={tooltip.type}
          onClose={() => setTooltip(null)}
        />
      )}

      {/* Focus Crosshair */}
      <FocusCrosshair
        visible={showCrosshair}
        design={crosshairDesign}
        color={crosshairColor}
        size={40}
        onClick={crosshairClickMode ? handleCrosshairClick : undefined}
      />

      {/* Coordinate Display */}
      {coordinateDisplay && (
        <CoordinateDisplay
          lng={coordinateDisplay.lng}
          lat={coordinateDisplay.lat}
          screenX={coordinateDisplay.screenX}
          screenY={coordinateDisplay.screenY}
          darkMode={true}
          onClose={() => setCoordinateDisplay(null)}
          autoFade={true}
          preferredFormat={coordinateFormat}
        />
      )}

      {/* Facility Popup */}
      {facilityPopup && (
        <FacilityPopup
          facility={facilityPopup.facility}
          screenX={facilityPopup.screenX}
          screenY={facilityPopup.screenY}
          onClose={() => setFacilityPopup(null)}
        />
      )}

      {vertexListModal && (
        <VertexListModal
          polygon={vertexListModal.polygon}
          onClose={() => setVertexListModal(null)}
        />
      )}
    </div>
  )
}

export default Map
