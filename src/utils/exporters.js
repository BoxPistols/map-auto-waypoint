// Export waypoints to JSON
export const exportToJSON = (waypoints, filename = null) => {
  const date = new Date().toISOString().split('T')[0]
  const data = waypoints.map((wp, index) => ({
    number: index + 1,
    latitude: wp.lat,
    longitude: wp.lng,
    polygonName: wp.polygonName || '',
    type: wp.type || 'vertex'
  }))

  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename || `waypoints_${date}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Export waypoints to CSV
export const exportToCSV = (waypoints, filename = null) => {
  const date = new Date().toISOString().split('T')[0]
  const BOM = '\uFEFF' // UTF-8 BOM for Excel

  const headers = ['番号', '緯度', '経度', 'ポリゴン名', '種別']
  const rows = waypoints.map((wp, index) => {
    const polygonName = wp.polygonName || ''
    const type = wp.type === 'manual' ? '手動' : '頂点'
    return [
      index + 1,
      wp.lat.toFixed(6),
      wp.lng.toFixed(6),
      `"${polygonName.replace(/"/g, '""')}"`,
      type
    ].join(',')
  })

  const csv = BOM + [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename || `waypoints_${date}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Export polygons to GeoJSON
export const exportPolygonsToGeoJSON = (polygons, filename = null) => {
  const date = new Date().toISOString().split('T')[0]

  const geojson = {
    type: 'FeatureCollection',
    features: polygons.map(polygon => ({
      type: 'Feature',
      id: polygon.id,
      properties: {
        name: polygon.name,
        color: polygon.color,
        createdAt: polygon.createdAt
      },
      geometry: polygon.geometry
    }))
  }

  const json = JSON.stringify(geojson, null, 2)
  const blob = new Blob([json], { type: 'application/geo+json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename || `polygons_${date}.geojson`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Export full backup
export const exportFullBackup = (data, filename = null) => {
  const date = new Date().toISOString().split('T')[0]
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename || `drone_waypoint_backup_${date}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
