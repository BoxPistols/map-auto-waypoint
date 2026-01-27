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
import {
  formatDateToJST,
  formatDMSCoordinate,
  formatDecimalCoordinate,
  formatWaypointList,
  copyToClipboard
} from '../../utils/formatters'
import {
  getAirportZonesGeoJSON,
  getRedZonesGeoJSON,
  getYellowZonesGeoJSON,
  getHeliportsGeoJSON,
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

// レイヤー色定数
const LAYER_COLORS = {
  PREFECTURE: '#ff6600',
  POLICE: '#0066ff',
  PRISON: '#666666',
  JSDF: '#00cc00',
  EMERGENCY_AIRSPACE: '#ef4444',
  REMOTE_ID: '#3b82f6',
  MANNED_AIRCRAFT: '#ec4899',
  RADIO_INTERFERENCE: '#a855f7',
  LTE_COVERAGE: '#10b981',
  FIVE_G_COVERAGE: '#06b6d4',
}

// 地図スタイル定義
const MAP_STYLES = {
  osm: {
    id: 'osm',
    name: 'OpenStreetMap',
    shortName: 'OSM',
    style: {
      version: 8,
      sources: {
        osm: {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '&copy; OpenStreetMap contributors',
          maxzoom: 19
        }
      },
      layers: [
        {
          id: 'osm',
          type: 'raster',
          source: 'osm',
          minzoom: 0,
          maxzoom: 22
        }
      ]
    }
  },
  gsi_std: {
    id: 'gsi_std',
    name: '国土地理院 標準',
    shortName: '標準',
    style: {
      version: 8,
      sources: {
        gsi: {
          type: 'raster',
          tiles: ['https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '&copy; 国土地理院',
          maxzoom: 18
        }
      },
      layers: [
        {
          id: 'gsi',
          type: 'raster',
          source: 'gsi',
          minzoom: 0,
          maxzoom: 22
        }
      ]
    }
  },
  gsi_pale: {
    id: 'gsi_pale',
    name: '国土地理院 淡色',
    shortName: '淡色',
    style: {
      version: 8,
      sources: {
        gsi: {
          type: 'raster',
          tiles: ['https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '&copy; 国土地理院',
          maxzoom: 18
        }
      },
      layers: [
        {
          id: 'gsi',
          type: 'raster',
          source: 'gsi',
          minzoom: 0,
          maxzoom: 22
        }
      ]
    }
  },
  gsi_photo: {
    id: 'gsi_photo',
    name: '国土地理院 航空写真',
    shortName: '航空写真',
    style: {
      version: 8,
      sources: {
        gsi: {
          type: 'raster',
          tiles: ['https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg'],
          tileSize: 256,
          attribution: '&copy; 国土地理院',
          maxzoom: 18
        }
      },
      layers: [
        {
          id: 'gsi',
          type: 'raster',
          source: 'gsi',
          minzoom: 0,
          maxzoom: 22
        }
      ]
    }
  }
}

// デフォルトスタイル（後方互換）
const MAP_STYLE = MAP_STYLES.osm.style

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

  // Selection state for bulk operations
  const [selectionBox, setSelectionBox] = useState(null) // {startX, startY, endX, endY}
  const [selectedWaypointIds, setSelectedWaypointIds] = useState(new Set())
  const [isSelecting, setIsSelecting] = useState(false)
  const lastRestrictionSurfaceKey = useRef(null)

  // Context menu state for right-click
  const [contextMenu, setContextMenu] = useState(null) // { isOpen, position, waypoint }
  const [polygonContextMenu, setPolygonContextMenu] = useState(null) // { isOpen, position, polygon }
  const [vertexListModal, setVertexListModal] = useState(null) // { polygon }

  // Tooltip state for hover
  const [tooltip, setTooltip] = useState(null) // { isVisible, position, data, type }
  const hoverTimeoutRef = useRef(null)
  const [isWaypointHovering, setIsWaypointHovering] = useState(false)

  // 施設ポップアップ状態
  const [facilityPopup, setFacilityPopup] = useState(null) // { facility, screenX, screenY }

  // Load map settings from localStorage (must be before viewState init)
  const initialSettings = useMemo(() => loadMapSettings(), [])
  const initialAirportOverlay = Boolean(
    initialSettings.showAirportZones || initialSettings.showRestrictionSurfaces
  )
  const [isMapReady, setIsMapReady] = useState(false)

  // Focus crosshair state
  const [showCrosshair, setShowCrosshair] = useState(initialSettings.showCrosshair ?? false)

  // Coordinate display state
  const [coordinateDisplay, setCoordinateDisplay] = useState(null) // { lng, lat, screenX, screenY }

  const [viewState, setViewState] = useState({
    latitude: center.lat,
    longitude: center.lng,
    zoom: zoom,
    pitch: initialSettings.is3D ? 60 : 0,
    bearing: 0
  })

  // レイヤー表示状態を単一オブジェクトで管理
  const [layerVisibility, setLayerVisibility] = useState({
    is3D: initialSettings.is3D,
    showAirportZones: initialAirportOverlay,
    showRestrictionSurfaces: initialAirportOverlay,
    showRedZones: initialSettings.showRedZones ?? false,
    showYellowZones: initialSettings.showYellowZones ?? false,
    showHeliports: initialSettings.showHeliports ?? false,
    showDID: initialSettings.showDID,
    showEmergencyAirspace: initialSettings.showEmergencyAirspace ?? false,
    showRemoteIdZones: initialSettings.showRemoteIdZones ?? false,
    showMannedAircraftZones: initialSettings.showMannedAircraftZones ?? false,
    showGeoFeatures: initialSettings.showGeoFeatures ?? false,
    showRainCloud: initialSettings.showRainCloud ?? false,
    showWind: initialSettings.showWind ?? false,
    showRadioZones: initialSettings.showRadioZones ?? false,
    showNetworkCoverage: initialSettings.showNetworkCoverage ?? false,
    // 新しい禁止区域カテゴリー
    showNuclearPlants: initialSettings.showNuclearPlants ?? false,
    showPrefectures: initialSettings.showPrefectures ?? false,
    showPolice: initialSettings.showPolice ?? false,
    showPrisons: initialSettings.showPrisons ?? false,
    showJSDF: initialSettings.showJSDF ?? false
  })

  const [rainCloudSource, setRainCloudSource] = useState(null)
  const [windSource, setWindSource] = useState(null)
  const [restrictionSurfacesData, setRestrictionSurfacesData] = useState(null)
  const [mapStyleId, setMapStyleId] = useState(initialSettings.mapStyleId || 'osm')
  const [showStylePicker, setShowStylePicker] = useState(false)
  const [mobileControlsExpanded, setMobileControlsExpanded] = useState(false)

  // お気に入りグループの状態管理
  const [favoriteGroups, setFavoriteGroups] = useState(() => {
    const stored = localStorage.getItem('favoriteLayerGroups')
    return stored ? new Set(JSON.parse(stored)) : new Set()
  })

  // お気に入り状態をlocalStorageに保存
  useEffect(() => {
    localStorage.setItem('favoriteLayerGroups', JSON.stringify(Array.from(favoriteGroups)))
  }, [favoriteGroups])
  const hasDuplicateWaypointIndices = useMemo(() => {
    const seen = new Set()
    for (const wp of waypoints) {
      if (seen.has(wp.index)) return true
      seen.add(wp.index)
    }
    return false
  }, [waypoints])

  // レイヤー表示状態を更新するヘルパー関数
  const toggleLayer = useCallback((layerKey) => {
    setLayerVisibility(prev => ({
      ...prev,
      [layerKey]: !prev[layerKey]
    }))
  }, [])
  const toggleAirportOverlay = useCallback(() => {
    setLayerVisibility(prev => {
      const nextValue = !(prev.showAirportZones || prev.showRestrictionSurfaces)
      return {
        ...prev,
        showAirportZones: nextValue,
        showRestrictionSurfaces: nextValue
      }
    })
  }, [])

  // グループ全体のトグル機能
  const toggleGroupLayers = useCallback((layerKeys, enabled) => {
    setLayerVisibility(prev => {
      const updates = {}
      layerKeys.forEach(key => {
        updates[key] = enabled
      })
      return { ...prev, ...updates }
    })
  }, [])

  // お気に入りグループのトグル機能
  const toggleFavoriteGroup = useCallback((groupId) => {
    setFavoriteGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }, [])

  // isMobile is now passed as a prop from App.jsx to avoid duplication

  // 現在の地図スタイル
  const currentMapStyle = MAP_STYLES[mapStyleId]?.style || MAP_STYLES.osm.style

  // Save map settings when they change
  useEffect(() => {
    saveMapSettings({
      ...layerVisibility,
      showCrosshair,
      mapStyleId
    })
  }, [layerVisibility, showCrosshair, mapStyleId])

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

  // Memoize airspace GeoJSON data
  const airportZonesGeoJSON = useMemo(() => getAirportZonesGeoJSON(), [])
  const redZonesGeoJSON = useMemo(() => getRedZonesGeoJSON(), [])
  const yellowZonesGeoJSON = useMemo(() => getYellowZonesGeoJSON(), [])
  const heliportsGeoJSON = useMemo(() => getHeliportsGeoJSON(), [])
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
  }, [])

  // Keyboard shortcuts for map controls
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
  }, [toggle3D, toggleLayer, toggleAirportOverlay, mapStyleId])

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

    if (facilityFeature) {
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
        setPolygonContextMenu({
          isOpen: true,
          position: { x: e.point.x, y: e.point.y },
          polygon
        })
      }
    }
  }, [polygons])

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

    // Don't show tooltip if context menu is open
    if (contextMenu?.isOpen || polygonContextMenu?.isOpen) {
      return
    }

    // Mark waypoint as hovering (to prevent polygon hover from triggering)
    setIsWaypointHovering(true)

    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }

    // Set tooltip with a slight delay
    hoverTimeoutRef.current = setTimeout(() => {
      setTooltip({
        isVisible: true,
        position: { x: e.clientX, y: e.clientY },
        data: { ...wp, airspaceRestrictions: getWaypointAirspaceRestrictions(wp) },
        type: 'waypoint'
      })
    }, 300)
  }, [contextMenu, polygonContextMenu, getWaypointAirspaceRestrictions])

  // Handle waypoint hover end - hide tooltip
  const handleWaypointHoverEnd = useCallback(() => {
    setIsWaypointHovering(false)
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    setTooltip(null)
  }, [])

  // Handle polygon hover - show tooltip
  const handlePolygonHover = useCallback((e) => {
    if (!mapRef.current) return

    // Don't show tooltip if context menu is open or waypoint is hovering
    if (contextMenu?.isOpen || polygonContextMenu?.isOpen || isWaypointHovering) {
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

        // Calculate screen position for tooltip
        const screenX = e.originalEvent?.clientX || point.x
        const screenY = e.originalEvent?.clientY || point.y

        hoverTimeoutRef.current = setTimeout(() => {
          setTooltip({
            isVisible: true,
            position: { x: screenX, y: screenY },
            data: {
              ...polygon,
              area,
              waypointCount
            },
            type: 'polygon'
          })
        }, 300)
      }
    } else {
      // No polygon under cursor, clear tooltip
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
        hoverTimeoutRef.current = null
      }
      setTooltip(null)
    }
  }, [polygons, waypoints, contextMenu, polygonContextMenu, isWaypointHovering])

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
      case 'select':
        if (onPolygonSelect) {
          onPolygonSelect(polygon.id)
        }
        break
      case 'edit':
        if (onPolygonEditStart) {
          onPolygonEditStart(polygon)
        }
        break
      case 'copy-waypoints-decimal': {
        const polygonWaypoints = waypoints.filter(wp => wp.polygonId === polygon.id)
        const text = formatWaypointList(polygonWaypoints, 'decimal')
        await copyToClipboard(text)
        break
      }
      case 'copy-waypoints-dms': {
        const polygonWaypoints = waypoints.filter(wp => wp.polygonId === polygon.id)
        const text = formatWaypointList(polygonWaypoints, 'dms')
        await copyToClipboard(text)
        break
      }
      case 'show-vertices':
        setVertexListModal({ polygon })
        break
      default:
        break
    }
  }, [polygonContextMenu, onPolygonDelete, onPolygonSelect, onPolygonEditStart, waypoints])

  // Build context menu items for polygon
  const polygonContextMenuItems = useMemo(() => {
    if (!polygonContextMenu?.polygon) return []
    const polygon = polygonContextMenu.polygon
    
    // Get waypoints for this polygon
    const polygonWaypoints = waypoints.filter(wp => wp.polygonId === polygon.id)
    
    const items = [
      { id: 'header', type: 'header', label: polygon.name }
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
        { id: 'divider2', divider: true }
      )
    }
    
    items.push(
      { id: 'select', icon: '👆', label: '選択', action: 'select' },
      { id: 'edit', icon: '✏️', label: '形状を編集', action: 'edit' },
      { id: 'divider3', divider: true },
      { id: 'delete', icon: '🗑️', label: '削除', action: 'delete', danger: true }
    )
    
    return items
  }, [polygonContextMenu, waypoints])

  // Handle selection box for bulk waypoint operations
  const handleSelectionStart = useCallback((e) => {
    if (!e.originalEvent.shiftKey || drawMode || editingPolygon) return

    setIsSelecting(true)
    const rect = e.target.getCanvas().getBoundingClientRect()
    const x = e.originalEvent.clientX - rect.left
    const y = e.originalEvent.clientY - rect.top
    setSelectionBox({ startX: x, startY: y, endX: x, endY: y })
    setSelectedWaypointIds(new Set())
  }, [drawMode, editingPolygon])

  const handleSelectionMove = useCallback((e) => {
    if (!selectionBox) return

    const rect = e.target.getCanvas().getBoundingClientRect()
    const x = e.originalEvent.clientX - rect.left
    const y = e.originalEvent.clientY - rect.top
    setSelectionBox(prev => prev ? { ...prev, endX: x, endY: y } : null)
  }, [selectionBox])

  const handleSelectionEnd = useCallback(() => {
    if (!selectionBox || !mapRef.current) {
      setIsSelecting(false)
      setSelectionBox(null)
      return
    }

    // Calculate selection bounds
    const map = mapRef.current.getMap()
    const minX = Math.min(selectionBox.startX, selectionBox.endX)
    const maxX = Math.max(selectionBox.startX, selectionBox.endX)
    const minY = Math.min(selectionBox.startY, selectionBox.endY)
    const maxY = Math.max(selectionBox.startY, selectionBox.endY)

    // Find waypoints within selection
    const selected = new Set()
    waypoints.forEach(wp => {
      const point = map.project([wp.lng, wp.lat])
      if (point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY) {
        selected.add(wp.id)
      }
    })

    setSelectedWaypointIds(selected)
    setIsSelecting(false)
    setSelectionBox(null)
  }, [selectionBox, waypoints])

  // Handle keyboard for bulk delete
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedWaypointIds.size > 0) {
        e.preventDefault()
        if (confirm(`選択した ${selectedWaypointIds.size} 個のWaypointを削除しますか?`)) {
          onWaypointsBulkDelete?.(Array.from(selectedWaypointIds))
          setSelectedWaypointIds(new Set())
        }
      }
      // Escape to clear selection
      if (e.key === 'Escape') {
        setSelectedWaypointIds(new Set())
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedWaypointIds, onWaypointsBulkDelete])

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
        onMouseDown={handleSelectionStart}
        onMouseMove={(e) => {
          handleSelectionMove(e)
          // Handle polygon hover when not selecting
          if (!isSelecting) {
            handlePolygonHover(e)
          }
        }}
        onMouseUp={handleSelectionEnd}
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

        {/* Airport restriction zones */}
        {isAirportOverlayEnabled && !restrictionSurfacesData && (
          <Source id="airport-zones" type="geojson" data={airportZonesGeoJSON}>
            <Layer
              id="airport-zones-fill"
              type="fill"
              paint={{
                'fill-color': '#7B1FA2',
                'fill-opacity': 0.15
              }}
            />
            <Layer
              id="airport-zones-outline"
              type="line"
              paint={{
                'line-color': '#6A1B9A',
                'line-width': 2,
                'line-dasharray': [4, 2]
              }}
            />
            <Layer
              id="airport-zones-label"
              type="symbol"
              layout={{
                'text-field': ['get', 'name'],
                'text-size': 11,
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

        {/* レッドゾーン（国の重要施設・原発・米軍基地） */}
        {layerVisibility.showRedZones && (
          <Source id="red-zones" type="geojson" data={redZonesGeoJSON}>
            <Layer
              id="red-zones-fill"
              type="fill"
              paint={{
                'fill-color': '#dc2626',
                'fill-opacity': 0.35
              }}
            />
            <Layer
              id="red-zones-outline"
              type="line"
              paint={{
                'line-color': '#dc2626',
                'line-width': 2
              }}
            />
            <Layer
              id="red-zones-label"
              type="symbol"
              layout={{
                'text-field': ['get', 'name'],
                'text-size': 10,
                'text-anchor': 'center'
              }}
              paint={{
                'text-color': '#991b1b',
                'text-halo-color': '#fff',
                'text-halo-width': 1
              }}
            />
          </Source>
        )}

        {/* イエローゾーン（外国公館・政党本部） */}
        {layerVisibility.showYellowZones && (
          <Source id="yellow-zones" type="geojson" data={yellowZonesGeoJSON}>
            <Layer
              id="yellow-zones-fill"
              type="fill"
              paint={{
                'fill-color': '#eab308',
                'fill-opacity': 0.35
              }}
            />
            <Layer
              id="yellow-zones-outline"
              type="line"
              paint={{
                'line-color': '#ca8a04',
                'line-width': 2
              }}
            />
            <Layer
              id="yellow-zones-label"
              type="symbol"
              layout={{
                'text-field': ['get', 'name'],
                'text-size': 10,
                'text-anchor': 'center'
              }}
              paint={{
                'text-color': '#854d0e',
                'text-halo-color': '#fff',
                'text-halo-width': 1
              }}
            />
          </Source>
        )}

        {/* ヘリポート */}
        {layerVisibility.showHeliports && (
          <Source id="heliports" type="geojson" data={heliportsGeoJSON}>
            <Layer
              id="heliports-fill"
              type="fill"
              paint={{
                'fill-color': '#3b82f6',
                'fill-opacity': 0.25
              }}
            />
            <Layer
              id="heliports-outline"
              type="line"
              paint={{
                'line-color': '#2563eb',
                'line-width': 2,
                'line-dasharray': [3, 2]
              }}
            />
            <Layer
              id="heliports-label"
              type="symbol"
              layout={{
                'text-field': ['get', 'name'],
                'text-size': 10,
                'text-anchor': 'center'
              }}
              paint={{
                'text-color': '#1d4ed8',
                'text-halo-color': '#fff',
                'text-halo-width': 1
              }}
            />
          </Source>
        )}

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

            // Debug: 全ウェイポイントの判定結果を確認（開発時のみ）
            if (import.meta.env.DEV && (isInDID || isInAirport || isInProhibited)) {
                console.log(
                    `[Map] WP${wp.index} (${wp.lat.toFixed(6)}, ${wp.lng.toFixed(6)}):`,
                    {
                        flags: flags,
                        isInDID,
                        isInAirport,
                        isInProhibited,
                        didFromIndex,
                        waypointId: wp.id
                    }
                )
            }

            // Build zone class (priority: prohibited > airport > DID)
            let zoneClass = ''
            let zoneLabel = ''
            if (isInProhibited) {
                zoneClass = styles.inProhibited
                zoneLabel = ' [禁止区域]'
            } else if (isInAirport) {
                zoneClass = styles.inAirport
                zoneLabel = ' [空港制限]'
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
        <div className={`${styles.controlsGroup} ${isMobile && !mobileControlsExpanded ? styles.hidden : ''}`}>
          {/* ALL - 飛行制限レイヤー一括制御 */}
          <ControlGroup
            id="all-layers"
            icon={<Layers size={18} />}
            label="ALL"
            tooltip="飛行制限レイヤーを一括ON/OFF"
            defaultExpanded={false}
            groupToggle={true}
            groupEnabled={
              layerVisibility.showDID ||
              layerVisibility.showRedZones ||
              layerVisibility.showYellowZones ||
              layerVisibility.showNuclearPlants ||
              layerVisibility.showPrefectures ||
              layerVisibility.showPolice ||
              layerVisibility.showPrisons ||
              layerVisibility.showJSDF ||
              layerVisibility.showAirportZones ||
              layerVisibility.showRestrictionSurfaces ||
              layerVisibility.showHeliports ||
              layerVisibility.showEmergencyAirspace ||
              layerVisibility.showRemoteIdZones ||
              layerVisibility.showMannedAircraftZones
            }
            indeterminate={
              (() => {
                const allLayers = [
                  layerVisibility.showDID,
                  layerVisibility.showRedZones,
                  layerVisibility.showYellowZones,
                  layerVisibility.showNuclearPlants,
                  layerVisibility.showPrefectures,
                  layerVisibility.showPolice,
                  layerVisibility.showPrisons,
                  layerVisibility.showJSDF,
                  layerVisibility.showAirportZones,
                  layerVisibility.showRestrictionSurfaces,
                  layerVisibility.showHeliports,
                  layerVisibility.showEmergencyAirspace,
                  layerVisibility.showRemoteIdZones,
                  layerVisibility.showMannedAircraftZones
                ]
                const anyEnabled = allLayers.some(v => v)
                const allEnabled = allLayers.every(v => v)
                return anyEnabled && !allEnabled
              })()
            }
            onGroupToggle={(enabled) => {
              const updates = {
                showDID: enabled,
                showRedZones: enabled,
                showYellowZones: enabled,
                showNuclearPlants: enabled,
                showPrefectures: enabled,
                showPolice: enabled,
                showPrisons: enabled,
                showJSDF: enabled,
                showHeliports: enabled,
                showEmergencyAirspace: enabled,
                showRemoteIdZones: enabled,
                showMannedAircraftZones: enabled
              }
              if (enabled) {
                updates.showAirportZones = true
                updates.showRestrictionSurfaces = true
              } else {
                updates.showAirportZones = false
                updates.showRestrictionSurfaces = false
              }
              setLayerVisibility(prev => ({ ...prev, ...updates }))
            }}
            favoritable={true}
            isFavorite={favoriteGroups.has('all')}
            onFavoriteToggle={() => toggleFavoriteGroup('all')}
          />

          {/* DID（人口密集地 - 禁止区域） */}
          <ControlGroup
            id="did"
            icon={<Users size={18} />}
            label="DID"
            tooltip="国勢調査に基づく人口密集地 - 許可なし飛行禁止 [D]"
            defaultExpanded={false}
            groupToggle={true}
            groupEnabled={layerVisibility.showDID}
            onGroupToggle={(_enabled) => toggleLayer('showDID')}
            favoritable={true}
            isFavorite={favoriteGroups.has('did')}
            onFavoriteToggle={() => toggleFavoriteGroup('did')}
          />

          {/* グループ1: 禁止区域 */}
          <ControlGroup
            id="restricted"
            icon={<ShieldAlert size={18} />}
            label="禁止区域"
            tooltip="飛行禁止・制限区域の各種施設"
            defaultExpanded={false}
            groupToggle={true}
            groupEnabled={
              layerVisibility.showRedZones ||
              layerVisibility.showYellowZones ||
              layerVisibility.showNuclearPlants ||
              layerVisibility.showPrefectures ||
              layerVisibility.showPolice ||
              layerVisibility.showPrisons ||
              layerVisibility.showJSDF
            }
            indeterminate={
              (() => {
                const layers = [
                  layerVisibility.showRedZones,
                  layerVisibility.showYellowZones,
                  layerVisibility.showNuclearPlants,
                  layerVisibility.showPrefectures,
                  layerVisibility.showPolice,
                  layerVisibility.showPrisons,
                  layerVisibility.showJSDF
                ]
                const anyEnabled = layers.some(v => v)
                const allEnabled = layers.every(v => v)
                return anyEnabled && !allEnabled
              })()
            }
            onGroupToggle={(enabled) => {
              toggleGroupLayers([
                'showRedZones',
                'showYellowZones',
                'showNuclearPlants',
                'showPrefectures',
                'showPolice',
                'showPrisons',
                'showJSDF'
              ], enabled)
            }}
            favoritable={true}
            isFavorite={favoriteGroups.has('restricted')}
            onFavoriteToggle={() => toggleFavoriteGroup('restricted')}
          >
            <button
              className={`${styles.toggleButton} ${layerVisibility.showRedZones ? styles.activeRed : ''}`}
              onClick={() => toggleLayer('showRedZones')}
              data-tooltip="政府機関・原発など飛行禁止区域 [R]"
              data-tooltip-pos="left"
            >
              <ShieldAlert size={18} />
              <span className={styles.buttonLabel}>レッドゾーン</span>
            </button>
            <button
              className={`${styles.toggleButton} ${layerVisibility.showYellowZones ? styles.activeYellow : ''}`}
              onClick={() => toggleLayer('showYellowZones')}
              data-tooltip="重要施設周辺の要事前調整区域 [Y]"
              data-tooltip-pos="left"
            >
              <Building2 size={18} />
              <span className={styles.buttonLabel}>イエローゾーン</span>
            </button>
            <button
              className={`${styles.toggleButton} ${layerVisibility.showNuclearPlants ? styles.activeNuclear : ''}`}
              onClick={() => toggleLayer('showNuclearPlants')}
              data-tooltip="原発施設の位置と稼働状況 [Q]"
              data-tooltip-pos="left"
            >
              <Zap size={18} />
              <span className={styles.buttonLabel}>原発</span>
            </button>
            <button
              className={`${styles.toggleButton} ${layerVisibility.showPrefectures ? styles.activePrefecture : ''}`}
              onClick={() => toggleLayer('showPrefectures')}
              data-tooltip="都道府県庁舎の位置 [p]"
              data-tooltip-pos="left"
            >
              <Building size={18} />
              <span className={styles.buttonLabel}>県庁</span>
            </button>
            <button
              className={`${styles.toggleButton} ${layerVisibility.showPolice ? styles.activePolice : ''}`}
              onClick={() => toggleLayer('showPolice')}
              data-tooltip="警察本部・警察署の位置 [K]"
              data-tooltip-pos="left"
            >
              <Shield size={18} />
              <span className={styles.buttonLabel}>警察</span>
            </button>
            <button
              className={`${styles.toggleButton} ${layerVisibility.showPrisons ? styles.activePrison : ''}`}
              onClick={() => toggleLayer('showPrisons')}
              data-tooltip="矯正施設の位置 [J]"
              data-tooltip-pos="left"
            >
              <Lock size={18} />
              <span className={styles.buttonLabel}>刑務所</span>
            </button>
            <button
              className={`${styles.toggleButton} ${layerVisibility.showJSDF ? styles.activeJSDF : ''}`}
              onClick={() => toggleLayer('showJSDF')}
              data-tooltip="自衛隊基地・駐屯地の位置 [B]"
              data-tooltip-pos="left"
            >
              <Target size={18} />
              <span className={styles.buttonLabel}>自衛隊</span>
            </button>
          </ControlGroup>

          {/* グループ2: 航空制限 */}
          <ControlGroup
            id="aviation"
            icon={<Plane size={18} />}
            label="航空制限"
            tooltip="航空法に基づく飛行制限区域"
            defaultExpanded={false}
            groupToggle={true}
            groupEnabled={
              layerVisibility.showAirportZones ||
              layerVisibility.showHeliports ||
              layerVisibility.showEmergencyAirspace ||
              layerVisibility.showRemoteIdZones ||
              layerVisibility.showMannedAircraftZones
            }
            indeterminate={
              (() => {
                const layers = [
                  layerVisibility.showAirportZones,
                  layerVisibility.showRestrictionSurfaces,
                  layerVisibility.showHeliports,
                  layerVisibility.showEmergencyAirspace,
                  layerVisibility.showRemoteIdZones,
                  layerVisibility.showMannedAircraftZones
                ]
                const anyEnabled = layers.some(v => v)
                const allEnabled = layers.every(v => v)
                return anyEnabled && !allEnabled
              })()
            }
            onGroupToggle={(enabled) => {
              const updates = {
                showHeliports: enabled,
                showEmergencyAirspace: enabled,
                showRemoteIdZones: enabled,
                showMannedAircraftZones: enabled
              }
              if (enabled) {
                updates.showAirportZones = true
                updates.showRestrictionSurfaces = true
              } else {
                updates.showAirportZones = false
                updates.showRestrictionSurfaces = false
              }
              setLayerVisibility(prev => ({ ...prev, ...updates }))
            }}
            favoritable={true}
            isFavorite={favoriteGroups.has('aviation')}
            onFavoriteToggle={() => toggleFavoriteGroup('aviation')}
          >
            <button
              className={`${styles.toggleButton} ${layerVisibility.showAirportZones ? styles.activeAirport : ''}`}
              onClick={toggleAirportOverlay}
              data-tooltip="空港周辺の高度制限区域 [A]"
              data-tooltip-pos="left"
            >
              <Plane size={18} />
              <span className={styles.buttonLabel}>空港</span>
            </button>
            <button
              className={`${styles.toggleButton} ${layerVisibility.showHeliports ? styles.activeHeliport : ''}`}
              onClick={() => toggleLayer('showHeliports')}
              data-tooltip="ヘリポート施設の位置 [H]"
              data-tooltip-pos="left"
            >
              <Landmark size={18} />
              <span className={styles.buttonLabel}>ヘリポート</span>
            </button>
            <button
              className={`${styles.toggleButton} ${layerVisibility.showEmergencyAirspace ? styles.activeEmergency : ''}`}
              onClick={() => toggleLayer('showEmergencyAirspace')}
              data-tooltip="救急・消防ヘリの飛行区域 [E]"
              data-tooltip-pos="left"
            >
              <AlertTriangle size={18} />
              <span className={styles.buttonLabel}>緊急</span>
            </button>
            <button
              className={`${styles.toggleButton} ${layerVisibility.showRemoteIdZones ? styles.activeRemoteId : ''}`}
              onClick={() => toggleLayer('showRemoteIdZones')}
              data-tooltip="リモートID義務化予定区域 [I]"
              data-tooltip-pos="left"
            >
              <Radio size={18} />
              <span className={styles.buttonLabel}>RemoteID</span>
            </button>
            <button
              className={`${styles.toggleButton} ${layerVisibility.showMannedAircraftZones ? styles.activeMannedAircraft : ''}`}
              onClick={() => toggleLayer('showMannedAircraftZones')}
              data-tooltip="有人航空機の離着陸区域 [U]"
              data-tooltip-pos="left"
            >
              <MapPinned size={18} />
              <span className={styles.buttonLabel}>有人機</span>
            </button>
          </ControlGroup>

          {/* グループ3: 環境 */}
          <ControlGroup
            id="environment"
            icon={<CloudRain size={18} />}
            label="環境"
            tooltip="気象・地理情報データレイヤー"
            defaultExpanded={false}
            groupToggle={true}
            groupEnabled={
              layerVisibility.showGeoFeatures ||
              layerVisibility.showRainCloud
            }
            onGroupToggle={(enabled) => {
              toggleGroupLayers([
                'showGeoFeatures',
                'showRainCloud'
              ], enabled)
            }}
            favoritable={true}
            isFavorite={favoriteGroups.has('environment')}
            onFavoriteToggle={() => toggleFavoriteGroup('environment')}
          >
            <button
              className={`${styles.toggleButton} ${layerVisibility.showGeoFeatures ? styles.activeGeoFeatures : ''}`}
              onClick={() => toggleLayer('showGeoFeatures')}
              data-tooltip="建物・道路などの地理情報 [G]"
              data-tooltip-pos="left"
            >
              <MapIcon size={18} />
              <span className={styles.buttonLabel}>地物</span>
            </button>
            <button
              className={`${styles.toggleButton} ${layerVisibility.showRainCloud ? styles.activeRainCloud : ''}`}
              onClick={() => toggleLayer('showRainCloud')}
              data-tooltip="リアルタイム降雨情報 [N]"
              data-tooltip-pos="left"
            >
              <CloudRain size={18} />
              <span className={styles.buttonLabel}>雨雲</span>
            </button>
            <button
              className={`${styles.toggleButton} ${styles.disabled}`}
              onClick={() => {}}
              disabled
              data-tooltip="リアルタイム風況情報 [O] (準備中)"
              data-tooltip-pos="left"
            >
              <Wind size={18} />
              <span className={styles.buttonLabel}>風向・風量</span>
            </button>
          </ControlGroup>

          {/* グループ4: 通信 */}
          <ControlGroup
            id="network"
            icon={<Signal size={18} />}
            label="通信"
            tooltip="電波・通信ネットワーク環境"
            defaultExpanded={false}
            groupToggle={true}
            groupEnabled={
              layerVisibility.showRadioZones ||
              layerVisibility.showNetworkCoverage
            }
            onGroupToggle={(enabled) => {
              toggleGroupLayers([
                'showRadioZones',
                'showNetworkCoverage'
              ], enabled)
            }}
            favoritable={true}
            isFavorite={favoriteGroups.has('network')}
            onFavoriteToggle={() => toggleFavoriteGroup('network')}
          >
            <button
              className={`${styles.toggleButton} ${layerVisibility.showRadioZones ? styles.activeRadioZones : ''}`}
              onClick={() => toggleLayer('showRadioZones')}
              data-tooltip="電波利用に注意が必要な区域 [T]"
              data-tooltip-pos="left"
            >
              <Wifi size={18} />
              <span className={styles.buttonLabel}>電波干渉</span>
            </button>
            <button
              className={`${styles.toggleButton} ${layerVisibility.showNetworkCoverage ? styles.activeNetworkCoverage : ''}`}
              onClick={() => toggleLayer('showNetworkCoverage')}
              data-tooltip="LTE/5G通信可能エリア [L]"
              data-tooltip-pos="left"
            >
              <Signal size={18} />
              <span className={styles.buttonLabel}>通信</span>
            </button>
          </ControlGroup>

          {/* グループ5: Map設定 */}
          <ControlGroup
            id="map-settings"
            icon={<Settings2 size={18} />}
            label="Map設定"
            tooltip="地図表示の各種設定"
            defaultExpanded={false}
            favoritable={true}
            isFavorite={favoriteGroups.has('map-settings')}
            onFavoriteToggle={() => toggleFavoriteGroup('map-settings')}
          >
            <button
              className={`${styles.toggleButton} ${layerVisibility.is3D ? styles.active : ''}`}
              onClick={toggle3D}
              data-tooltip={layerVisibility.is3D ? '地形を平面で表示 [3]' : '地形を立体で表示 [3]'}
              data-tooltip-pos="left"
            >
              {layerVisibility.is3D ? <Box size={18} /> : <Rotate3D size={18} />}
              <span className={styles.buttonLabel}>{layerVisibility.is3D ? '2D' : '3D'}</span>
            </button>
            <button
              className={`${styles.toggleButton} ${showCrosshair ? styles.activeCrosshair : ''}`}
              onClick={() => setShowCrosshair(prev => !prev)}
              data-tooltip="地図中心の十字線を表示 [X]"
              data-tooltip-pos="left"
            >
              <Crosshair size={18} />
              <span className={styles.buttonLabel}>クロスヘア</span>
            </button>

            {/* 地図スタイル切り替え */}
            <div className={styles.stylePickerContainer}>
              <button
                className={`${styles.toggleButton} ${showStylePicker ? styles.active : ''}`}
                onClick={() => setShowStylePicker(!showStylePicker)}
                data-tooltip="地図の表示スタイルを切り替え [M: 次へ / Shift+M: 前へ]"
                data-tooltip-pos="left"
              >
                <Layers size={18} />
                <span className={styles.buttonLabel}>スタイル</span>
              </button>
              {showStylePicker && (
                <div className={styles.stylePicker}>
                  {Object.values(MAP_STYLES).map(styleOption => (
                    <button
                      key={styleOption.id}
                      className={`${styles.styleOption} ${mapStyleId === styleOption.id ? styles.activeStyle : ''}`}
                      onClick={() => {
                        setMapStyleId(styleOption.id)
                        setShowStylePicker(false)
                      }}
                    >
                      <span className={styles.styleIcon}>
                        {styleOption.id === 'gsi_photo' ? <Satellite size={16} /> : <MapIcon size={16} />}
                      </span>
                      <span className={styles.styleName}>{styleOption.shortName}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </ControlGroup>
        </div>
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
          title={contextMenu.waypoint ? `WP #${contextMenu.waypoint.index}` : null}
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
          title={polygonContextMenu.polygon?.name}
        />
      )}

      {/* Map Tooltip */}
      {tooltip && (
        <MapTooltip
          isVisible={tooltip.isVisible}
          position={tooltip.position}
          data={tooltip.data}
          type={tooltip.type}
        />
      )}

      {/* Focus Crosshair */}
      <FocusCrosshair
        visible={showCrosshair}
        design="square"
        color="#e53935"
        size={40}
        onClick={handleCrosshairClick}
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
