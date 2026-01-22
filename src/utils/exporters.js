// 10進数の緯度経度を度分秒（DMS）に変換
const decimalToDMS = (decimal, isLatitude = true) => {
  const absolute = Math.abs(decimal)
  const degrees = Math.floor(absolute)
  const minutesDecimal = (absolute - degrees) * 60
  const minutes = Math.floor(minutesDecimal)
  const seconds = Math.round((minutesDecimal - minutes) * 60)

  // Handle 60 seconds rollover
  let finalSeconds = seconds
  let finalMinutes = minutes
  let finalDegrees = degrees

  if (finalSeconds === 60) {
    finalSeconds = 0
    finalMinutes += 1
  }
  if (finalMinutes === 60) {
    finalMinutes = 0
    finalDegrees += 1
  }

  const prefix = isLatitude ? '北緯' : '東経'
  return `${prefix}${finalDegrees}°${finalMinutes}'${finalSeconds}"`
}

const formatCoordinateDMS = (lat, lng) => {
  return `${decimalToDMS(lat, true)} ${decimalToDMS(lng, false)}`
}

const escapeXml = (value) => {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

const buildWaypointKML = (waypoints) => {
  const placemarks = waypoints.map((wp, index) => {
    const name = escapeXml(wp.polygonName || `Waypoint ${index + 1}`)
    const altitude = Number.isFinite(wp.elevation) ? wp.elevation : 0
    return [
      '<Placemark>',
      `  <name>${name}</name>`,
      '  <Point>',
      `    <coordinates>${wp.lng},${wp.lat},${altitude}</coordinates>`,
      '  </Point>',
      '</Placemark>'
    ].join('\n')
  })

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<kml xmlns="http://www.opengis.net/kml/2.2">',
    '  <Document>',
    '    <name>Waypoints</name>',
    placemarks.join('\n'),
    '  </Document>',
    '</kml>'
  ].join('\n')
}

const buildPolygonKML = (polygons) => {
  const placemarks = polygons.flatMap((polygon, index) => {
    const name = escapeXml(polygon.name || `Polygon ${index + 1}`)
    const geometry = polygon.geometry
    if (!geometry) return []

    const polygonCoords = geometry.type === 'Polygon'
      ? [geometry.coordinates]
      : geometry.type === 'MultiPolygon'
      ? geometry.coordinates
      : []

    return polygonCoords.map((rings, ringIndex) => {
      const [outerRing, ...innerRings] = rings
      const outerCoords = outerRing
        .map(([lng, lat]) => `${lng},${lat},0`)
        .join(' ')

      const innerBlocks = innerRings.map(ring => {
        const coords = ring.map(([lng, lat]) => `${lng},${lat},0`).join(' ')
        return [
          '      <innerBoundaryIs>',
          '        <LinearRing>',
          `          <coordinates>${coords}</coordinates>`,
          '        </LinearRing>',
          '      </innerBoundaryIs>'
        ].join('\n')
      })

      return [
        '<Placemark>',
        `  <name>${name}${ringIndex > 0 ? ` (${ringIndex + 1})` : ''}</name>`,
        '  <Polygon>',
        '    <outerBoundaryIs>',
        '      <LinearRing>',
        `        <coordinates>${outerCoords}</coordinates>`,
        '      </LinearRing>',
        '    </outerBoundaryIs>',
        innerBlocks.join('\n'),
        '  </Polygon>',
        '</Placemark>'
      ].filter(Boolean).join('\n')
    })
  })

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<kml xmlns="http://www.opengis.net/kml/2.2">',
    '  <Document>',
    '    <name>Polygons</name>',
    placemarks.join('\n'),
    '  </Document>',
    '</kml>'
  ].join('\n')
}

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

// DMS形式でWaypointをCSVにエクスポート
export const exportToDMSCSV = (waypoints, filename = null) => {
  const date = new Date().toISOString().split('T')[0]
  const BOM = '\uFEFF'

  const headers = ['番号', '緯度（DMS）', '経度（DMS）', 'ポリゴン名', '種別']
  const rows = waypoints.map((wp, index) => {
    const polygonName = wp.polygonName || ''
    const type = wp.type === 'manual' ? '手動' : '頂点'
    return [
      index + 1,
      decimalToDMS(wp.lat, true),
      decimalToDMS(wp.lng, false),
      `"${polygonName.replace(/"/g, '""')}"`,
      type
    ].join(',')
  })

  const csv = BOM + [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename || `waypoints_dms_${date}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// WaypointをKMLにエクスポート
export const exportWaypointsToKML = (waypoints, filename = null) => {
  const date = new Date().toISOString().split('T')[0]
  const kml = buildWaypointKML(waypoints)
  const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename || `waypoints_${date}.kml`
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

// WaypointをDMSテキスト形式でエクスポート
// altitudes: { [polygonId]: number } - ポリゴンごとの高度
export const exportToDMS = (waypoints, polygons = [], altitudes = {}, filename = null) => {
  const date = new Date().toISOString().split('T')[0]
  const BOM = '\uFEFF' // UTF-8 BOM for Excel

  // Group waypoints by polygon
  const waypointsByPolygon = {}
  const polygonOrder = []

  waypoints.forEach(wp => {
    const polygonId = wp.polygonId || 'unknown'
    if (!waypointsByPolygon[polygonId]) {
      waypointsByPolygon[polygonId] = []
      polygonOrder.push(polygonId)
    }
    waypointsByPolygon[polygonId].push(wp)
  })

  // Build text content
  let content = '■ 飛行範囲\n\n'

  polygonOrder.forEach((polygonId, index) => {
    const wps = waypointsByPolygon[polygonId]
    const polygon = polygons.find(p => p.id === polygonId)
    const polygonName = polygon?.name || wps[0]?.polygonName || `範囲${index + 1}`

    content += `【範囲${index + 1} ${polygonName}】\n`

    wps.forEach(wp => {
      content += formatCoordinateDMS(wp.lat, wp.lng) + '\n'
    })

    content += '\n'
  })

  // Add altitude section with values
  content += '\n■ 飛行高度\n\n'
  polygonOrder.forEach((polygonId, index) => {
    const polygon = polygons.find(p => p.id === polygonId)
    const polygonName = polygon?.name || `範囲${index + 1}`
    const altitude = altitudes[polygonId]
    const altitudeStr = altitude ? `${altitude}` : '    '

    content += `【範囲${index + 1} ${polygonName}】\n`
    content += `下限：地表面、上限：海抜高度 ${altitudeStr} m\n\n`
  })

  const blob = new Blob([BOM + content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename || `waypoints_dms_${date}.txt`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ポリゴンをKMLにエクスポート
export const exportPolygonsToKML = (polygons, filename = null) => {
  const date = new Date().toISOString().split('T')[0]
  const kml = buildPolygonKML(polygons)
  const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename || `polygons_${date}.kml`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Get polygon order from waypoints (for altitude input UI)
export const getPolygonOrderFromWaypoints = (waypoints, polygons) => {
  const seen = new Set()
  const result = []

  waypoints.forEach(wp => {
    const polygonId = wp.polygonId || 'unknown'
    if (!seen.has(polygonId)) {
      seen.add(polygonId)
      const polygon = polygons.find(p => p.id === polygonId)
      result.push({
        id: polygonId,
        name: polygon?.name || wp.polygonName || `範囲${result.length + 1}`,
        color: polygon?.color || '#888'
      })
    }
  })

  return result
}

// DMSテキストプレビュー生成
export const generateDMSPreview = (waypoints, polygons = [], altitudes = {}) => {
  // Group waypoints by polygon
  const waypointsByPolygon = {}
  const polygonOrder = []

  waypoints.forEach(wp => {
    const polygonId = wp.polygonId || 'unknown'
    if (!waypointsByPolygon[polygonId]) {
      waypointsByPolygon[polygonId] = []
      polygonOrder.push(polygonId)
    }
    waypointsByPolygon[polygonId].push(wp)
  })

  // Build preview content
  let content = '■ 飛行範囲\n\n'

  polygonOrder.forEach((polygonId, index) => {
    const wps = waypointsByPolygon[polygonId]
    const polygon = polygons.find(p => p.id === polygonId)
    const polygonName = polygon?.name || wps[0]?.polygonName || `範囲${index + 1}`

    content += `【範囲${index + 1} ${polygonName}】\n`

    wps.forEach(wp => {
      content += formatCoordinateDMS(wp.lat, wp.lng) + '\n'
    })

    content += '\n'
  })

  content += '\n■ 飛行高度\n\n'
  polygonOrder.forEach((polygonId, index) => {
    const polygon = polygons.find(p => p.id === polygonId)
    const polygonName = polygon?.name || `範囲${index + 1}`
    const altitude = altitudes[polygonId]
    const altitudeStr = altitude ? `${altitude}` : '____'

    content += `【範囲${index + 1} ${polygonName}】\n`
    content += `下限：地表面、上限：海抜高度 ${altitudeStr} m\n\n`
  })

  return content
}

export const generateWaypointKMLPreview = (waypoints) => {
  return buildWaypointKML(waypoints)
}

export const generatePolygonKMLPreview = (polygons) => {
  return buildPolygonKML(polygons)
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
