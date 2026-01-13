import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { useMap } from 'react-map-gl/maplibre'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import type { DrawControlProps, DrawControlRef, PolygonData } from '../../lib/types'

interface DrawEvent {
  features: GeoJSON.Feature[]
}

interface EditedPolygon {
  id: string
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon
}

const DrawControl = forwardRef<DrawControlRef, DrawControlProps>(({
  position = 'top-left',
  onCreate,
  onUpdate,
  onDelete,
  onEditComplete,
  active = false,
  editingPolygon = null
}, ref) => {
  const { current: map } = useMap()
  const drawRef = useRef<MapboxDraw | null>(null)
  const editingIdRef = useRef<string | null>(null)

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    startDrawing: () => {
      if (drawRef.current) {
        drawRef.current.changeMode('draw_polygon')
      }
    },
    stopDrawing: () => {
      if (drawRef.current) {
        drawRef.current.changeMode('simple_select')
      }
    },
    deleteAll: () => {
      if (drawRef.current) {
        drawRef.current.deleteAll()
      }
    },
    loadPolygon: (polygon: PolygonData) => {
      if (drawRef.current && polygon) {
        drawRef.current.deleteAll()
        const feature: GeoJSON.Feature = {
          id: polygon.id,
          type: 'Feature',
          properties: {},
          geometry: polygon.geometry
        }
        drawRef.current.add(feature)
        drawRef.current.changeMode('direct_select', { featureId: polygon.id })
        editingIdRef.current = polygon.id
      }
    },
    finishEditing: () => {
      if (drawRef.current && editingIdRef.current) {
        const features = drawRef.current.getAll()
        const editedFeature = features.features.find(f => f.id === editingIdRef.current)
        if (editedFeature) {
          const edited: EditedPolygon = {
            id: editingIdRef.current,
            geometry: editedFeature.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon
          }
          onEditComplete?.(edited)
        }
        drawRef.current.deleteAll()
        editingIdRef.current = null
      }
    }
  }))

  useEffect(() => {
    if (!map) return

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: false,
        trash: false
      },
      defaultMode: 'simple_select',
      styles: [
        // Polygon fill - inactive
        {
          id: 'gl-draw-polygon-fill-inactive',
          type: 'fill',
          filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
          paint: {
            'fill-color': '#45B7D1',
            'fill-opacity': 0.2
          }
        },
        // Polygon fill - active
        {
          id: 'gl-draw-polygon-fill-active',
          type: 'fill',
          filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
          paint: {
            'fill-color': '#45B7D1',
            'fill-opacity': 0.4
          }
        },
        // Polygon outline - inactive
        {
          id: 'gl-draw-polygon-stroke-inactive',
          type: 'line',
          filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
          layout: {
            'line-cap': 'round',
            'line-join': 'round'
          },
          paint: {
            'line-color': '#45B7D1',
            'line-width': 2
          }
        },
        // Polygon outline - active
        {
          id: 'gl-draw-polygon-stroke-active',
          type: 'line',
          filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
          layout: {
            'line-cap': 'round',
            'line-join': 'round'
          },
          paint: {
            'line-color': '#45B7D1',
            'line-width': 3
          }
        },
        // Vertex points - inactive
        {
          id: 'gl-draw-polygon-and-line-vertex-inactive',
          type: 'circle',
          filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['!=', 'mode', 'static']],
          paint: {
            'circle-radius': 6,
            'circle-color': '#fff',
            'circle-stroke-color': '#45B7D1',
            'circle-stroke-width': 2
          }
        },
        // Vertex points - halo for active
        {
          id: 'gl-draw-polygon-and-line-vertex-halo-active',
          type: 'circle',
          filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point']],
          paint: {
            'circle-radius': 8,
            'circle-color': '#fff'
          }
        },
        // Midpoint
        {
          id: 'gl-draw-polygon-midpoint',
          type: 'circle',
          filter: ['all', ['==', 'meta', 'midpoint'], ['==', '$type', 'Point']],
          paint: {
            'circle-radius': 4,
            'circle-color': '#45B7D1'
          }
        },
        // Line - for drawing
        {
          id: 'gl-draw-line',
          type: 'line',
          filter: ['all', ['==', '$type', 'LineString'], ['!=', 'mode', 'static']],
          layout: {
            'line-cap': 'round',
            'line-join': 'round'
          },
          paint: {
            'line-color': '#45B7D1',
            'line-dasharray': [0.2, 2],
            'line-width': 2
          }
        },
        // Point
        {
          id: 'gl-draw-point',
          type: 'circle',
          filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'feature']],
          paint: {
            'circle-radius': 6,
            'circle-color': '#45B7D1'
          }
        }
      ]
    })

    drawRef.current = draw

    // Add control to map
    map.addControl(draw, position)

    // Event handlers
    const handleCreate = (e: DrawEvent) => {
      onCreate?.(e.features)
      // Clear the drawn feature from draw control after saving
      draw.deleteAll()
    }

    const handleUpdate = (e: DrawEvent) => {
      // If we're editing an existing polygon, use onEditComplete
      if (editingIdRef.current && e.features.length > 0) {
        const editedFeature = e.features.find(f => f.id === editingIdRef.current)
        if (editedFeature) {
          const edited: EditedPolygon = {
            id: editingIdRef.current,
            geometry: editedFeature.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon
          }
          onEditComplete?.(edited)
        }
      } else {
        onUpdate?.(e.features)
      }
    }

    const handleDelete = (e: DrawEvent) => {
      onDelete?.(e.features)
    }

    map.on('draw.create', handleCreate)
    map.on('draw.update', handleUpdate)
    map.on('draw.delete', handleDelete)

    return () => {
      map.off('draw.create', handleCreate)
      map.off('draw.update', handleUpdate)
      map.off('draw.delete', handleDelete)

      if (map.hasControl(draw)) {
        map.removeControl(draw)
      }
    }
  }, [map, position, onCreate, onUpdate, onDelete])

  // Handle active state changes
  useEffect(() => {
    if (!drawRef.current) return

    if (active) {
      drawRef.current.changeMode('draw_polygon')
    } else if (!editingPolygon) {
      drawRef.current.changeMode('simple_select')
      drawRef.current.deleteAll()
    }
  }, [active, editingPolygon])

  // Handle editing polygon changes
  useEffect(() => {
    if (!drawRef.current || !map) return

    if (editingPolygon) {
      drawRef.current.deleteAll()
      const feature: GeoJSON.Feature = {
        id: editingPolygon.id,
        type: 'Feature',
        properties: {},
        geometry: editingPolygon.geometry
      }
      drawRef.current.add(feature)
      drawRef.current.changeMode('direct_select', { featureId: editingPolygon.id })
      editingIdRef.current = editingPolygon.id
    } else if (editingIdRef.current) {
      drawRef.current.deleteAll()
      editingIdRef.current = null
    }
  }, [editingPolygon, map])

  return null
})

DrawControl.displayName = 'DrawControl'

export default DrawControl
