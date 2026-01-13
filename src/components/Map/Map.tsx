import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import MapGL, { NavigationControl, ScaleControl, Marker, Source, Layer } from 'react-map-gl/maplibre'
import type { MapRef, MapLayerMouseEvent, MarkerDragEvent } from 'react-map-gl/maplibre'
import { Box, Rotate3D, Plane, ShieldAlert, Users, Map as MapIcon, Layers, Building2, Landmark, Satellite, Settings2, X, AlertTriangle, Radio, MapPinned, CloudRain, Wind, Wifi, ChevronsRight, ChevronsLeft } from 'lucide-react'
import 'maplibre-gl/dist/maplibre-gl.css'
import DrawControl from './DrawControl'
import CustomLayerManager from './CustomLayerManager'
import type { DrawControlRef } from '../../lib/types'

// Import from new lib
import {
  BASE_MAPS,
  LAYER_GROUPS,
  RESTRICTION_COLORS,
  getAirportZonesGeoJSON,
  getRedZonesGeoJSON,
  getYellowZonesGeoJSON,
  getHeliportsGeoJSON,
  getEmergencyAirspaceGeoJSON,
  getRemoteIdZonesGeoJSON,
  getMannedAircraftZonesGeoJSON,
  getRadioInterferenceZonesGeoJSON,
  getGeographicFeaturesSourceConfig,
  getDIDSourceConfig,
  getRainViewerSourceConfig,
  getWindLayerSourceConfig
} from '../../lib'
import type {
  MapProps,
  MapCenter,
  LayerVisibility,
  BaseMapKey,
  PolygonData,
  Waypoint,
  RecommendedWaypoint,
  WaypointIssueFlags,
  OptimizedRoute,
  RasterSourceConfig
} from '../../lib/types'

import { loadMapSettings, saveMapSettings } from '../../utils/storage'
import styles from './Map.module.scss'

// Default center: Tokyo Tower
const DEFAULT_CENTER: MapCenter = { lat: 35.6585805, lng: 139.7454329 }
const DEFAULT_ZOOM = 12

interface ViewState {
  latitude: number
  longitude: number
  zoom: number
  pitch: number
  bearing: number
}

interface SelectionBox {
  startX: number
  startY: number
  endX: number
  endY: number
}

interface GeoJsonLayerConfigItem {
  id: string
  show: boolean
  data: GeoJSON.FeatureCollection
  fillColor: string
  fillOpacity: number
  lineColor: string
  lineWidth: number
  lineDasharray?: number[]
  labelColor: string
  labelSize: number
  labelField?: unknown[]
}

const Map = ({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  polygons = [],
  waypoints = [],
  customLayers = [],
  visibleCustomLayerIds = new Set(),
  recommendedWaypoints = null,
  didHighlightedWaypointIndices = null,
  waypointIssueFlagsById = null,
  highlightedWaypointIndex = null,
  optimizedRoute = null,
  onHomePointMove,
  isMobile = false,
  onPolygonCreate,
  onPolygonUpdate,
  onPolygonDelete,
  onPolygonSelect,
  onPolygonEditComplete,
  onMapClick,
  onWaypointClick,
  onWaypointDelete,
  onWaypointMove,
  onWaypointsBulkDelete,
  onCustomLayerAdded,
  onCustomLayerRemoved,
  onCustomLayerToggle,
  selectedPolygonId,
  editingPolygon = null,
  drawMode = false
}: MapProps) => {
  const mapRef = useRef<MapRef>(null)
  const drawControlRef = useRef<DrawControlRef>(null)

  // Selection state for bulk operations
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null)
  const [selectedWaypointIds, setSelectedWaypointIds] = useState<Set<string>>(new Set())
  const [isSelecting, setIsSelecting] = useState(false)

  // Load map settings from localStorage (must be before viewState init)
  const initialSettings = useMemo(() => loadMapSettings(), [])

  const [viewState, setViewState] = useState<ViewState>({
    latitude: center.lat,
    longitude: center.lng,
    zoom: zoom,
    pitch: initialSettings.is3D ? 60 : 0,
    bearing: 0
  })

  // Layer visibility state
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({
    is3D: initialSettings.is3D,
    showAirportZones: initialSettings.showAirportZones,
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
    showRadioZones: initialSettings.showRadioZones ?? false
  })

  const [rainCloudSource, setRainCloudSource] = useState<RasterSourceConfig | null>(null)
  const [windSource, setWindSource] = useState<RasterSourceConfig | null>(null)
  const [mapStyleId, setMapStyleId] = useState<BaseMapKey>(initialSettings.mapStyleId || 'osm')
  const [showStylePicker, setShowStylePicker] = useState(false)
  const [mobileControlsExpanded, setMobileControlsExpanded] = useState(false)
  
  // Controls expanded state (Label mode)
  const [controlsExpanded, setControlsExpanded] = useState(() => {
    try {
      const saved = localStorage.getItem('map-controls-expanded')
      return saved === 'true'
    } catch {
      return false
    }
  })

  // Toggle controls expanded state
  const toggleControlsExpanded = useCallback(() => {
    setControlsExpanded(prev => {
      const next = !prev
      localStorage.setItem('map-controls-expanded', String(next))
      return next
    })
  }, [])

  // Toggle layer visibility helper
  const toggleLayer = useCallback((layerKey: keyof LayerVisibility) => {
    setLayerVisibility(prev => ({
      ...prev,
      [layerKey]: !prev[layerKey]
    }))
  }, [])

  // Current map style
  const currentMapStyle = BASE_MAPS[mapStyleId]?.style || BASE_MAPS.osm.style

  // Save map settings when they change
  useEffect(() => {
    saveMapSettings({
      ...layerVisibility,
      mapStyleId
    })
  }, [layerVisibility, mapStyleId])

  // Fetch rain cloud source
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
            setRainCloudSource(null)
          }
        })
    } else {
      setRainCloudSource(null)
    }

    return () => {
      isActive = false
    }
  }, [layerVisibility.showRainCloud])

  // Fetch wind source
  useEffect(() => {
    if (layerVisibility.showWind) {
      const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY as string | undefined
      const config = getWindLayerSourceConfig(apiKey || null)
      setWindSource(config)
    } else {
      setWindSource(null)
    }
  }, [layerVisibility.showWind])

  // Sync viewState when center/zoom props change from parent
  useEffect(() => {
    if (center && zoom) {
      setViewState(prev => ({
        ...prev,
        latitude: center.lat,
        longitude: center.lng,
        zoom: zoom
      }))
    }
  }, [center.lat, center.lng, zoom])

  // Memoize airspace GeoJSON data
  const airportZonesGeoJSON = useMemo(() => getAirportZonesGeoJSON(), [])
  const redZonesGeoJSON = useMemo(() => getRedZonesGeoJSON(), [])
  const yellowZonesGeoJSON = useMemo(() => getYellowZonesGeoJSON(), [])
  const heliportsGeoJSON = useMemo(() => getHeliportsGeoJSON(), [])
  const emergencyAirspaceGeoJSON = useMemo(() => getEmergencyAirspaceGeoJSON(), [])
  const remoteIdZonesGeoJSON = useMemo(() => getRemoteIdZonesGeoJSON(), [])
  const mannedAircraftZonesGeoJSON = useMemo(() => getMannedAircraftZonesGeoJSON(), [])
  const radioInterferenceZonesGeoJSON = useMemo(() => getRadioInterferenceZonesGeoJSON(), [])
  const geoFeaturesSourceConfig = useMemo(() => getGeographicFeaturesSourceConfig(), [])

  // GeoJSON layer configs array (data-driven rendering using RESTRICTION_COLORS from config)
  const geoJsonLayerConfigs = useMemo<GeoJsonLayerConfigItem[]>(() => [
    {
      id: 'emergency-airspace',
      show: layerVisibility.showEmergencyAirspace,
      data: emergencyAirspaceGeoJSON,
      fillColor: RESTRICTION_COLORS.emergency,
      fillOpacity: 0.25,
      lineColor: RESTRICTION_COLORS.emergency,
      lineWidth: 2,
      lineDasharray: [5, 3],
      labelColor: RESTRICTION_COLORS.emergency,
      labelSize: 11
    },
    {
      id: 'remote-id-zones',
      show: layerVisibility.showRemoteIdZones,
      data: remoteIdZonesGeoJSON,
      fillColor: RESTRICTION_COLORS.remote_id,
      fillOpacity: 0.15,
      lineColor: RESTRICTION_COLORS.remote_id,
      lineWidth: 2,
      lineDasharray: [4, 4],
      labelColor: RESTRICTION_COLORS.remote_id,
      labelSize: 11
    },
    {
      id: 'manned-aircraft-zones',
      show: layerVisibility.showMannedAircraftZones,
      data: mannedAircraftZonesGeoJSON,
      fillColor: RESTRICTION_COLORS.manned,
      fillOpacity: 0.2,
      lineColor: RESTRICTION_COLORS.manned,
      lineWidth: 2,
      labelColor: RESTRICTION_COLORS.manned,
      labelSize: 10
    },
    {
      id: 'radio-zones',
      show: layerVisibility.showRadioZones,
      data: radioInterferenceZonesGeoJSON,
      fillColor: RESTRICTION_COLORS.radio,
      fillOpacity: 0.2,
      lineColor: RESTRICTION_COLORS.radio,
      lineWidth: 2,
      lineDasharray: [2, 2],
      labelColor: RESTRICTION_COLORS.radio,
      labelSize: 10,
      labelField: ['concat', ['get', 'name'], ' (', ['get', 'frequency'], ')']
    }
  ], [
    layerVisibility.showEmergencyAirspace,
    layerVisibility.showRemoteIdZones,
    layerVisibility.showMannedAircraftZones,
    layerVisibility.showRadioZones,
    emergencyAirspaceGeoJSON,
    remoteIdZonesGeoJSON,
    mannedAircraftZonesGeoJSON,
    radioInterferenceZonesGeoJSON
  ])

  // Memoize optimized route GeoJSON
  const optimizedRouteGeoJSON = useMemo(() => {
    if (!optimizedRoute || !optimizedRoute.flights || optimizedRoute.flights.length === 0) return null

    const features: GeoJSON.Feature[] = []
    const homePoint = optimizedRoute.homePoint
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
      type: 'FeatureCollection' as const,
      features
    }
  }, [optimizedRoute])

  // Memoize optimization overlay GeoJSON
  const optimizationOverlayGeoJSON = useMemo(() => {
    if (!recommendedWaypoints || recommendedWaypoints.length === 0) return null

    const features: GeoJSON.Feature[] = []

    recommendedWaypoints.forEach((rw: RecommendedWaypoint) => {
      let warningType = 'optimization'
      if (rw.hasProhibited) warningType = 'prohibited'
      else if (rw.hasAirport) warningType = 'airport'
      else if (rw.hasDID) warningType = 'did'

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
        const original = waypoints.find(w => w.id === rw.id)
        if (original) {
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
      type: 'FeatureCollection' as const,
      features
    }
  }, [recommendedWaypoints, waypoints])

  // DID tile source configuration
  const didTileSource = useMemo(() => getDIDSourceConfig(), [])

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
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement).isContentEditable
      )
      if (isInputFocused) return
      if (e.ctrlKey || e.metaKey || e.altKey) return

      switch (e.key.toLowerCase()) {
        case 'd':
          e.preventDefault()
          toggleLayer('showDID')
          break
        case 'a':
          e.preventDefault()
          toggleLayer('showAirportZones')
          break
        case 'r':
          e.preventDefault()
          toggleLayer('showRedZones')
          break
        case 'y':
          e.preventDefault()
          toggleLayer('showYellowZones')
          break
        case 'h':
          e.preventDefault()
          toggleLayer('showHeliports')
          break
        case 'm':
          e.preventDefault()
          setShowStylePicker(prev => !prev)
          break
        case '3':
          e.preventDefault()
          toggle3D()
          break
        case 'e':
          e.preventDefault()
          toggleLayer('showEmergencyAirspace')
          break
        case 'i':
          e.preventDefault()
          toggleLayer('showRemoteIdZones')
          break
        case 'u':
          e.preventDefault()
          toggleLayer('showMannedAircraftZones')
          break
        case 'g':
          e.preventDefault()
          toggleLayer('showGeoFeatures')
          break
        case 'n':
          e.preventDefault()
          toggleLayer('showRainCloud')
          break
        case 'o':
          e.preventDefault()
          toggleLayer('showWind')
          break
        case 't':
          e.preventDefault()
          toggleLayer('showRadioZones')
          break
        case ']':
          e.preventDefault()
          toggleControlsExpanded()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggle3D, toggleLayer])

  // Handle map click
  const handleClick = useCallback((e: MapLayerMouseEvent) => {
    const features = e.features || []
    const polygonFeature = features.find(f => f.layer?.id === 'polygon-fill')

    if (polygonFeature) {
      onPolygonSelect?.(polygonFeature.properties?.id as string)
      return
    }

    if (onMapClick && !drawMode) {
      onMapClick({
        lat: e.lngLat.lat,
        lng: e.lngLat.lng
      }, e)
    }
  }, [onMapClick, onPolygonSelect, drawMode])

  // Handle double click on polygon - delete
  const handleDoubleClick = useCallback((e: MapLayerMouseEvent) => {
    const features = e.features || []
    const polygonFeature = features.find(f => f.layer?.id === 'polygon-fill')

    if (polygonFeature && onPolygonDelete) {
      e.preventDefault()
      const polygonId = polygonFeature.properties?.id as string
      const polygon = polygons.find(p => p.id === polygonId)
      if (polygon && confirm(`「${polygon.name}」を削除しますか?`)) {
        onPolygonDelete(polygonId)
      }
    }
  }, [polygons, onPolygonDelete])

  // Handle polygon creation from draw control
  const handleCreate = useCallback((features: GeoJSON.Feature[]) => {
    if (onPolygonCreate && features.length > 0) {
      const feature = features[0]
      const polygon: PolygonData = {
        id: crypto.randomUUID(),
        name: `エリア ${Date.now()}`,
        geometry: feature.geometry as GeoJSON.Polygon,
        createdAt: Date.now(),
        color: '#45B7D1'
      }
      onPolygonCreate(polygon)
    }
  }, [onPolygonCreate])

  const handleUpdate = useCallback((features: GeoJSON.Feature[]) => {
    if (onPolygonUpdate && features.length > 0) {
      onPolygonUpdate(features[0])
    }
  }, [onPolygonUpdate])

  const handleDelete = useCallback((features: GeoJSON.Feature[]) => {
    if (onPolygonDelete && features.length > 0) {
      onPolygonDelete(features[0].id as string)
    }
  }, [onPolygonDelete])

  // Handle waypoint double click - delete
  const handleWaypointDoubleClick = useCallback((e: React.MouseEvent, wp: Waypoint) => {
    e.stopPropagation()
    if (onWaypointDelete && confirm(`Waypoint #${wp.index} を削除しますか?`)) {
      onWaypointDelete(wp.id)
    }
  }, [onWaypointDelete])

  // Handle selection box for bulk waypoint operations
  const handleSelectionStart = useCallback((e: MapLayerMouseEvent) => {
    if (!e.originalEvent.shiftKey || drawMode || editingPolygon) return

    setIsSelecting(true)
    const canvas = (e.target as unknown as { getCanvas: () => HTMLCanvasElement }).getCanvas()
    const rect = canvas.getBoundingClientRect()
    const x = e.originalEvent.clientX - rect.left
    const y = e.originalEvent.clientY - rect.top
    setSelectionBox({ startX: x, startY: y, endX: x, endY: y })
    setSelectedWaypointIds(new Set())
  }, [drawMode, editingPolygon])

  const handleSelectionMove = useCallback((e: MapLayerMouseEvent) => {
    if (!selectionBox) return

    const canvas = (e.target as unknown as { getCanvas: () => HTMLCanvasElement }).getCanvas()
    const rect = canvas.getBoundingClientRect()
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

    const map = mapRef.current.getMap()
    const minX = Math.min(selectionBox.startX, selectionBox.endX)
    const maxX = Math.max(selectionBox.startX, selectionBox.endX)
    const minY = Math.min(selectionBox.startY, selectionBox.endY)
    const maxY = Math.max(selectionBox.startY, selectionBox.endY)

    const selected = new Set<string>()
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
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedWaypointIds.size > 0) {
        e.preventDefault()
        if (confirm(`選択した ${selectedWaypointIds.size} 個のWaypointを削除しますか?`)) {
          onWaypointsBulkDelete?.(Array.from(selectedWaypointIds))
          setSelectedWaypointIds(new Set())
        }
      }
      if (e.key === 'Escape') {
        setSelectedWaypointIds(new Set())
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedWaypointIds, onWaypointsBulkDelete])

  // Convert polygons to GeoJSON for display
  const polygonsGeoJSON: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: polygons
      .filter(p => !editingPolygon || p.id !== editingPolygon.id)
      .map(p => ({
        type: 'Feature' as const,
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

  const interactiveLayerIds = ['polygon-fill']

  return (
    <div className={styles.mapContainer}>
      <MapGL
        ref={mapRef}
        {...viewState}
        onMove={e => setViewState(e.viewState)}
        onClick={handleClick}
        onDblClick={handleDoubleClick}
        onMouseDown={handleSelectionStart}
        onMouseMove={handleSelectionMove}
        onMouseUp={handleSelectionEnd}
        interactiveLayerIds={interactiveLayerIds}
        mapStyle={currentMapStyle}
        style={{ width: '100%', height: '100%' }}
        doubleClickZoom={false}
        maxZoom={20}
        dragPan={!isSelecting}
        touchZoomRotate={true}
        touchPitch={true}
      >
        <NavigationControl position={isMobile ? "bottom-right" : "top-right"} visualizePitch={true} />
        <ScaleControl position="bottom-left" unit="metric" />

        <DrawControl
          ref={drawControlRef}
          position="top-left"
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onEditComplete={onPolygonEditComplete}
          active={drawMode}
          editingPolygon={editingPolygon}
        />

        {/* Airport restriction zones */}
        {layerVisibility.showAirportZones && (
          <Source id="airport-zones" type="geojson" data={airportZonesGeoJSON}>
            <Layer
              id="airport-zones-fill"
              type="fill"
              paint={{
                'fill-color': RESTRICTION_COLORS.airport,
                'fill-opacity': 0.15
              }}
            />
            <Layer
              id="airport-zones-outline"
              type="line"
              paint={{
                'line-color': RESTRICTION_COLORS.airport,
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
                'text-color': RESTRICTION_COLORS.airport,
                'text-halo-color': '#fff',
                'text-halo-width': 1
              }}
            />
          </Source>
        )}

        {/* Red zones */}
        {layerVisibility.showRedZones && (
          <Source id="red-zones" type="geojson" data={redZonesGeoJSON}>
            <Layer
              id="red-zones-fill"
              type="fill"
              paint={{
                'fill-color': RESTRICTION_COLORS.red,
                'fill-opacity': 0.35
              }}
            />
            <Layer
              id="red-zones-outline"
              type="line"
              paint={{
                'line-color': RESTRICTION_COLORS.red,
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
                'text-color': RESTRICTION_COLORS.red,
                'text-halo-color': '#fff',
                'text-halo-width': 1
              }}
            />
          </Source>
        )}

        {/* Yellow zones */}
        {layerVisibility.showYellowZones && (
          <Source id="yellow-zones" type="geojson" data={yellowZonesGeoJSON}>
            <Layer
              id="yellow-zones-fill"
              type="fill"
              paint={{
                'fill-color': RESTRICTION_COLORS.yellow,
                'fill-opacity': 0.35
              }}
            />
            <Layer
              id="yellow-zones-outline"
              type="line"
              paint={{
                'line-color': RESTRICTION_COLORS.yellow,
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
                'text-color': RESTRICTION_COLORS.yellow,
                'text-halo-color': '#fff',
                'text-halo-width': 1
              }}
            />
          </Source>
        )}

        {/* Heliports */}
        {layerVisibility.showHeliports && (
          <Source id="heliports" type="geojson" data={heliportsGeoJSON}>
            <Layer
              id="heliports-fill"
              type="fill"
              paint={{
                'fill-color': RESTRICTION_COLORS.heliport,
                'fill-opacity': 0.25
              }}
            />
            <Layer
              id="heliports-outline"
              type="line"
              paint={{
                'line-color': RESTRICTION_COLORS.heliport,
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
                'text-color': RESTRICTION_COLORS.heliport,
                'text-halo-color': '#fff',
                'text-halo-width': 1
              }}
            />
          </Source>
        )}

        {/* DID raster tiles */}
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

        {/* GeoJSON layers (data-driven rendering) */}
        {geoJsonLayerConfigs.map(config => config.show && (
          <Source key={config.id} id={config.id} type="geojson" data={config.data}>
            <Layer
              id={`${config.id}-fill`}
              type="fill"
              paint={{
                'fill-color': config.fillColor,
                'fill-opacity': config.fillOpacity
              }}
            />
            <Layer
              id={`${config.id}-outline`}
              type="line"
              paint={{
                'line-color': config.lineColor,
                'line-width': config.lineWidth,
                ...(config.lineDasharray && { 'line-dasharray': config.lineDasharray })
              }}
            />
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

        {/* Custom Layers */}
        {customLayers.map(layer => visibleCustomLayerIds.has(layer.id) && (
          <Source key={layer.id} id={layer.id} type="geojson" data={layer.data}>
            <Layer
              id={`${layer.id}-fill`}
              type="fill"
              paint={{
                'fill-color': layer.color,
                'fill-opacity': layer.opacity
              }}
            />
            <Layer
              id={`${layer.id}-outline`}
              type="line"
              paint={{
                'line-color': layer.color,
                'line-width': 2
              }}
            />
            <Layer
              id={`${layer.id}-label`}
              type="symbol"
              layout={{
                'text-field': ['get', 'name'],
                'text-size': 10,
                'text-anchor': 'center'
              }}
              paint={{
                'text-color': layer.color,
                'text-halo-color': '#fff',
                'text-halo-width': 1
              }}
            />
          </Source>
        ))}

        {/* Geographic features */}
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

        {/* Rain cloud radar */}
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

        {/* Wind layer */}
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

        {/* Optimization overlay */}
        {optimizationOverlayGeoJSON && (
          <Source id="optimization-overlay" type="geojson" data={optimizationOverlayGeoJSON}>
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
                  '#FF4444'
                ],
                'circle-stroke-width': 3,
                'circle-opacity': 1
              }}
            />
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

        {/* Optimized route lines */}
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

        {/* Home point marker for optimized route */}
        {optimizedRoute?.homePoint && (
          <Marker
            latitude={optimizedRoute.homePoint.lat}
            longitude={optimizedRoute.homePoint.lng}
            draggable={!!onHomePointMove}
            onDragEnd={(e: MarkerDragEvent) => {
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

        {/* Waypoint markers */}
        {waypoints.map((wp) => {
          const isHighlighted = highlightedWaypointIndex === wp.index
          const recommendedWp = recommendedWaypoints?.find(
            (rw: RecommendedWaypoint) => rw.id === wp.id
          )
          const flags: WaypointIssueFlags | null = waypointIssueFlagsById && wp.id ? waypointIssueFlagsById[wp.id] : null
          const isInDID =
            (didHighlightedWaypointIndices instanceof Set
              ? didHighlightedWaypointIndices.has(wp.index)
              : false) ||
            (flags?.hasDID || false) ||
            (recommendedWp?.hasDID || false)
          const isInAirport = (flags?.hasAirport || false) || (recommendedWp?.hasAirport || false)
          const isInProhibited = (flags?.hasProhibited || false) || (recommendedWp?.hasProhibited || false)

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
              onDragEnd={(e: MarkerDragEvent) => {
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
                title={`#${wp.index} - ${
                  wp.polygonName || 'Waypoint'
                }${multiLabel}`}
                onDoubleClick={(e) => handleWaypointDoubleClick(e, wp)}
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
      <div className={`${styles.mapControls} ${isMobile ? styles.mobileControls : ''} ${mobileControlsExpanded ? styles.expanded : ''} ${controlsExpanded ? styles.controlsExpanded : ''}`}>
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

        {/* Controls group */}
        <div className={`${styles.controlsGroup} ${isMobile && !mobileControlsExpanded ? styles.hidden : ''}`}>
          {/* Controls Expander Toggle (Desktop only) */}
          {!isMobile && (
            <button
              className={`${styles.toggleButton} ${styles.expanderButton}`}
              onClick={toggleControlsExpanded}
              data-tooltip={controlsExpanded ? 'アイコンのみ表示 []]' : 'ラベルを表示 []]'}
              data-tooltip-pos="left"
            >
              {controlsExpanded ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
              <span className={styles.buttonLabel}>表示を縮小</span>
            </button>
          )}

          <button
            className={`${styles.toggleButton} ${layerVisibility.showDID ? styles.activeDID : ''}`}
            onClick={() => toggleLayer('showDID')}
            data-tooltip={!controlsExpanded ? `DID 人口集中地区 [D]` : undefined}
            data-tooltip-pos="left"
          >
            <Users size={18} />
            <span className={styles.buttonLabel}>人口集中地区</span>
          </button>
          <button
            className={`${styles.toggleButton} ${layerVisibility.showAirportZones ? styles.activeAirport : ''}`}
            onClick={() => toggleLayer('showAirportZones')}
            data-tooltip={!controlsExpanded ? `空港制限区域 [A]` : undefined}
            data-tooltip-pos="left"
          >
            <Plane size={18} />
            <span className={styles.buttonLabel}>空港制限区域</span>
          </button>
          <button
            className={`${styles.toggleButton} ${layerVisibility.showRedZones ? styles.activeRed : ''}`}
            onClick={() => toggleLayer('showRedZones')}
            data-tooltip={!controlsExpanded ? `レッドゾーン [R]` : undefined}
            data-tooltip-pos="left"
          >
            <ShieldAlert size={18} />
            <span className={styles.buttonLabel}>レッドゾーン</span>
          </button>
          <button
            className={`${styles.toggleButton} ${layerVisibility.showYellowZones ? styles.activeYellow : ''}`}
            onClick={() => toggleLayer('showYellowZones')}
            data-tooltip={!controlsExpanded ? `イエローゾーン [Y]` : undefined}
            data-tooltip-pos="left"
          >
            <Building2 size={18} />
            <span className={styles.buttonLabel}>イエローゾーン</span>
          </button>
          <button
            className={`${styles.toggleButton} ${layerVisibility.showHeliports ? styles.activeHeliport : ''}`}
            onClick={() => toggleLayer('showHeliports')}
            data-tooltip={!controlsExpanded ? `ヘリポート [H]` : undefined}
            data-tooltip-pos="left"
          >
            <Landmark size={18} />
            <span className={styles.buttonLabel}>ヘリポート</span>
          </button>

          {/* UTM layers */}
          <button
            className={`${styles.toggleButton} ${layerVisibility.showEmergencyAirspace ? styles.activeEmergency : ''}`}
            onClick={() => toggleLayer('showEmergencyAirspace')}
            data-tooltip={!controlsExpanded ? `緊急用務空域 [E]` : undefined}
            data-tooltip-pos="left"
          >
            <AlertTriangle size={18} />
            <span className={styles.buttonLabel}>緊急用務空域</span>
          </button>
          <button
            className={`${styles.toggleButton} ${layerVisibility.showRemoteIdZones ? styles.activeRemoteId : ''}`}
            onClick={() => toggleLayer('showRemoteIdZones')}
            data-tooltip={!controlsExpanded ? `リモートID特定区域 [I]` : undefined}
            data-tooltip-pos="left"
          >
            <Radio size={18} />
            <span className={styles.buttonLabel}>リモートID区域</span>
          </button>
          <button
            className={`${styles.toggleButton} ${layerVisibility.showMannedAircraftZones ? styles.activeMannedAircraft : ''}`}
            onClick={() => toggleLayer('showMannedAircraftZones')}
            data-tooltip={!controlsExpanded ? `有人機発着エリア [U]` : undefined}
            data-tooltip-pos="left"
          >
            <MapPinned size={18} />
            <span className={styles.buttonLabel}>有人機発着エリア</span>
          </button>
          <button
            className={`${styles.toggleButton} ${layerVisibility.showGeoFeatures ? styles.activeGeoFeatures : ''}`}
            onClick={() => toggleLayer('showGeoFeatures')}
            data-tooltip={!controlsExpanded ? `地物 [G]` : undefined}
            data-tooltip-pos="left"
          >
            <MapIcon size={18} />
            <span className={styles.buttonLabel}>地物</span>
          </button>
          <button
            className={`${styles.toggleButton} ${layerVisibility.showRainCloud ? styles.activeRainCloud : ''}`}
            onClick={() => toggleLayer('showRainCloud')}
            data-tooltip={!controlsExpanded ? `雨雲 [N]` : undefined}
            data-tooltip-pos="left"
          >
            <CloudRain size={18} />
            <span className={styles.buttonLabel}>雨雲レーダー</span>
          </button>
          <button
            className={`${styles.toggleButton} ${layerVisibility.showWind ? styles.activeWind : ''}`}
            onClick={() => toggleLayer('showWind')}
            data-tooltip={!controlsExpanded ? `風向・風量 [O]` : undefined}
            data-tooltip-pos="left"
          >
            <Wind size={18} />
            <span className={styles.buttonLabel}>風向・風速</span>
          </button>
          <button
            className={`${styles.toggleButton} ${layerVisibility.showRadioZones ? styles.activeRadioZones : ''}`}
            onClick={() => toggleLayer('showRadioZones')}
            data-tooltip={!controlsExpanded ? `電波種(LTE) [T]` : undefined}
            data-tooltip-pos="left"
          >
            <Wifi size={18} />
            <span className={styles.buttonLabel}>電波種(LTE)</span>
          </button>

          <button
            className={`${styles.toggleButton} ${layerVisibility.is3D ? styles.active : ''}`}
            onClick={toggle3D}
            data-tooltip={!controlsExpanded ? (layerVisibility.is3D ? '2D表示 [3]' : '3D表示 [3]') : undefined}
            data-tooltip-pos="left"
          >
            {layerVisibility.is3D ? <Box size={18} /> : <Rotate3D size={18} />}
            <span className={styles.buttonLabel}>{layerVisibility.is3D ? '2D表示' : '3D表示'}</span>
          </button>

          {/* Map style picker */}
          <div className={styles.stylePickerContainer}>
            <button
              className={`${styles.toggleButton} ${showStylePicker ? styles.active : ''}`}
              onClick={() => setShowStylePicker(!showStylePicker)}
              data-tooltip={!controlsExpanded ? "地図スタイル [M]" : undefined}
              data-tooltip-pos="left"
            >
              <Layers size={18} />
              <span className={styles.buttonLabel}>地図スタイル</span>
            </button>
            {showStylePicker && (
              <div className={styles.stylePicker}>
                {Object.values(BASE_MAPS).map(styleOption => (
                  <button
                    key={styleOption.id}
                    className={`${styles.styleOption} ${mapStyleId === styleOption.id ? styles.activeStyle : ''}`}
                    onClick={() => {
                      setMapStyleId(styleOption.id as BaseMapKey)
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
        </div>
      </div>

      {/* Instructions overlay */}
      <div className={styles.instructions}>
        {editingPolygon ? (
          <span>編集中: 頂点をドラッグ / 完了ボタンで保存</span>
        ) : (
          <>
            <span>ポリゴン: クリック=選択 / ダブルクリック=削除</span>
            <span>Waypoint: ドラッグ=移動 / ダブルクリック=削除</span>
          </>
        )}
      </div>

      <CustomLayerManager
        onLayerAdded={onCustomLayerAdded}
        onLayerRemoved={onCustomLayerRemoved}
        onLayerToggle={onCustomLayerToggle}
        visibleLayers={visibleCustomLayerIds}
      />
    </div>
  )
}

export default Map
