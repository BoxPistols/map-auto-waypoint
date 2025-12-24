import { useState, useCallback, useRef, useEffect } from 'react'
import MapGL, { NavigationControl, ScaleControl, Marker, Source, Layer } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import DrawControl from './DrawControl'
import styles from './Map.module.scss'

// OpenStreetMap style
const MAP_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
      minzoom: 0,
      maxzoom: 19
    }
  ]
}

// Default center: Tokyo Tower
const DEFAULT_CENTER = { lat: 35.6585805, lng: 139.7454329 }
const DEFAULT_ZOOM = 12
const WAYPOINT_ZOOM = 16

const Map = ({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  polygons = [],
  waypoints = [],
  onPolygonCreate,
  onPolygonUpdate,
  onPolygonDelete,
  onPolygonSelect,
  onMapClick,
  onWaypointClick,
  onWaypointDelete,
  onWaypointMove,
  selectedPolygonId,
  drawMode = false
}) => {
  const mapRef = useRef(null)
  const [viewState, setViewState] = useState({
    latitude: center.lat,
    longitude: center.lng,
    zoom: zoom
  })
  const [draggingWaypoint, setDraggingWaypoint] = useState(null)

  // Update view when center changes
  useEffect(() => {
    setViewState(prev => ({
      ...prev,
      latitude: center.lat,
      longitude: center.lng
    }))
  }, [center.lat, center.lng])

  // Fly to location
  const flyTo = useCallback((lat, lng, targetZoom = WAYPOINT_ZOOM) => {
    mapRef.current?.flyTo({
      center: [lng, lat],
      zoom: targetZoom,
      duration: 1000
    })
  }, [])

  // Handle map click
  const handleClick = useCallback((e) => {
    // Check if clicked on a polygon
    const features = e.features || []
    const polygonFeature = features.find(f => f.layer?.id === 'polygon-fill')

    if (polygonFeature) {
      // Single click on polygon - select it
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

  // Handle polygon update
  const handleUpdate = useCallback((features) => {
    if (onPolygonUpdate && features.length > 0) {
      onPolygonUpdate(features[0])
    }
  }, [onPolygonUpdate])

  // Handle polygon delete from draw control
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

  const handleWaypointDrag = useCallback((e, wp) => {
    // Update position during drag (visual feedback)
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

  // Convert polygons to GeoJSON for display
  const polygonsGeoJSON = {
    type: 'FeatureCollection',
    features: polygons.map(p => ({
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

  // Interactive layer IDs for click events
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
      >
        <NavigationControl position="top-right" />
        <ScaleControl position="bottom-left" unit="metric" />

        {/* Draw control for polygon drawing - always mounted, controlled by active prop */}
        <DrawControl
          position="top-left"
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          active={drawMode}
        />

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
            onDrag={(e) => handleWaypointDrag(e, wp)}
            onDragEnd={(e) => handleWaypointDragEnd(e, wp)}
            onClick={(e) => {
              e.originalEvent.stopPropagation()
              onWaypointClick?.(wp)
              flyTo(wp.lat, wp.lng)
            }}
          >
            <div
              className={`${styles.waypointMarker} ${wp.type === 'grid' ? styles.gridMarker : ''} ${draggingWaypoint === wp.id ? styles.dragging : ''}`}
              title={`#${wp.index} - ${wp.polygonName || 'Waypoint'}\nダブルクリックで削除\nドラッグで移動`}
              onDoubleClick={(e) => handleWaypointDoubleClick(e, wp)}
            >
              {wp.index}
            </div>
          </Marker>
        ))}
      </MapGL>

      {/* Instructions overlay */}
      <div className={styles.instructions}>
        <span>ポリゴン: クリックで選択 / ダブルクリックで削除</span>
        <span>Waypoint: ドラッグで移動 / ダブルクリックで削除</span>
      </div>
    </div>
  )
}

export default Map
