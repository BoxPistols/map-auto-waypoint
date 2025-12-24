import { useState, useCallback, useRef, useEffect } from 'react'
import MapGL, { NavigationControl, ScaleControl, Marker, Source, Layer } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import DrawControl from './DrawControl'
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
    zoom: zoom,
    pitch: 0,
    bearing: 0
  })
  const [draggingWaypoint, setDraggingWaypoint] = useState(null)
  const [is3D, setIs3D] = useState(false)

  // Update view when center changes
  useEffect(() => {
    setViewState(prev => ({
      ...prev,
      latitude: center.lat,
      longitude: center.lng
    }))
  }, [center.lat, center.lng])

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

      {/* 3D Toggle Button */}
      <button
        className={`${styles.toggleButton} ${is3D ? styles.active : ''}`}
        onClick={toggle3D}
        title={is3D ? '2D表示に切替' : '3D表示に切替'}
      >
        {is3D ? '2D' : '3D'}
      </button>

      {/* Instructions overlay */}
      <div className={styles.instructions}>
        <span>ポリゴン: クリック=選択 / ダブルクリック=削除</span>
        <span>Waypoint: ドラッグ=移動 / ダブルクリック=削除</span>
      </div>
    </div>
  )
}

export default Map
