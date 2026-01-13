/**
 * リスク判定サービス
 * 飛行計画のリスク分析、申請コスト計算
 */

import { checkAirspaceRestrictions, AIRPORT_ZONES, NO_FLY_ZONES, getDistanceMeters } from '../lib';
import { checkDIDArea } from './didService';
import { getPolygonCenter, calculatePolygonArea as getPolygonArea } from './waypointGenerator';
import { checkUTMConflicts } from './supportServices';

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
 * 全Waypointの空域制限をチェック
 */
export const checkAllWaypointsRestrictions = (waypoints) => {
  const allRestrictions = [];
  const checkedZones = new Set();

  for (const wp of waypoints) {
    const restrictions = checkAirspaceRestrictions(wp.lat, wp.lng);
    for (const r of restrictions) {
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
