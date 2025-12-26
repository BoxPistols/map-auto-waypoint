/**
 * フライト分析サービス
 *
 * 実データに基づくドローン飛行のリスク判定
 * - 空港・禁止区域との距離計算
 * - DID（人口集中地区）判定
 * - OpenAI連携による総合分析
 */

import * as turf from '@turf/turf';
import { checkAirspaceRestrictions, AIRPORT_ZONES, NO_FLY_ZONES } from './airspace';
import { analyzeFlightPlan, getRecommendedParameters, hasApiKey } from './openaiService';
import { getLocationInfo, hasReinfolibApiKey } from './reinfolibService';

/**
 * ポリゴンの中心座標を計算
 */
export const getPolygonCenter = (polygon) => {
  if (!polygon?.geometry?.coordinates?.[0]) return null;

  const coords = polygon.geometry.coordinates[0];
  const lats = coords.map(c => c[1]);
  const lngs = coords.map(c => c[0]);

  return {
    lat: (Math.min(...lats) + Math.max(...lats)) / 2,
    lng: (Math.min(...lngs) + Math.max(...lngs)) / 2
  };
};

/**
 * ポリゴンの面積を計算（平方メートル）
 */
export const getPolygonArea = (polygon) => {
  if (!polygon?.geometry) return 0;

  try {
    const turfPolygon = turf.polygon(polygon.geometry.coordinates);
    return turf.area(turfPolygon);
  } catch {
    return 0;
  }
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
 * 2点間の距離を計算（メートル）
 */
const getDistanceMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * ローカルリスク判定（OpenAI不要）
 */
export const analyzeFlightPlanLocal = (polygons, waypoints, options = {}) => {
  const { altitude = 50, purpose = '' } = options;

  // 基本情報収集
  const polygon = polygons[0];
  const center = polygon ? getPolygonCenter(polygon) : null;
  const areaSqMeters = polygon ? getPolygonArea(polygon) : 0;

  // 空域制限チェック
  const restrictions = waypoints.length > 0
    ? checkAllWaypointsRestrictions(waypoints)
    : center
      ? checkAirspaceRestrictions(center.lat, center.lng)
      : [];

  // 最寄り空港
  const nearestAirport = center ? findNearestAirport(center.lat, center.lng) : null;

  // リスクスコア計算
  let riskScore = 0;
  const risks = [];

  // 禁止区域チェック
  const criticalZones = restrictions.filter(r => r.severity === 'critical');
  if (criticalZones.length > 0) {
    riskScore += 80;
    risks.push({
      type: 'prohibited_zone',
      description: `飛行禁止区域内: ${criticalZones.map(z => z.name).join(', ')}`,
      severity: 'critical'
    });
  }

  // 空港近接チェック
  const airportZones = restrictions.filter(r => r.type === 'airport');
  if (airportZones.length > 0) {
    riskScore += 50;
    risks.push({
      type: 'airport_proximity',
      description: `空港制限区域内: ${airportZones.map(z => `${z.name}(${z.distance}m)`).join(', ')}`,
      severity: 'high'
    });
  } else if (nearestAirport && nearestAirport.distance < 15000) {
    riskScore += 20;
    risks.push({
      type: 'airport_nearby',
      description: `空港が近隣: ${nearestAirport.name}まで${(nearestAirport.distance / 1000).toFixed(1)}km`,
      severity: 'medium'
    });
  }

  // 高度チェック
  if (altitude > 150) {
    riskScore += 30;
    risks.push({
      type: 'high_altitude',
      description: `飛行高度${altitude}mは150m超過（航空法制限）`,
      severity: 'high'
    });
  } else if (altitude > 100) {
    riskScore += 10;
    risks.push({
      type: 'altitude_warning',
      description: `飛行高度${altitude}m - 注意が必要`,
      severity: 'low'
    });
  }

  // リスクレベル判定
  let riskLevel;
  if (riskScore >= 80) riskLevel = 'CRITICAL';
  else if (riskScore >= 50) riskLevel = 'HIGH';
  else if (riskScore >= 20) riskLevel = 'MEDIUM';
  else riskLevel = 'LOW';

  // 推奨事項
  const recommendations = [];
  if (riskLevel === 'CRITICAL') {
    recommendations.push('この区域での飛行は禁止されています');
    recommendations.push('別の飛行エリアを検討してください');
  } else if (riskLevel === 'HIGH') {
    recommendations.push('事前に空港事務所への連絡が必要です');
    recommendations.push('DIPS2.0での飛行計画登録を行ってください');
  } else if (riskLevel === 'MEDIUM') {
    recommendations.push('包括申請の範囲内か確認してください');
    recommendations.push('飛行前に最新のNOTAMを確認してください');
  } else {
    recommendations.push('標準的な安全対策で飛行可能です');
  }

  // 必要な許可
  const requiredPermissions = [];
  if (airportZones.length > 0) {
    requiredPermissions.push('空港等周辺飛行の許可・承認');
  }
  if (altitude > 150) {
    requiredPermissions.push('150m以上の高度での飛行許可');
  }

  return {
    riskLevel,
    riskScore: Math.min(100, riskScore),
    summary: riskLevel === 'CRITICAL'
      ? '飛行禁止区域です'
      : riskLevel === 'HIGH'
        ? '高リスク - 許可が必要です'
        : riskLevel === 'MEDIUM'
          ? '中リスク - 確認が必要です'
          : '低リスク - 飛行可能です',
    risks,
    recommendations,
    requiredPermissions,
    estimatedApprovalDays: riskLevel === 'HIGH' ? 14 : riskLevel === 'MEDIUM' ? 10 : 0,
    safetyChecklist: [
      '飛行前の機体点検',
      '気象条件の確認（風速5m/s以下推奨）',
      'バッテリー残量の確認',
      '第三者への注意喚起'
    ],
    context: {
      center,
      areaSqMeters,
      restrictions,
      nearestAirport,
      waypointCount: waypoints.length
    }
  };
};

/**
 * 総合フライト分析（OpenAI連携 + 国土交通省API連携）
 */
export const runFullAnalysis = async (polygons, waypoints, options = {}) => {
  const { altitude = 50, purpose = '', useAI = true, useMlit = true } = options;

  // まずローカル分析を実行
  const localAnalysis = analyzeFlightPlanLocal(polygons, waypoints, { altitude, purpose });

  // 国土交通省APIで用途地域情報を取得
  let mlitInfo = null;
  if (useMlit && hasReinfolibApiKey() && localAnalysis.context.center) {
    try {
      mlitInfo = await getLocationInfo(
        localAnalysis.context.center.lat,
        localAnalysis.context.center.lng
      );

      if (mlitInfo.success) {
        // 国土交通省データからのリスクを追加
        mlitInfo.riskFactors.forEach(factor => {
          localAnalysis.risks.push(factor);
        });

        // リスクスコアを調整
        if (mlitInfo.riskLevel === 'HIGH') {
          localAnalysis.riskScore = Math.min(100, localAnalysis.riskScore + 30);
        } else if (mlitInfo.riskLevel === 'MEDIUM') {
          localAnalysis.riskScore = Math.min(100, localAnalysis.riskScore + 15);
        }

        // リスクレベルを再判定
        if (localAnalysis.riskScore >= 80) localAnalysis.riskLevel = 'CRITICAL';
        else if (localAnalysis.riskScore >= 50) localAnalysis.riskLevel = 'HIGH';
        else if (localAnalysis.riskScore >= 20) localAnalysis.riskLevel = 'MEDIUM';

        // 推奨事項を追加
        localAnalysis.recommendations = [
          ...mlitInfo.recommendations,
          ...localAnalysis.recommendations
        ];
      }
    } catch (error) {
      console.warn('[FlightAnalyzer] MLIT API error:', error);
    }
  }

  // コンテキストに国土交通省データを追加
  localAnalysis.context.mlitInfo = mlitInfo;

  // OpenAI APIキーがない、またはuseAI=falseの場合はローカル結果のみ
  if (!useAI || !hasApiKey()) {
    return {
      ...localAnalysis,
      source: hasReinfolibApiKey() ? 'local+mlit' : 'local',
      aiEnhanced: false,
      mlitEnhanced: !!mlitInfo?.success
    };
  }

  // OpenAI連携分析
  try {
    const aiAnalysis = await analyzeFlightPlan({
      center: localAnalysis.context.center,
      areaSqMeters: localAnalysis.context.areaSqMeters,
      waypointCount: localAnalysis.context.waypointCount,
      restrictions: localAnalysis.context.restrictions,
      isDID: false, // TODO: DID判定の実装
      purpose,
      altitude,
      maxElevation: waypoints.length > 0
        ? Math.max(...waypoints.filter(w => w.elevation).map(w => w.elevation))
        : null
    });

    // ローカル分析とAI分析をマージ
    return {
      riskLevel: aiAnalysis.riskLevel || localAnalysis.riskLevel,
      riskScore: aiAnalysis.riskScore || localAnalysis.riskScore,
      summary: aiAnalysis.summary || localAnalysis.summary,
      risks: [...localAnalysis.risks, ...(aiAnalysis.risks || [])],
      recommendations: [...new Set([
        ...(aiAnalysis.recommendations || []),
        ...localAnalysis.recommendations
      ])],
      requiredPermissions: [...new Set([
        ...(aiAnalysis.requiredPermissions || []),
        ...localAnalysis.requiredPermissions
      ])],
      estimatedApprovalDays: aiAnalysis.estimatedApprovalDays || localAnalysis.estimatedApprovalDays,
      safetyChecklist: aiAnalysis.safetyChecklist || localAnalysis.safetyChecklist,
      context: localAnalysis.context,
      source: 'openai',
      aiEnhanced: true
    };
  } catch (error) {
    console.error('[FlightAnalyzer] AI analysis failed, using local:', error);
    return {
      ...localAnalysis,
      source: 'local',
      aiEnhanced: false,
      aiError: error.message
    };
  }
};

/**
 * 目的から推奨パラメータを取得
 */
export const getFlightRecommendations = async (purpose) => {
  if (!hasApiKey()) {
    // OpenAI未設定時のフォールバック
    return getLocalRecommendations(purpose);
  }

  try {
    return await getRecommendedParameters(purpose);
  } catch {
    return getLocalRecommendations(purpose);
  }
};

/**
 * ローカルの推奨パラメータ（OpenAI不要）
 */
const getLocalRecommendations = (purpose) => {
  const p = purpose.toLowerCase();

  if (p.includes('太陽光') || p.includes('パネル') || p.includes('ソーラー')) {
    return {
      pattern: 'grid',
      altitude: 30,
      speed: 5,
      overlap: 80,
      camera: 'thermal',
      recommendedAircraft: ['DJI Matrice 300 RTK + H20T', 'DJI Mavic 3T'],
      estimatedFlightTime: '約30-45分',
      tips: ['熱画像カメラでホットスポット検出', '午前中の撮影推奨（温度差が出やすい）']
    };
  }

  if (p.includes('送電線') || p.includes('鉄塔') || p.includes('架線')) {
    return {
      pattern: 'perimeter',
      altitude: 50,
      speed: 3,
      overlap: 70,
      camera: 'RGB',
      recommendedAircraft: ['DJI Matrice 300 RTK', 'DJI Matrice 30T'],
      estimatedFlightTime: '約20-30分',
      tips: ['架線との安全距離30m以上確保', '電力会社との事前調整必須']
    };
  }

  if (p.includes('測量') || p.includes('3d') || p.includes('オルソ')) {
    return {
      pattern: 'grid',
      altitude: 60,
      speed: 4,
      overlap: 85,
      camera: 'RGB',
      recommendedAircraft: ['DJI Phantom 4 RTK', 'DJI Matrice 300 RTK'],
      estimatedFlightTime: '約40-60分',
      tips: ['GCP設置で精度向上', 'PPK/RTK補正推奨']
    };
  }

  if (p.includes('建設') || p.includes('工事') || p.includes('現場')) {
    return {
      pattern: 'grid',
      altitude: 50,
      speed: 5,
      overlap: 75,
      camera: 'RGB',
      recommendedAircraft: ['DJI Mavic 3 Enterprise', 'DJI Matrice 30'],
      estimatedFlightTime: '約20-30分',
      tips: ['定期的な進捗記録に最適', '3D復元で出来高管理']
    };
  }

  // デフォルト
  return {
    pattern: 'perimeter',
    altitude: 50,
    speed: 5,
    overlap: 70,
    camera: 'RGB',
    recommendedAircraft: ['DJI Mavic 3 Enterprise', 'DJI Matrice 300 RTK'],
    estimatedFlightTime: '約20-30分',
    tips: ['周回パターンで概要把握', '必要に応じてグリッドに変更']
  };
};

export default {
  getPolygonCenter,
  getPolygonArea,
  checkAllWaypointsRestrictions,
  findNearestAirport,
  analyzeFlightPlanLocal,
  runFullAnalysis,
  getFlightRecommendations
};
