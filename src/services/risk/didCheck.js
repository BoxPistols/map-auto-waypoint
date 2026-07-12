/**
 * Waypoint DID判定
 * 人口集中地区（DID）に位置するWaypointの検出
 */

import { checkDIDArea } from '../didService';

/**
 * 全WaypointのDID判定を実行
 */
export const checkAllWaypointsDID = async (waypoints) => {
  if (!waypoints || waypoints.length === 0) {
    return { hasDIDWaypoints: false, didWaypoints: [], summary: 'Waypointなし' };
  }

  const didWaypoints = [];
  const checkedAreas = new Map();

  for (const wp of waypoints) {
    const didResult = await checkDIDArea(wp.lat, wp.lng);
    if (didResult?.isDID) {
      didWaypoints.push({
        waypointId: wp.id,
        waypointIndex: wp.index,
        lat: wp.lat,
        lng: wp.lng,
        area: didResult.area,
        centroid: didResult.centroid  // DIDエリアの重心座標（回避位置計算に使用）
      });
      const areaName = didResult.area || '不明';
      if (!checkedAreas.has(areaName)) checkedAreas.set(areaName, []);
      checkedAreas.get(areaName).push(wp.index);
    }
  }

  const areaSummaries = Array.from(checkedAreas.entries()).map(([area, indices]) => ({
    area, waypointIndices: indices, count: indices.length
  }));

  return {
    hasDIDWaypoints: didWaypoints.length > 0,
    didWaypoints,
    areaSummaries,
    didCount: didWaypoints.length
  };
};
