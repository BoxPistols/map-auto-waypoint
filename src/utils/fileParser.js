import * as toGeoJSON from '@mapbox/togeojson'

// Parse GeoJSON file
export const parseGeoJSON = (content) => {
  try {
    const geojson = typeof content === 'string' ? JSON.parse(content) : content

    if (!geojson.type) {
      throw new Error('Invalid GeoJSON: missing type property')
    }

    // Extract polygons from FeatureCollection or single Feature
    const features = geojson.type === 'FeatureCollection'
      ? geojson.features
      : [geojson]

    const polygons = features
      .filter(f => f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'))
      .map(f => {
        // Handle MultiPolygon by converting to individual polygons
        if (f.geometry.type === 'MultiPolygon') {
          return f.geometry.coordinates.map((coords, i) => ({
            id: crypto.randomUUID(),
            name: f.properties?.name ? `${f.properties.name} (${i + 1})` : `Polygon ${i + 1}`,
            geometry: { type: 'Polygon', coordinates: coords },
            createdAt: Date.now(),
            color: f.properties?.color || getRandomColor()
          }))
        }

        return {
          id: crypto.randomUUID(),
          name: f.properties?.name || f.id || 'Imported Polygon',
          geometry: f.geometry,
          createdAt: Date.now(),
          color: f.properties?.color || getRandomColor()
        }
      })
      .flat()

    return { success: true, polygons }
  } catch (error) {
    console.error('GeoJSON parse error:', error)
    return { success: false, error: error.message }
  }
}

// Parse KML file
export const parseKML = (content) => {
  try {
    const parser = new DOMParser()
    const kml = parser.parseFromString(content, 'text/xml')

    // Check for parse errors
    const parseError = kml.querySelector('parsererror')
    if (parseError) {
      throw new Error('Invalid KML format')
    }

    // Convert KML to GeoJSON using @mapbox/togeojson
    const geojson = toGeoJSON.kml(kml)

    // Parse the converted GeoJSON
    return parseGeoJSON(geojson)
  } catch (error) {
    console.error('KML parse error:', error)
    return { success: false, error: error.message }
  }
}

// Parse file based on extension
export const parseFile = async (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    const extension = file.name.split('.').pop().toLowerCase()

    reader.onload = (e) => {
      const content = e.target.result

      switch (extension) {
        case 'json':
        case 'geojson':
          resolve(parseGeoJSON(content))
          break
        case 'kml':
          resolve(parseKML(content))
          break
        default:
          resolve({ success: false, error: `Unsupported file type: ${extension}` })
      }
    }

    reader.onerror = () => {
      resolve({ success: false, error: 'Failed to read file' })
    }

    reader.readAsText(file)
  })
}

// Validate polygon geometry
export const validatePolygon = (polygon) => {
  if (!polygon.geometry || polygon.geometry.type !== 'Polygon') {
    return { valid: false, error: 'Invalid polygon geometry' }
  }

  const coords = polygon.geometry.coordinates[0]
  if (!coords || coords.length < 4) {
    return { valid: false, error: 'Polygon must have at least 3 points' }
  }

  // Check if polygon is closed
  const first = coords[0]
  const last = coords[coords.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) {
    return { valid: false, error: 'Polygon is not closed' }
  }

  return { valid: true }
}

// Generate random color for polygons (青系で統一、DIDカラーとの被りを防ぐ)
const getRandomColor = () => {
  const colors = [
    '#45B7D1', '#4ECDC4', '#5DADE2', '#48C9B0',
    '#85C1E9', '#76D7C4', '#3498DB', '#1ABC9C',
    '#5499C7', '#45B39D'
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}
