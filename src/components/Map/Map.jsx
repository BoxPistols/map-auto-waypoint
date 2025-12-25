import { useState, useCallback, useRef, useEffect, useMemo, useLayoutEffect } from 'react'
import MapGL, { NavigationControl, ScaleControl, Marker, Source, Layer } from 'react-map-gl/maplibre'
import { Box, Rotate3D, Plane, ShieldAlert, Users } from 'lucide-react'
import 'maplibre-gl/dist/maplibre-gl.css'
import DrawControl from './DrawControl'
import { getAirportZonesGeoJSON, getNoFlyZonesGeoJSON } from '../../services/airspace'
import { loadMapSettings, saveMapSettings } from '../../utils/storage'
import styles from './Map.module.scss'

// OpenStreetMap style with higher maxzoom
const MAP_STYLE = {
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

// Default center: Tokyo Tower
const DEFAULT_CENTER = { lat: 35.6585805, lng: 139.7454329 }
const DEFAULT_ZOOM = 12

const Map = ({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  polygons = [],
  waypoints = [],
  onPolygonCreate,
  onPolygonUpdate,
  onPolygonDelete,
  onPolygonSelect,
  onPolygonEditComplete,
  onMapClick,
  onWaypointClick,
  onWaypointDelete,
  onWaypointMove,
  selectedPolygonId,
  editingPolygon = null,
  drawMode = false
}) => {
  const mapRef = useRef(null)

  // Load map settings from localStorage (must be before viewState init)
  const initialSettings = useMemo(() => loadMapSettings(), [])

  const [viewState, setViewState] = useState({
    latitude: center.lat,
    longitude: center.lng,
    zoom: zoom,
    pitch: initialSettings.is3D ? 60 : 0,
    bearing: 0
  })
  const [draggingWaypoint, setDraggingWaypoint] = useState(null)
  const [is3D, setIs3D] = useState(initialSettings.is3D)
  const [showAirportZones, setShowAirportZones] = useState(initialSettings.showAirportZones)
  const [showNoFlyZones, setShowNoFlyZones] = useState(initialSettings.showNoFlyZones)
  const [showDID, setShowDID] = useState(initialSettings.showDID)

  // Save map settings when they change
  useEffect(() => {
    saveMapSettings({ is3D, showAirportZones, showNoFlyZones, showDID })
  }, [is3D, showAirportZones, showNoFlyZones, showDID])

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

      // Ignore if modifier keys are pressed (except for shortcuts that need them)
      if (e.ctrlKey || e.metaKey || e.altKey) return

      switch (e.key.toLowerCase()) {
        case 'd': // DID toggle
          e.preventDefault()
          setShowDID(prev => !prev)
          break
        case 'a': // Airport zones toggle
          e.preventDefault()
          setShowAirportZones(prev => !prev)
          break
        case 'n': // No-fly zones toggle
          e.preventDefault()
          setShowNoFlyZones(prev => !prev)
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

  // Memoize airspace GeoJSON data
  const airportZonesGeoJSON = useMemo(() => getAirportZonesGeoJSON(), [])
  const noFlyZonesGeoJSON = useMemo(() => getNoFlyZonesGeoJSON(), [])

  // Update view when center changes
  useEffect(() => {
    setViewState(prev => ({
      ...prev,
      latitude: center.lat,
      longitude: center.lng
    }))
  }, [center.lat, center.lng])

  // DID tile source configuration
  const didTileSource = useMemo(() => ({
    type: 'raster',
    tiles: ['https://cyberjapandata.gsi.go.jp/xyz/did2015/{z}/{x}/{y}.png'],
    tileSize: 256,
    minzoom: 8,
    maxzoom: 16,
    attribution: '国土地理院・総務省統計局'
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
      })
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

  // Handle waypoint drag
  const handleWaypointDragStart = useCallback((wp) => {
    setDraggingWaypoint(wp.id)
  }, [])

  const handleWaypointDragEnd = useCallback((e, wp) => {
    setDraggingWaypoint(null)
    if (onWaypointMove) {
      onWaypointMove(wp.id, {
        lat: e.lngLat.lat,
        lng: e.lngLat.lng
      })
    }
  }, [onWaypointMove])

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
        interactiveLayerIds={interactiveLayerIds}
        mapStyle={MAP_STYLE}
        style={{ width: '100%', height: '100%' }}
        doubleClickZoom={false}
        maxZoom={20}
      >
        <NavigationControl position="top-right" visualizePitch={true} />
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

        {/* No-fly zones */}
        {showNoFlyZones && (
          <Source id="nofly-zones" type="geojson" data={noFlyZonesGeoJSON}>
            <Layer
              id="nofly-zones-fill"
              type="fill"
              paint={{
                'fill-color': '#f44336',
                'fill-opacity': 0.25
              }}
            />
            <Layer
              id="nofly-zones-outline"
              type="line"
              paint={{
                'line-color': '#f44336',
                'line-width': 2
              }}
            />
            <Layer
              id="nofly-zones-label"
              type="symbol"
              layout={{
                'text-field': ['get', 'name'],
                'text-size': 10,
                'text-anchor': 'center'
              }}
              paint={{
                'text-color': '#c62828',
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

        {/* Display waypoints as draggable markers */}
        {waypoints.map((wp) => (
          <Marker
            key={wp.id}
            latitude={wp.lat}
            longitude={wp.lng}
            draggable={true}
            onDragStart={() => handleWaypointDragStart(wp)}
            onDragEnd={(e) => handleWaypointDragEnd(e, wp)}
            onClick={(e) => {
              e.originalEvent.stopPropagation()
              onWaypointClick?.(wp)
            }}
          >
            <div
              className={`${styles.waypointMarker} ${wp.type === 'grid' ? styles.gridMarker : ''} ${draggingWaypoint === wp.id ? styles.dragging : ''}`}
              title={`#${wp.index} - ${wp.polygonName || 'Waypoint'}`}
              onDoubleClick={(e) => handleWaypointDoubleClick(e, wp)}
            >
              {wp.index}
            </div>
          </Marker>
        ))}
      </MapGL>

      {/* Map control buttons */}
      <div className={styles.mapControls}>
        <button
          className={`${styles.toggleButton} ${showDID ? styles.activeDID : ''}`}
          onClick={() => setShowDID(!showDID)}
          data-tooltip={`DID 人口集中地区 [D]`}
          data-tooltip-pos="left"
        >
          <Users size={18} />
        </button>
        <button
          className={`${styles.toggleButton} ${showAirportZones ? styles.activeAirport : ''}`}
          onClick={() => setShowAirportZones(!showAirportZones)}
          data-tooltip={`空港制限区域 [A]`}
          data-tooltip-pos="left"
        >
          <Plane size={18} />
        </button>
        <button
          className={`${styles.toggleButton} ${showNoFlyZones ? styles.activeNoFly : ''}`}
          onClick={() => setShowNoFlyZones(!showNoFlyZones)}
          data-tooltip={`飛行禁止区域 [N]`}
          data-tooltip-pos="left"
        >
          <ShieldAlert size={18} />
        </button>
        <button
          className={`${styles.toggleButton} ${is3D ? styles.active : ''}`}
          onClick={toggle3D}
          data-tooltip={is3D ? '2D表示 [3]' : '3D表示 [3]'}
          data-tooltip-pos="left"
        >
          {is3D ? <Box size={18} /> : <Rotate3D size={18} />}
        </button>
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
