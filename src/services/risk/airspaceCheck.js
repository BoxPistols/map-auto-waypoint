/**
 * 空域制限チェック
 * 各Waypointに対する空港・禁止区域などのチェックを提供
 */

import {
  checkAirspaceRestrictions,
  AIRPORT_ZONES,
  getDistanceMeters,
  checkWaypointsCollisionBatch
} from '../../lib';
import { getSpatialIndex } from './_spatialIndex';

/**
 * 最寄りの空港を検索
 */
export const findNearestAirport = (lat, lng) => {
  let nearest = null;
  let minDistance = Infinity;

  for (const airport of AIRPORT_ZONES) {
    const distance = getDistanceMeters(lat, lng, airport.lat, airport.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = { ...airport, distance: Math.round(distance) };
    }
  }
  return nearest;
};

/**
 * 全Waypointの空域制限をチェック（RBush版）
 * Phase 2: 空間インデックスによる高速バッチ処理
 */
export const checkAllWaypointsRestrictions = (waypoints) => {
  if (!waypoints || waypoints.length === 0) {
    return [];
  }

  const spatialIndex = getSpatialIndex();
  const allRestrictions = [];
  const checkedZones = new Set();

  // RBushによるバッチ衝突検出
  const waypointsForCheck = waypoints.map(wp => ({
    id: wp.id,
    coordinates: [wp.lng, wp.lat]
  }));

  const batchResults = checkWaypointsCollisionBatch(waypointsForCheck, spatialIndex);

  // 衝突結果を旧形式に変換（後方互換性）
  // batchResultsはMap<string, WaypointCollisionResult>
  for (const [_waypointId, result] of batchResults.entries()) {
    if (result.isColliding) {
      const key = `${result.collisionType}-${result.areaName}`;
      if (!checkedZones.has(key)) {
        checkedZones.add(key);
        allRestrictions.push({
          type: result.collisionType === 'AIRPORT' || result.collisionType === 'MILITARY'
            ? 'airport'
            : 'prohibited',
          name: result.areaName || result.collisionType,
          severity: result.severity === 'DANGER' ? 'critical' : 'high',
          distance: 0, // RBush版では距離計算なし
          radius: 0
        });
      }
    }
  }

  // フォールバック: レガシー版でも確認（補完）
  for (const wp of waypoints) {
    const legacyRestrictions = checkAirspaceRestrictions(wp.lat, wp.lng);
    for (const r of legacyRestrictions) {
      const key = `${r.type}-${r.name}`;
      if (!checkedZones.has(key)) {
        checkedZones.add(key);
        allRestrictions.push(r);
      }
    }
  }

  return allRestrictions;
};
