/**
 * Polygon Geometry Utilities
 * Utility functions for working with polygon GeoJSON geometries
 */

/**
 * Extract coordinates from a polygon GeoJSON geometry
 * @param {Object} geometry - GeoJSON Polygon geometry
 * @returns {Array<{lat: number, lng: number}>} Array of coordinate objects
 */
export const extractPolygonCoordinates = (geometry) => {
  if (!geometry || geometry.type !== 'Polygon' || !geometry.coordinates) {
    return []
  }
  
  // For Polygon geometry: coordinates[0] is the outer ring
  const ring = geometry.coordinates[0]
  
  // Convert [lng, lat] to { lat, lng } and exclude the last point (which duplicates the first)
  return ring.slice(0, -1).map(([lng, lat]) => ({ lat, lng }))
}
