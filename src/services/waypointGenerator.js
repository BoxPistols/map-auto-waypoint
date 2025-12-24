import * as turf from '@turf/turf'

// Extract waypoints from polygon vertices
export const polygonToWaypoints = (polygon) => {
  if (!polygon.geometry || polygon.geometry.type !== 'Polygon') {
    return []
  }

  // Get outer ring coordinates (excluding the closing point)
  const coords = polygon.geometry.coordinates[0].slice(0, -1)

  return coords.map((coord, index) => ({
    id: crypto.randomUUID(),
    lat: coord[1],
    lng: coord[0],
    index: index + 1,
    polygonId: polygon.id,
    polygonName: polygon.name,
    type: 'vertex'
  }))
}

// Generate grid waypoints inside polygon for thorough inspection
export const generateGridWaypoints = (polygon, spacingMeters = 50) => {
  if (!polygon.geometry || polygon.geometry.type !== 'Polygon') {
    return []
  }

  try {
    const turfPolygon = turf.polygon(polygon.geometry.coordinates)
    const bbox = turf.bbox(turfPolygon)

    // Create point grid
    const grid = turf.pointGrid(bbox, spacingMeters, {
      units: 'meters',
      mask: turfPolygon
    })

    return grid.features.map((point, index) => ({
      id: crypto.randomUUID(),
      lat: point.geometry.coordinates[1],
      lng: point.geometry.coordinates[0],
      index: index + 1,
      polygonId: polygon.id,
      polygonName: polygon.name,
      type: 'grid'
    }))
  } catch (error) {
    console.error('Grid generation error:', error)
    return []
  }
}

// Generate all waypoints from multiple polygons
export const generateAllWaypoints = (polygons, options = {}) => {
  const { includeGrid = false, gridSpacing = 50 } = options

  let allWaypoints = []
  let globalIndex = 1

  polygons.forEach(polygon => {
    // Always include vertex waypoints
    const vertexWaypoints = polygonToWaypoints(polygon)
    vertexWaypoints.forEach(wp => {
      wp.index = globalIndex++
      allWaypoints.push(wp)
    })

    // Optionally include grid waypoints
    if (includeGrid) {
      const gridWaypoints = generateGridWaypoints(polygon, gridSpacing)
      gridWaypoints.forEach(wp => {
        wp.index = globalIndex++
        allWaypoints.push(wp)
      })
    }
  })

  return allWaypoints
}

// Calculate polygon area in square meters
export const calculatePolygonArea = (polygon) => {
  if (!polygon.geometry || polygon.geometry.type !== 'Polygon') {
    return 0
  }

  try {
    const turfPolygon = turf.polygon(polygon.geometry.coordinates)
    return turf.area(turfPolygon)
  } catch (error) {
    console.error('Area calculation error:', error)
    return 0
  }
}

// Calculate polygon perimeter in meters
export const calculatePolygonPerimeter = (polygon) => {
  if (!polygon.geometry || polygon.geometry.type !== 'Polygon') {
    return 0
  }

  try {
    const turfPolygon = turf.polygon(polygon.geometry.coordinates)
    const line = turf.polygonToLine(turfPolygon)
    return turf.length(line, { units: 'meters' })
  } catch (error) {
    console.error('Perimeter calculation error:', error)
    return 0
  }
}

// Get polygon centroid
export const getPolygonCenter = (polygon) => {
  if (!polygon.geometry || polygon.geometry.type !== 'Polygon') {
    return null
  }

  try {
    const turfPolygon = turf.polygon(polygon.geometry.coordinates)
    const centroid = turf.centroid(turfPolygon)
    return {
      lat: centroid.geometry.coordinates[1],
      lng: centroid.geometry.coordinates[0]
    }
  } catch (error) {
    console.error('Centroid calculation error:', error)
    return null
  }
}

// Format area for display
export const formatArea = (areaM2) => {
  if (areaM2 >= 1000000) {
    return `${(areaM2 / 1000000).toFixed(2)} km²`
  } else if (areaM2 >= 10000) {
    return `${(areaM2 / 10000).toFixed(2)} ha`
  } else {
    return `${areaM2.toFixed(0)} m²`
  }
}

// Format distance for display
export const formatDistance = (meters) => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`
  } else {
    return `${meters.toFixed(0)} m`
  }
}
