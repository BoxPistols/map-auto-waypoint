import * as turf from '@turf/turf'

/**
 * 自分のポリゴンと外部ポリゴンの競合を計算
 * @param {Array} polygons - 全ポリゴン（own + external）
 * @returns {Object} polygonId -> Array<ConflictHit> のマップ
 */
export const computePolygonConflicts = (polygons) => {
  const ownPolygons = polygons.filter(p => !p.external)
  const externalPolygons = polygons.filter(p => p.external)
  if (ownPolygons.length === 0 || externalPolygons.length === 0) return {}

  const conflicts = {}
  for (const own of ownPolygons) {
    const hits = []
    for (const ext of externalPolygons) {
      try {
        const ownFeature = turf.polygon(own.geometry.coordinates)
        const extFeature = turf.polygon(ext.geometry.coordinates)
        if (!turf.booleanIntersects(ownFeature, extFeature)) continue
        const intersection = turf.intersect(turf.featureCollection([ownFeature, extFeature]))
        if (intersection) {
          const overlapArea = turf.area(intersection)
          const ownArea = turf.area(ownFeature)
          const overlapRatio = Math.round((overlapArea / ownArea) * 100)

          // Check time overlap
          let timeOverlap = false
          if (own.flightInfo && ext.flightInfo && own.flightInfo.date === ext.flightInfo.date) {
            const oS = own.flightInfo.timeStart?.replace(':', '') || '0'
            const oE = own.flightInfo.timeEnd?.replace(':', '') || '0'
            const eS = ext.flightInfo.timeStart?.replace(':', '') || '0'
            const eE = ext.flightInfo.timeEnd?.replace(':', '') || '0'
            timeOverlap = oS < eE && eS < oE
          }

          hits.push({
            externalName: ext.name,
            operator: ext.operator,
            overlapRatio,
            timeOverlap,
            severity: (overlapRatio > 20 || timeOverlap) ? 'DANGER' : 'WARNING'
          })
        }
      } catch {
        // skip invalid geometry
      }
    }
    if (hits.length > 0) {
      conflicts[own.id] = hits
    }
  }
  return conflicts
}
