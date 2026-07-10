/**
 * 飛行経路・ポリゴンの衝突判定
 * Waypoint間のパスやポリゴンが禁止エリアと交差するかを判定
 */

import {
  checkPathCollision,
  checkPolygonCollision
} from '../../lib';
import { generateAllProhibitedAreasGeoJSON } from './_spatialIndex';

/**
 * Waypoint間の飛行経路が禁止エリアを通過しているか判定
 * ポリゴンごとに分けて経路をチェック（異なるポリゴンのWaypointは接続しない）
 * 手動追加のWaypointは単独では経路チェックを行わない
 * @param {Array} waypoints - Waypoint配列
 * @returns {Object} 衝突結果 { isColliding, intersectionPoints, affectedSegments, message }
 */
export const checkFlightPathCollision = (waypoints) => {
  if (!waypoints || waypoints.length < 2) {
    return {
      isColliding: false,
      intersectionPoints: [],
      affectedSegments: [],
      message: '経路が不十分です'
    };
  }

  // ポリゴンIDでWaypointをグループ化
  // 手動追加のWaypointは各々別グループとして扱う（相互接続しない）
  const waypointsByPolygon = new Map();
  let manualWaypointCounter = 0;

  for (const wp of waypoints) {
    // ポリゴンに紐づいたWaypointのみグループ化
    // type='manual'や polygonId=null のWaypointは個別扱い
    let groupId;
    if (wp.polygonId) {
      groupId = wp.polygonId;
    } else if (wp.type === 'manual' || !wp.polygonName || wp.polygonName === '手動追加') {
      // 手動追加は個別グループ（経路チェックスキップ）
      groupId = `manual_${manualWaypointCounter++}`;
    } else if (wp.polygonName) {
      groupId = wp.polygonName;
    } else {
      // 不明なWaypointも個別扱い
      groupId = `unknown_${manualWaypointCounter++}`;
    }

    if (!waypointsByPolygon.has(groupId)) {
      waypointsByPolygon.set(groupId, []);
    }
    waypointsByPolygon.get(groupId).push(wp);
  }

  // デバッグ: グループ化結果をログ出力
  if (import.meta.env.DEV) {
    console.log('[PathCollision] Waypoint groups:',
      Array.from(waypointsByPolygon.entries()).map(([id, wps]) =>
        `${id}: ${wps.length}点 (indices: ${wps.map(w => w.index).join(',')})`
      )
    );
  }

  // 禁止エリアのGeoJSONを取得
  const prohibitedAreas = generateAllProhibitedAreasGeoJSON();

  // 結果を集約
  let hasAnyCollision = false;
  const allIntersectionPoints = [];
  const allAffectedSegments = [];
  let overallSeverity = 'SAFE';
  const messages = [];

  // 各ポリゴンの経路を個別にチェック
  for (const [polygonId, polygonWaypoints] of waypointsByPolygon.entries()) {
    // 2点以上必要
    if (polygonWaypoints.length < 2) continue;

    // Waypointをindex順にソートして座標配列を作成
    const sortedWaypoints = [...polygonWaypoints].sort((a, b) => a.index - b.index);
    const pathCoords = sortedWaypoints.map(wp => [wp.lng, wp.lat]);

    // 経路の衝突判定
    const result = checkPathCollision(pathCoords, prohibitedAreas);

    if (result.isColliding) {
      hasAnyCollision = true;
      allIntersectionPoints.push(...result.intersectionPoints);

      // 深刻度を更新（最も重いものを採用）
      if (result.severity === 'DANGER' || overallSeverity !== 'DANGER') {
        if (result.severity === 'DANGER') {
          overallSeverity = 'DANGER';
        } else if (result.severity === 'WARNING' && overallSeverity === 'SAFE') {
          overallSeverity = 'WARNING';
        }
      }

      // 影響を受けるセグメントを特定
      for (let i = 0; i < pathCoords.length - 1; i++) {
        const segmentCoords = [pathCoords[i], pathCoords[i + 1]];
        const segmentResult = checkPathCollision(segmentCoords, prohibitedAreas);
        if (segmentResult.isColliding) {
          allAffectedSegments.push({
            index: i,
            polygonId,
            fromWaypoint: sortedWaypoints[i],
            toWaypoint: sortedWaypoints[i + 1],
            intersectionCount: segmentResult.intersectionPoints.length
          });
        }
      }

      messages.push(result.message);
    }
  }

  return {
    isColliding: hasAnyCollision,
    intersectionPoints: allIntersectionPoints,
    affectedSegments: allAffectedSegments,
    severity: overallSeverity,
    message: hasAnyCollision ? messages.join('; ') : '経路は安全です'
  };
};

/**
 * 全ポリゴンが禁止エリアと重複しているか判定
 * @param {Array} polygons - ポリゴン配列
 * @returns {Object} 衝突結果 { hasCollisions, polygonResults, totalOverlapArea, intersectionPolygons }
 */
export const checkAllPolygonsCollision = (polygons) => {
  if (!polygons || polygons.length === 0) {
    return {
      hasCollisions: false,
      polygonResults: [],
      totalOverlapArea: 0,
      intersectionPolygons: []
    };
  }

  // 禁止エリアのGeoJSONを取得
  const prohibitedAreas = generateAllProhibitedAreasGeoJSON();

  const polygonResults = [];
  let totalOverlapArea = 0;
  const allIntersectionPolygons = [];

  for (const polygon of polygons) {
    if (!polygon?.geometry?.coordinates?.[0]) continue;

    const result = checkPolygonCollision(
      polygon.geometry.coordinates,
      prohibitedAreas
    );

    if (result.isColliding) {
      polygonResults.push({
        polygonId: polygon.id,
        polygonName: polygon.name,
        ...result
      });
      totalOverlapArea += result.overlapArea;

      // 交差ポリゴンを収集（可視化用）
      if (result.intersectionPolygons) {
        result.intersectionPolygons.forEach(ip => {
          allIntersectionPolygons.push({
            ...ip,
            properties: {
              ...ip.properties,
              polygonId: polygon.id,
              overlapRatio: result.overlapRatio,
              severity: result.severity
            }
          });
        });
      }
    }
  }

  return {
    hasCollisions: polygonResults.length > 0,
    polygonResults,
    totalOverlapArea,
    intersectionPolygons: allIntersectionPolygons
  };
};
