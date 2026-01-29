/**
 * リスク判定サービス
 * 飛行計画のリスク分析、申請コスト計算
 *
 * Phase 2対応: RBush空間インデックスによる高速衝突検出を使用
 */

import {
  checkAirspaceRestrictions,
  AIRPORT_ZONES,
  getDistanceMeters,
  // 新しいCollisionService (RBush版)
  CollisionService,
  createSpatialIndex,
  checkWaypointsCollisionBatch,
  getCollisionSummary,
  checkPathCollision,
  checkPolygonCollision,
  ZONE_PRIORITY,
  // GeoJSON生成関数
  generateAirportGeoJSON,
  generateAllNoFlyGeoJSON,
  // 制限表面による正確な空港判定
  checkPointsInRestrictionSurfaces
} from '../lib';
import { checkDIDArea } from './didService';
import { getPolygonCenter, calculatePolygonArea as getPolygonArea } from './waypointGenerator';
import { checkUTMConflicts } from './supportServices';

// グローバル空間インデックス（初期化後に再利用）
let globalSpatialIndex = null;

/**
 * 全禁止区域のGeoJSONを結合して生成
 */
const generateAllProhibitedAreasGeoJSON = () => {
  const airportGeoJSON = generateAirportGeoJSON();
  const noFlyGeoJSON = generateAllNoFlyGeoJSON();

  return {
    type: 'FeatureCollection',
    features: [
      ...airportGeoJSON.features,
      ...noFlyGeoJSON.features
    ]
  };
};

/**
 * 空間インデックスを取得（遅延初期化）
 */
const getSpatialIndex = () => {
  if (!globalSpatialIndex) {
    const prohibitedAreas = generateAllProhibitedAreasGeoJSON();
    globalSpatialIndex = createSpatialIndex(prohibitedAreas);
  }
  return globalSpatialIndex;
};

/**
 * 申請区分と費用データ
 */
const APPLICATION_CATEGORIES = {
  DID: {
    name: 'DID上空飛行',
    baseDays: 10,
    documents: ['飛行計画書', '機体情報'],
    coordination: [{ stakeholder: '地権者', leadTime: 7 }]
  },
  AIRPORT: {
    name: '空港等周辺飛行',
    baseDays: 14,
    documents: ['飛行計画書', '空域図'],
    coordination: [{ stakeholder: '空港事務所', leadTime: 14, required: true }]
  },
  HIGH_ALTITUDE: {
    name: '150m以上の高高度飛行',
    baseDays: 14,
    documents: ['高度計画図'],
    coordination: [{ stakeholder: '航空局', leadTime: 14 }]
  },
  BVLOS: {
    name: '目視外飛行',
    baseDays: 10,
    documents: ['通信計画'],
    coordination: []
  }
};

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

/**
 * ローカルリスク判定
 */
export const analyzeFlightPlanLocal = async (polygons, waypoints, options = {}) => {
  const { altitude = 50 } = options;
  const polygon = polygons[0];
  const center = polygon ? getPolygonCenter(polygon) : null;
  const areaSqMeters = polygon ? getPolygonArea(polygon) : 0;

  // 1. 空域制限チェック
  const restrictions = waypoints.length > 0
    ? checkAllWaypointsRestrictions(waypoints)
    : center ? checkAirspaceRestrictions(center.lat, center.lng) : [];

  // 2. 最寄り空港
  const nearestAirport = center ? findNearestAirport(center.lat, center.lng) : null;

  // 3. DIDチェック
  const waypointDIDCheck = waypoints.length > 0
    ? await checkAllWaypointsDID(waypoints)
    : null;

  const didInfo = waypointDIDCheck?.hasDIDWaypoints
    ? { isDID: true, description: 'DID内のWPがあります', waypointDetails: waypointDIDCheck }
    : { isDID: false, description: 'DID外です' };

  // 4. リスクスコア計算
  let riskScore = 0;
  const risks = [];

  if (didInfo.isDID) {
    riskScore += 25;
    if (waypointDIDCheck?.didCount > 3) riskScore += 10;
    risks.push({ type: 'did_area', description: '人口集中地区内', severity: 'medium' });
  }

  const criticalZones = restrictions.filter(r => r.severity === 'critical');
  if (criticalZones.length > 0) {
    riskScore += 80;
    risks.push({ type: 'prohibited_zone', description: '飛行禁止区域内', severity: 'critical' });
  }

  const airportZones = restrictions.filter(r => r.type === 'airport');
  if (airportZones.length > 0) {
    riskScore += 50;
    risks.push({ type: 'airport_proximity', description: '空港制限区域内', severity: 'high' });
  }

  if (altitude > 150) {
    riskScore += 30;
    risks.push({ type: 'high_altitude', description: '高度150m超過', severity: 'high' });
  }

  let riskLevel = 'LOW';
  if (riskScore >= 80) riskLevel = 'CRITICAL';
  else if (riskScore >= 50) riskLevel = 'HIGH';
  else if (riskScore >= 20) riskLevel = 'MEDIUM';

  // 推奨事項の生成
  const recommendations = [];
  if (didInfo.isDID) {
    recommendations.push('DID上空飛行の許可申請が必要です');
  }
  if (restrictions.some(r => r.type === 'airport')) {
    recommendations.push('空港周辺飛行の許可申請が必要です');
  }
  if (altitude > 150) {
    recommendations.push('高度150m超の飛行許可申請が必要です');
  }
  if (recommendations.length === 0) {
    recommendations.push('特別な許可は不要です（包括申請の範囲内）');
  }

  // 必要な許可リスト
  const requiredPermissions = [];
  if (didInfo.isDID) requiredPermissions.push('DID上空飛行許可');
  if (restrictions.some(r => r.type === 'airport')) requiredPermissions.push('空港周辺飛行許可');
  if (altitude > 150) requiredPermissions.push('150m以上飛行許可');

  // 承認日数の見積もり
  let estimatedApprovalDays = 0;
  if (requiredPermissions.length > 0) {
    estimatedApprovalDays = requiredPermissions.length * 10;
  }

  // サマリー生成
  const summary = riskLevel === 'LOW'
    ? '飛行計画は安全な範囲内です。'
    : riskLevel === 'MEDIUM'
    ? '注意が必要な飛行計画です。'
    : riskLevel === 'HIGH'
    ? '高リスクの飛行計画です。許可申請を推奨します。'
    : '重大なリスクがあります。飛行計画の見直しを強く推奨します。';

  // UTMチェック
  const utmCheck = center ? checkUTMConflicts({ center }) : { checked: false, message: '位置情報なし', conflicts: [] };

  return {
    riskLevel,
    riskScore: Math.min(100, riskScore),
    risks,
    recommendations,
    requiredPermissions,
    estimatedApprovalDays,
    summary,
    safetyChecklist: ['飛行前点検', '気象確認', '緊急連絡先確認'],
    utmCheck,
    context: {
      center,
      areaSqMeters,
      restrictions,
      nearestAirport,
      didInfo,
      waypointCount: waypoints.length
    }
  };
};

/**
 * 申請コスト計算
 */
export const calculateApplicationCosts = (analysisResult) => {
  const { risks, context } = analysisResult;
  const applications = [];
  let totalDays = 0;

  if (context?.didInfo?.isDID) {
    applications.push({ type: 'DID', name: 'DID上空飛行', estimatedDays: 10 });
    totalDays = Math.max(totalDays, 10);
  }
  if (risks.some(r => r.type === 'airport_proximity')) {
    applications.push({ type: 'AIRPORT', name: '空港周辺飛行', estimatedDays: 14 });
    totalDays = Math.max(totalDays, 14);
  }
  
  // 標準でBVLOS追加
  applications.push({ type: 'BVLOS', name: '目視外飛行', estimatedDays: 10 });
  totalDays = Math.max(totalDays, 10);

  return {
    applications,
    totalEstimatedDays: totalDays,
    totalEstimatedCost: 0, // 簡易化
    requiredDocuments: ['飛行計画書'],
    timeline: [],
    tips: ['DIPSでの申請を推奨']
  };
};

// ============================================
// 新規追加: RBush版衝突検出API（Phase 2）
// ============================================

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
 * 空間インデックスを強制リフレッシュ
 * カスタムレイヤー追加時などに使用
 */
export const refreshSpatialIndex = () => {
  const prohibitedAreas = generateAllProhibitedAreasGeoJSON();
  globalSpatialIndex = createSpatialIndex(prohibitedAreas);
  return globalSpatialIndex;
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

/**
 * CollisionServiceを直接エクスポート
 */
export { CollisionService };
