/**
 * Waypoint毎の詳細な衝突検出
 * RBush + 制限表面ベースのハイブリッド判定
 */

import {
  checkWaypointsCollisionBatch,
  getCollisionSummary,
  checkPointsInRestrictionSurfaces
} from '../../lib';
import { getSpatialIndex } from './_spatialIndex';

/**
 * Waypoint毎の詳細な衝突検出結果を取得
 * @param {Array} waypoints - Waypointリスト
 * @returns {Object} 詳細な衝突検出結果
 */
export const getDetailedCollisionResults = (waypoints) => {
  if (!waypoints || waypoints.length === 0) {
    return {
      results: new Map(),
      summary: { totalWaypoints: 0, collidingCount: 0, dangerCount: 0, warningCount: 0, safeCount: 0 },
      byType: {}
    };
  }

  const spatialIndex = getSpatialIndex();
  const waypointsForCheck = waypoints.map(wp => ({
    id: wp.id,
    coordinates: [wp.lng, wp.lat]
  }));

  const batchResults = checkWaypointsCollisionBatch(waypointsForCheck, spatialIndex);
  const summary = getCollisionSummary(waypointsForCheck, spatialIndex);

  // タイプ別に集計
  const byType = {};
  for (const [waypointId, result] of batchResults.entries()) {
    if (result.isColliding && result.collisionType) {
      const type = result.collisionType;
      if (!byType[type]) {
        byType[type] = { count: 0, waypointIds: [], severity: result.severity };
      }
      byType[type].count++;
      byType[type].waypointIds.push(waypointId);
    }
  }

  return {
    results: batchResults,
    summary,
    byType
  };
};

/**
 * Waypoint毎の制限表面（kokuarea）ベースの空港判定を取得
 * 円形radiusではなく、実際の制限表面ポリゴンで判定
 * @param {Array} waypoints - Waypointリスト
 * @returns {Promise<Map>} 各Waypointの制限表面判定結果
 */
export const checkWaypointsRestrictionSurfaces = async (waypoints) => {
  if (!waypoints || waypoints.length === 0) {
    return new Map();
  }

  const points = waypoints.map(wp => ({
    id: wp.id,
    lat: wp.lat,
    lng: wp.lng
  }));

  try {
    const results = await checkPointsInRestrictionSurfaces(points);
    return results;
  } catch (error) {
    console.warn('[RiskService] checkWaypointsRestrictionSurfaces error:', error);
    return new Map();
  }
};

/**
 * Waypoint毎の詳細な衝突検出結果を取得（制限表面対応版）
 * - 禁止区域（レッドゾーン、イエローゾーン等）: RBush空間インデックス
 * - 空港制限区域: 制限表面ポリゴン（kokuarea）ベース
 * @param {Array} waypoints - Waypointリスト
 * @param {Object} options - オプション
 * @param {Map} options.restrictionSurfaceResults - 事前に取得した制限表面判定結果（省略時はスキップ）
 * @returns {Object} 詳細な衝突検出結果
 */
export const getDetailedCollisionResultsWithRestrictionSurfaces = (waypoints, options = {}) => {
  const { restrictionSurfaceResults = null } = options;

  if (!waypoints || waypoints.length === 0) {
    return {
      results: new Map(),
      summary: { totalWaypoints: 0, collidingCount: 0, dangerCount: 0, warningCount: 0, safeCount: 0 },
      byType: {}
    };
  }

  const spatialIndex = getSpatialIndex();
  const waypointsForCheck = waypoints.map(wp => ({
    id: wp.id,
    coordinates: [wp.lng, wp.lat]
  }));

  // RBushによる禁止区域チェック（空港ゾーンを含む。空港の最終判定は制限表面結果で上書き）
  const batchResults = checkWaypointsCollisionBatch(waypointsForCheck, spatialIndex);

  // 結果をマージ：制限表面結果で空港判定を上書き
  const mergedResults = new Map();
  const byType = {};

  for (const [waypointId, rbushResult] of batchResults.entries()) {
    const rsResult = restrictionSurfaceResults?.get(waypointId);

    // 制限表面による空港判定があればそれを優先
    if (rsResult?.isInRestrictionSurface) {
      // 制限表面内 → 空港制限あり
      mergedResults.set(waypointId, {
        isColliding: true,
        collisionType: 'AIRPORT',
        areaName: rsResult.surfaceLabel || '制限表面内',
        severity: 'WARNING'
      });
      if (!byType['AIRPORT']) {
        byType['AIRPORT'] = { count: 0, waypointIds: [], severity: 'WARNING' };
      }
      byType['AIRPORT'].count++;
      byType['AIRPORT'].waypointIds.push(waypointId);
    } else if (rsResult && !rsResult.isInRestrictionSurface) {
      // 制限表面外 → 空港判定を除外（RBushの結果から空港タイプを除去）
      if (rbushResult.isColliding && (rbushResult.collisionType === 'AIRPORT' || rbushResult.collisionType === 'MILITARY')) {
        // RBushは空港判定したが、制限表面では外 → 空港判定を取り消し
        mergedResults.set(waypointId, {
          isColliding: false,
          collisionType: null,
          areaName: null,
          severity: 'SAFE'
        });
      } else {
        // 空港以外の衝突（禁止区域等）はそのまま
        mergedResults.set(waypointId, rbushResult);
        if (rbushResult.isColliding && rbushResult.collisionType) {
          const type = rbushResult.collisionType;
          if (!byType[type]) {
            byType[type] = { count: 0, waypointIds: [], severity: rbushResult.severity };
          }
          byType[type].count++;
          byType[type].waypointIds.push(waypointId);
        }
      }
    } else {
      // 制限表面データなし → RBush結果をそのまま使用（フォールバック）
      mergedResults.set(waypointId, rbushResult);
      if (rbushResult.isColliding && rbushResult.collisionType) {
        const type = rbushResult.collisionType;
        if (!byType[type]) {
          byType[type] = { count: 0, waypointIds: [], severity: rbushResult.severity };
        }
        byType[type].count++;
        byType[type].waypointIds.push(waypointId);
      }
    }
  }

  // サマリー計算
  let collidingCount = 0;
  let dangerCount = 0;
  let warningCount = 0;
  for (const result of mergedResults.values()) {
    if (result.isColliding) {
      collidingCount++;
      if (result.severity === 'DANGER') dangerCount++;
      else if (result.severity === 'WARNING') warningCount++;
    }
  }

  return {
    results: mergedResults,
    summary: {
      totalWaypoints: waypoints.length,
      collidingCount,
      dangerCount,
      warningCount,
      safeCount: waypoints.length - collidingCount
    },
    byType
  };
};
