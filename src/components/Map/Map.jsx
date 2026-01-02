import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import MapGL, { NavigationControl, ScaleControl, Marker, Source, Layer } from 'react-map-gl/maplibre'
import { Box, Rotate3D, Plane, ShieldAlert, Users, Map as MapIcon, Layers, Building2, Landmark, Database, AlertTriangle, Circle, Satellite, Settings2, X } from 'lucide-react'
import 'maplibre-gl/dist/maplibre-gl.css'
import DrawControl from './DrawControl'
import { getAirportZonesGeoJSON, getRedZonesGeoJSON, getYellowZonesGeoJSON, getHeliportsGeoJSON } from '../../services/airspace'
import { getDisasterHistory } from '../../services/reinfolibService'
import { loadMapSettings, saveMapSettings } from '../../utils/storage'
import styles from './Map.module.scss'

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

// 緯度経度 → XYZタイル
const latLngToTile = (lat, lng, zoom) => {
  const n = Math.pow(2, zoom)
  const x = Math.floor((lng + 180) / 360 * n)
  const latRad = lat * Math.PI / 180
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n)
  return { x, y, z: zoom }
}

const Map = ({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  polygons = [],
  waypoints = [],
  recommendedWaypoints = null,
  highlightedWaypointIndex = null,
  apiInfo = null,
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
  selectedPolygonId,
  editingPolygon = null,
  drawMode = false
}) => {
  const mapRef = useRef(null)

  // Selection state for bulk operations
  const [selectionBox, setSelectionBox] = useState(null) // {startX, startY, endX, endY}
  const [selectedWaypointIds, setSelectedWaypointIds] = useState(new Set())
  const [isSelecting, setIsSelecting] = useState(false)

  // Load map settings from localStorage (must be before viewState init)
  const initialSettings = useMemo(() => loadMapSettings(), [])

  const [viewState, setViewState] = useState({
    latitude: center.lat,
    longitude: center.lng,
    zoom: zoom,
    pitch: initialSettings.is3D ? 60 : 0,
    bearing: 0
  })
  const [is3D, setIs3D] = useState(initialSettings.is3D)
  const [showAirportZones, setShowAirportZones] = useState(initialSettings.showAirportZones)
  const [showRedZones, setShowRedZones] = useState(initialSettings.showRedZones ?? false)
  const [showYellowZones, setShowYellowZones] = useState(initialSettings.showYellowZones ?? false)
  const [showHeliports, setShowHeliports] = useState(initialSettings.showHeliports ?? false)
  const [showDID, setShowDID] = useState(initialSettings.showDID)
  const [showDisasterHistory, setShowDisasterHistory] = useState(initialSettings.showDisasterHistory ?? false)
  const [mapStyleId, setMapStyleId] = useState(initialSettings.mapStyleId || 'osm')
  const [showStylePicker, setShowStylePicker] = useState(false)
  const [showApiOverlay, setShowApiOverlay] = useState(false)
  const [mobileControlsExpanded, setMobileControlsExpanded] = useState(false)

  // 災害履歴（XST001）: 自動取得状態
  const [disasterHistoryLocal, setDisasterHistoryLocal] = useState(null) // GeoJSON FeatureCollection
  const [disasterHistoryLoading, setDisasterHistoryLoading] = useState(false)
  const [disasterHistoryError, setDisasterHistoryError] = useState(null)
  // NOTE: このファイルのコンポーネント名が `Map` なので、グローバルの Map と衝突する。
  // `new Map()` だと「Mapコンポーネント」をnewしようとして落ちるため、明示的に globalThis.Map を使う。
  const disasterHistoryCacheRef = useRef(new globalThis.Map()) // tileKey -> GeoJSON

  // isMobile is now passed as a prop from App.jsx to avoid duplication

  // 現在の地図スタイル
  const currentMapStyle = MAP_STYLES[mapStyleId]?.style || MAP_STYLES.osm.style

  // Save map settings when they change
  useEffect(() => {
    saveMapSettings({ is3D, showAirportZones, showRedZones, showYellowZones, showHeliports, showDID, showDisasterHistory, mapStyleId })
  }, [is3D, showAirportZones, showRedZones, showYellowZones, showHeliports, showDID, showDisasterHistory, mapStyleId])

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

  // Disaster history (XST001) GeoJSON - provided from FlightAssistant via apiInfo
  const disasterHistoryGeoJSON = useMemo(() => {
    const dh = apiInfo?.mlitInfo?.disasterHistory
    if (dh?.success && dh.geojson) return dh.geojson
    return disasterHistoryLocal
  }, [apiInfo])

  // 災害履歴（XST001）: レイヤON時、表示中心タイルを自動取得（デバウンス）
  useEffect(() => {
    if (!showDisasterHistory) return

    // 取得の基準座標（優先: FlightAssistantが渡す中心、次に現在のviewState）
    const baseLat = apiInfo?.center?.lat ?? viewState.latitude
    const baseLng = apiInfo?.center?.lng ?? viewState.longitude

    // XST001は z=9〜15。表示ズームを丸めて範囲内にクランプ
    const z = Math.min(15, Math.max(9, Math.round(viewState.zoom || 14)))
    const tile = latLngToTile(baseLat, baseLng, z)
    const tileKey = `${tile.z}/${tile.x}/${tile.y}`

    // FlightAssistantが既に供給している場合は不要
    const dhFromAssistant = apiInfo?.mlitInfo?.disasterHistory
    if (dhFromAssistant?.success && dhFromAssistant.geojson) {
      setDisasterHistoryError(null)
      setDisasterHistoryLoading(false)
      setDisasterHistoryLocal(null)
      return
    }

    // キャッシュヒット
    const cached = disasterHistoryCacheRef.current.get(tileKey)
    if (cached) {
      setDisasterHistoryLocal(cached)
      setDisasterHistoryError(null)
      setDisasterHistoryLoading(false)
      return
    }

    setDisasterHistoryLoading(true)
    setDisasterHistoryError(null)

    const timer = setTimeout(() => {
      let cancelled = false
      ;(async () => {
        try {
          const result = await getDisasterHistory(baseLat, baseLng, z)
          if (cancelled) return
          if (result?.success && result.geojson) {
            disasterHistoryCacheRef.current.set(tileKey, result.geojson)
            setDisasterHistoryLocal(result.geojson)
            setDisasterHistoryError(null)
          } else {
            setDisasterHistoryError(result?.error || '災害履歴の取得に失敗しました')
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : '災害履歴の取得に失敗しました'
          if (!cancelled) setDisasterHistoryError(msg)
        } finally {
          if (!cancelled) setDisasterHistoryLoading(false)
        }
      })()

      return () => { cancelled = true }
    }, 350)

    return () => {
      clearTimeout(timer)
      // 注: fetch 자체のabortはしていないが、state反映はキャンセルする
    }
  }, [
    showDisasterHistory,
    apiInfo,
    viewState.latitude,
    viewState.longitude,
    viewState.zoom
  ])

  // Memoize optimization overlay GeoJSON (lines from current to recommended positions + zone warnings)
  const optimizationOverlayGeoJSON = useMemo(() => {
    if (!recommendedWaypoints || recommendedWaypoints.length === 0) return null

    const features = []

    recommendedWaypoints.forEach(rw => {
      if (rw.modified) {
        // Find original waypoint
        const original = waypoints.find(w => w.id === rw.id)
        if (original) {
          // Determine warning type for line color
          let warningType = 'optimization'
          if (rw.hasProhibited) warningType = 'prohibited'
          else if (rw.hasAirport) warningType = 'airport'
          else if (rw.hasDID) warningType = 'did'

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
      } else if (rw.hasProhibited || rw.hasAirport || rw.hasDID) {
        // Warning point (no move needed, but visual indicator)
        let warningType = 'did'
        if (rw.hasProhibited) warningType = 'prohibited'
        else if (rw.hasAirport) warningType = 'airport'

        features.push({
          type: 'Feature',
          properties: { type: 'zone-warning-point', index: rw.index, warningType },
          geometry: {
            type: 'Point',
            coordinates: [rw.lng, rw.lat]
          }
        })
      }
    })

    if (features.length === 0) return null

    return {
      type: 'FeatureCollection',
      features
    }
  }, [recommendedWaypoints, waypoints])


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
    setIs3D(prev => {
      const newIs3D = !prev
      setViewState(v => ({
        ...v,
        pitch: newIs3D ? 60 : 0
      }))
      return newIs3D
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
          setShowDID(prev => !prev)
          break
        case 'x': // Disaster history toggle (XST001)
          e.preventDefault()
          setShowDisasterHistory(prev => !prev)
          break
        case 'a': // Airport zones toggle
          e.preventDefault()
          setShowAirportZones(prev => !prev)
          break
        case 'r': // Red zones toggle
          e.preventDefault()
          setShowRedZones(prev => !prev)
          break
        case 'y': // Yellow zones toggle
          e.preventDefault()
          setShowYellowZones(prev => !prev)
          break
        case 'h': // Heliport toggle
          e.preventDefault()
          setShowHeliports(prev => !prev)
          break
        case 'm': // Map style picker toggle
          e.preventDefault()
          setShowStylePicker(prev => !prev)
          break
        case 'i': // API info overlay toggle
          e.preventDefault()
          setShowApiOverlay(prev => !prev)
          break
        case '3': // 3D toggle
          e.preventDefault()
          toggle3D()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggle3D])

  // Handle map click
  const handleClick = useCallback((e) => {
    const features = e.features || []
    const polygonFeature = features.find(f => f.layer?.id === 'polygon-fill')

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
  }, [onMapClick, onPolygonSelect, drawMode])

  // Handle double click on polygon - delete
  const handleDoubleClick = useCallback((e) => {
    const features = e.features || []
    const polygonFeature = features.find(f => f.layer?.id === 'polygon-fill')

    if (polygonFeature && onPolygonDelete) {
      e.preventDefault()
      const polygonId = polygonFeature.properties.id
      const polygon = polygons.find(p => p.id === polygonId)
      if (polygon && confirm(`「${polygon.name}」を削除しますか?`)) {
        onPolygonDelete(polygonId)
      }
    }
  }, [polygons, onPolygonDelete])

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

  // Handle waypoint double click - delete
  const handleWaypointDoubleClick = useCallback((e, wp) => {
    e.stopPropagation()
    if (onWaypointDelete && confirm(`Waypoint #${wp.index} を削除しますか?`)) {
      onWaypointDelete(wp.id)
    }
  }, [onWaypointDelete])

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
        {/* ナビゲーションコントロール - モバイルでは下に移動 */}
        <NavigationControl position={isMobile ? "bottom-right" : "top-right"} visualizePitch={true} />
        <ScaleControl position="bottom-left" unit="metric" />

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
        {showAirportZones && (
          <Source id="airport-zones" type="geojson" data={airportZonesGeoJSON}>
            <Layer
              id="airport-zones-fill"
              type="fill"
              paint={{
                'fill-color': '#ff9800',
                'fill-opacity': 0.15
              }}
            />
            <Layer
              id="airport-zones-outline"
              type="line"
              paint={{
                'line-color': '#ff9800',
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
                'text-color': '#e65100',
                'text-halo-color': '#fff',
                'text-halo-width': 1
              }}
            />
          </Source>
        )}

        {/* レッドゾーン（国の重要施設・原発・米軍基地） */}
        {showRedZones && (
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
        {showYellowZones && (
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
        {showHeliports && (
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

        {/* DID (人口集中地区) raster tiles */}
        {showDID && (
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

        {/* Disaster history (XST001) overlay */}
        {showDisasterHistory && disasterHistoryGeoJSON && (
          <Source id="disaster-history" type="geojson" data={disasterHistoryGeoJSON}>
            {/* Polygon fill */}
            <Layer
              id="disaster-history-fill"
              type="fill"
              filter={['any',
                ['==', ['geometry-type'], 'Polygon'],
                ['==', ['geometry-type'], 'MultiPolygon']
              ]}
              paint={{
                'fill-color': [
                  'match',
                  ['get', 'disastertype_code'],
                  // Flood / storm surge
                  '11', '#2563eb',
                  '12', '#1d4ed8',
                  '13', '#0ea5e9',
                  '14', '#0284c7',
                  // Landslide / debris
                  '21', '#a16207',
                  '22', '#92400e',
                  '23', '#b45309',
                  '24', '#78350f',
                  // Earthquake-related
                  '33', '#7c3aed',
                  '34', '#6d28d9',
                  // Tsunami
                  '37', '#06b6d4',
                  '38', '#0891b2',
                  // default
                  '#ef4444'
                ],
                'fill-opacity': 0.22
              }}
            />
            {/* Polygon outline */}
            <Layer
              id="disaster-history-outline"
              type="line"
              filter={['any',
                ['==', ['geometry-type'], 'Polygon'],
                ['==', ['geometry-type'], 'MultiPolygon']
              ]}
              paint={{
                'line-color': [
                  'match',
                  ['get', 'disastertype_code'],
                  '11', '#1d4ed8',
                  '12', '#1e40af',
                  '13', '#0284c7',
                  '14', '#0369a1',
                  '21', '#92400e',
                  '22', '#78350f',
                  '23', '#92400e',
                  '24', '#713f12',
                  '33', '#6d28d9',
                  '34', '#5b21b6',
                  '37', '#0891b2',
                  '38', '#0e7490',
                  '#dc2626'
                ],
                'line-width': 2,
                'line-opacity': 0.85
              }}
            />
            {/* Point markers */}
            <Layer
              id="disaster-history-points"
              type="circle"
              filter={['any',
                ['==', ['geometry-type'], 'Point'],
                ['==', ['geometry-type'], 'MultiPoint']
              ]}
              paint={{
                'circle-radius': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  8, 2,
                  12, 4,
                  16, 7
                ],
                'circle-color': [
                  'match',
                  ['get', 'disastertype_code'],
                  '12', '#1e40af',
                  '23', '#b45309',
                  '37', '#06b6d4',
                  '#ef4444'
                ],
                'circle-stroke-color': '#ffffff',
                'circle-stroke-width': 1.5,
                'circle-opacity': 0.85
              }}
            />
            {/* Labels (high zoom only) */}
            <Layer
              id="disaster-history-labels"
              type="symbol"
              minzoom={12}
              filter={['any',
                ['==', ['geometry-type'], 'Point'],
                ['==', ['geometry-type'], 'MultiPoint']
              ]}
              layout={{
                'text-field': ['coalesce', ['get', 'disaster_name_ja'], ['get', 'disastertype_code']],
                'text-size': 10,
                'text-offset': [0, 1.2],
                'text-anchor': 'top'
              }}
              paint={{
                'text-color': '#111827',
                'text-halo-color': '#ffffff',
                'text-halo-width': 1
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
            {/* DID warning circles (green - same style as optimization) */}
            <Layer
              id="did-warning-points"
              type="circle"
              filter={['==', ['get', 'type'], 'did-warning-point']}
              paint={{
                'circle-radius': 18,
                'circle-color': 'transparent',
                'circle-stroke-color': '#10b981',
                'circle-stroke-width': 3,
                'circle-opacity': 1
              }}
            />
            {/* DID warning labels */}
            <Layer
              id="did-warning-labels"
              type="symbol"
              filter={['==', ['get', 'type'], 'did-warning-point']}
              layout={{
                'text-field': 'DID',
                'text-size': 9,
                'text-offset': [0, 2.2],
                'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold']
              }}
              paint={{
                'text-color': '#10b981',
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

        {/* Display waypoints as draggable markers (non-interactive during polygon edit) */}
        {waypoints.map((wp) => {
          const isHighlighted = highlightedWaypointIndex === wp.index
          // Check zone violations for this waypoint
          const recommendedWp = recommendedWaypoints?.find(rw => rw.id === wp.id)
          const isInDID = recommendedWp?.hasDID || false
          const isInAirport = recommendedWp?.hasAirport || false
          const isInProhibited = recommendedWp?.hasProhibited || false

          // Debug: ゾーン違反の確認（開発時のみ）
          if (import.meta.env.DEV && recommendedWp && (isInDID || isInAirport || isInProhibited)) {
            console.log(`[Map] WP${wp.index}: DID=${isInDID}, Airport=${isInAirport}, Prohibited=${isInProhibited}`, recommendedWp.issueTypes)
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
                className={`${styles.waypointMarker} ${wp.type === 'grid' ? styles.gridMarker : ''} ${selectedWaypointIds.has(wp.id) ? styles.selected : ''} ${isHighlighted ? styles.highlighted : ''} ${zoneClass}`}
                style={editingPolygon ? { pointerEvents: 'none', opacity: 0.5 } : undefined}
                title={`#${wp.index} - ${wp.polygonName || 'Waypoint'}${zoneLabel}`}
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

      {/* API Info Overlay */}
      {showApiOverlay && apiInfo && (
        <div className={styles.apiOverlay}>
          <div className={`${styles.apiOverlayHeader} ${apiInfo.mlitError ? styles.apiOverlayHeaderError : ''}`}>
            <Database size={16} />
            <span>国交省API情報</span>
            <button className={styles.apiOverlayClose} onClick={() => setShowApiOverlay(false)}>×</button>
          </div>
          {apiInfo.mlitEnhanced && apiInfo.mlitInfo?.success ? (
            <div className={styles.apiOverlayContent}>
              {apiInfo.mlitInfo.useZone?.zoneName && (
                <div className={styles.apiInfoRow}>
                  <span className={styles.apiInfoLabel}>用途地域</span>
                  <span className={styles.apiInfoValue}>{apiInfo.mlitInfo.useZone.zoneName}</span>
                </div>
              )}
              {apiInfo.mlitInfo.urbanArea?.areaName && (
                <div className={styles.apiInfoRow}>
                  <span className={styles.apiInfoLabel}>都市計画</span>
                  <span className={styles.apiInfoValue}>{apiInfo.mlitInfo.urbanArea.areaName}</span>
                </div>
              )}
              {apiInfo.mlitInfo.disasterHistory?.success && apiInfo.mlitInfo.disasterHistory.summary?.total > 0 && (
                <div className={styles.apiInfoRow}>
                  <span className={styles.apiInfoLabel}>災害履歴</span>
                  <span className={styles.apiInfoValue}>
                    {apiInfo.mlitInfo.disasterHistory.summary.total}件
                    {apiInfo.mlitInfo.disasterHistory.summary.yearRange?.min && apiInfo.mlitInfo.disasterHistory.summary.yearRange?.max && (
                      <>（{apiInfo.mlitInfo.disasterHistory.summary.yearRange.min === apiInfo.mlitInfo.disasterHistory.summary.yearRange.max
                        ? `${apiInfo.mlitInfo.disasterHistory.summary.yearRange.min}年`
                        : `${apiInfo.mlitInfo.disasterHistory.summary.yearRange.min}〜${apiInfo.mlitInfo.disasterHistory.summary.yearRange.max}年`
                      }）</>
                    )}
                  </span>
                </div>
              )}
              {apiInfo.mlitInfo.riskLevel && (
                <div className={styles.apiInfoRow}>
                  <span className={styles.apiInfoLabel}>リスク</span>
                  <span className={`${styles.apiInfoValue} ${styles[`risk${apiInfo.mlitInfo.riskLevel}`]}`}>
                    <Circle size={10} fill="currentColor" style={{ marginRight: 4 }} />
                    {apiInfo.mlitInfo.riskLevel === 'HIGH' ? '高' : apiInfo.mlitInfo.riskLevel === 'MEDIUM' ? '中' : '低'}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.apiOverlayError}>
              <div className={styles.apiErrorIcon}><AlertTriangle size={24} /></div>
              <div className={styles.apiErrorMessage}>{apiInfo.mlitError || 'データなし'}</div>
              <div className={styles.apiErrorHint}>
                {apiInfo.mlitError?.includes('403') ? (
                  <>※ APIキーが無効または未設定です。設定画面でAPIキーを確認してください。</>
                ) : apiInfo.mlitError?.includes('CORS') || apiInfo.mlitError?.includes('network') ? (
                  <>※ CORS制限によりブラウザから直接APIを呼び出せません。サーバープロキシが必要です。</>
                ) : (
                  <>※ APIエラーが発生しました。ネットワーク接続を確認してください。</>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Map control buttons */}
      <div className={`${styles.mapControls} ${isMobile ? styles.mobileControls : ''} ${mobileControlsExpanded ? styles.expanded : ''}`}>
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
          <button
            className={`${styles.toggleButton} ${showDID ? styles.activeDID : ''}`}
            onClick={() => setShowDID(!showDID)}
            data-tooltip={`DID 人口集中地区 [D]`}
            data-tooltip-pos="left"
          >
            <Users size={18} />
          </button>
          {/* 災害履歴（XST001） - データがある場合のみ表示 */}
          {disasterHistoryGeoJSON && (
            <button
              className={`${styles.toggleButton} ${showDisasterHistory ? styles.active : ''} ${disasterHistoryLoading ? styles.loading : ''}`}
              onClick={() => setShowDisasterHistory(!showDisasterHistory)}
              data-tooltip={disasterHistoryLoading ? '災害履歴 取得中...' : disasterHistoryError ? `災害履歴: ${disasterHistoryError}` : `災害履歴 [X]`}
              data-tooltip-pos="left"
              title="災害履歴（国土調査）を表示/非表示"
            >
              <AlertTriangle size={18} />
            </button>
          )}
          <button
            className={`${styles.toggleButton} ${showAirportZones ? styles.activeAirport : ''}`}
            onClick={() => setShowAirportZones(!showAirportZones)}
            data-tooltip={`空港制限区域 [A]`}
            data-tooltip-pos="left"
          >
            <Plane size={18} />
          </button>
          <button
            className={`${styles.toggleButton} ${showRedZones ? styles.activeRed : ''}`}
            onClick={() => setShowRedZones(!showRedZones)}
            data-tooltip={`レッドゾーン [R]`}
            data-tooltip-pos="left"
          >
            <ShieldAlert size={18} />
          </button>
          <button
            className={`${styles.toggleButton} ${showYellowZones ? styles.activeYellow : ''}`}
            onClick={() => setShowYellowZones(!showYellowZones)}
            data-tooltip={`イエローゾーン [Y]`}
            data-tooltip-pos="left"
          >
            <Building2 size={18} />
          </button>
          <button
            className={`${styles.toggleButton} ${showHeliports ? styles.activeHeliport : ''}`}
            onClick={() => setShowHeliports(!showHeliports)}
            data-tooltip={`ヘリポート [H]`}
            data-tooltip-pos="left"
          >
            <Landmark size={18} />
          </button>
          <button
            className={`${styles.toggleButton} ${is3D ? styles.active : ''}`}
            onClick={toggle3D}
            data-tooltip={is3D ? '2D表示 [3]' : '3D表示 [3]'}
            data-tooltip-pos="left"
          >
            {is3D ? <Box size={18} /> : <Rotate3D size={18} />}
          </button>

          {/* API情報トグル（データがある場合のみ表示） */}
          {apiInfo && (
            <button
              className={`${styles.toggleButton} ${showApiOverlay ? styles.activeApi : ''} ${apiInfo.mlitEnhanced ? styles.apiConnected : apiInfo.mlitError ? styles.apiError : ''}`}
              onClick={() => setShowApiOverlay(!showApiOverlay)}
              data-tooltip={apiInfo.mlitEnhanced ? 'API情報 [I]' : `API: ${apiInfo.mlitError || '未接続'}`}
              data-tooltip-pos="left"
            >
              <Database size={18} />
            </button>
          )}

          {/* 地図スタイル切り替え */}
          <div className={styles.stylePickerContainer}>
            <button
              className={`${styles.toggleButton} ${showStylePicker ? styles.active : ''}`}
              onClick={() => setShowStylePicker(!showStylePicker)}
              data-tooltip="地図スタイル [M]"
              data-tooltip-pos="left"
            >
              <Layers size={18} />
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
    </div>
  )
}

export default Map
