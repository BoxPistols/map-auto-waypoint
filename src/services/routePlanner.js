/**
 * ルート計画サービス
 *
 * 目的地点間のルートを生成し、複数の選択肢を比較
 * - DID回避ルート
 * - 最短ルート
 * - バッテリー効率ルート
 */

import * as turf from '@turf/turf';
import { AIRPORT_ZONES, NO_FLY_ZONES } from './airspace';
import { checkDIDArea } from './flightAnalyzer';

// ===== ユースケース定義 =====

export const USE_CASES = [
  {
    id: 'emergency_medical',
    name: '緊急医療輸送',
    icon: '🏥',
    description: '血液製剤・医薬品・臓器等の緊急輸送',
    priority: 'speed',
    maxFlightTime: 30, // 分
    recommendedAltitude: 100,
    weight: 'light', // 軽量貨物
    regulations: ['特定飛行（レベル3.5相当）', '緊急用務空域の確認必須'],
    tips: [
      '事前に飛行経路を医療機関と共有',
      'バックアップルートを設定',
      '着陸地点の安全確保',
    ],
  },
  {
    id: 'inspection_solar',
    name: '太陽光パネル点検',
    icon: '☀️',
    description: 'メガソーラー等の定期点検・熱画像撮影',
    priority: 'coverage',
    maxFlightTime: 25,
    recommendedAltitude: 50,
    weight: 'camera',
    regulations: ['目視外飛行（BVLOS）', '施設管理者許可'],
    tips: [
      '熱画像カメラ搭載推奨',
      '日中の晴天時が最適',
      'グリッドパターン飛行',
    ],
  },
  {
    id: 'inspection_infrastructure',
    name: 'インフラ点検',
    icon: '🏗️',
    description: '橋梁・送電線・鉄塔等の点検',
    priority: 'precision',
    maxFlightTime: 20,
    recommendedAltitude: 80,
    weight: 'camera',
    regulations: ['目視外飛行（BVLOS）', '道路管理者・電力会社許可'],
    tips: [
      '障害物センサー搭載推奨',
      '風速に注意（高所は風が強い）',
      '複数アングルで撮影',
    ],
  },
  {
    id: 'survey_mapping',
    name: '測量・3Dマッピング',
    icon: '📐',
    description: '地形測量・建設現場の進捗管理',
    priority: 'accuracy',
    maxFlightTime: 30,
    recommendedAltitude: 100,
    weight: 'survey',
    regulations: ['目視外飛行（BVLOS）', '測量法に基づく資格'],
    tips: [
      'RTK対応機体推奨',
      'GCP（基準点）を設置',
      'オーバーラップ率80%以上',
    ],
  },
  {
    id: 'agriculture',
    name: '農業（散布・監視）',
    icon: '🌾',
    description: '農薬散布・生育監視・圃場管理',
    priority: 'coverage',
    maxFlightTime: 15,
    recommendedAltitude: 30,
    weight: 'heavy', // 散布剤搭載
    regulations: ['農薬散布は認定機体のみ', '周辺住民への事前通知'],
    tips: [
      '早朝または夕方が最適',
      '風速3m/s以下で実施',
      '散布ムラに注意',
    ],
  },
  {
    id: 'delivery',
    name: '物流配送',
    icon: '📦',
    description: '荷物の配送・離島への物資輸送',
    priority: 'efficiency',
    maxFlightTime: 30,
    recommendedAltitude: 100,
    weight: 'cargo',
    regulations: ['レベル4飛行（一等資格）', '運航管理システム必須'],
    tips: [
      '着陸地点の事前確認',
      '積載重量を確認',
      '天候予報を確認',
    ],
  },
  {
    id: 'security',
    name: '警備・監視',
    icon: '🔒',
    description: 'イベント警備・施設監視',
    priority: 'realtime',
    maxFlightTime: 20,
    recommendedAltitude: 60,
    weight: 'light',
    regulations: ['イベント上空は原則禁止', '警察との連携必須'],
    tips: [
      'リアルタイム映像伝送',
      'スペア機を準備',
      '群衆上空を避ける',
    ],
  },
  {
    id: 'other',
    name: 'その他',
    icon: '🚁',
    description: '上記以外の用途',
    priority: 'balanced',
    maxFlightTime: 25,
    recommendedAltitude: 50,
    weight: 'light',
    regulations: ['用途に応じた許可取得'],
    tips: [],
  },
];

// ===== 距離計算 =====

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

// ===== ルート生成 =====

/**
 * 2点間の直線ルートを生成
 */
const generateDirectRoute = (start, end) => {
  const distance = getDistanceMeters(start.lat, start.lng, end.lat, end.lng);
  const waypoints = [
    { lat: start.lat, lng: start.lng, type: 'start', name: start.name || '出発地' },
    { lat: end.lat, lng: end.lng, type: 'end', name: end.name || '目的地' },
  ];

  return {
    waypoints,
    distance,
    type: 'direct',
  };
};

/**
 * DID/制限区域を回避するルートを生成
 * シンプルな迂回アルゴリズム
 */
const generateAvoidanceRoute = async (start, end, options = {}) => {
  const { avoidDID = true, avoidAirport = true, margin = 500 } = options;

  // 直線ルート上の中間点をチェック
  const numCheckPoints = 10;
  const checkPoints = [];
  const obstacles = [];

  for (let i = 0; i <= numCheckPoints; i++) {
    const t = i / numCheckPoints;
    const lat = start.lat + (end.lat - start.lat) * t;
    const lng = start.lng + (end.lng - start.lng) * t;
    checkPoints.push({ lat, lng, t });

    // DIDチェック
    if (avoidDID) {
      const didResult = await checkDIDArea(lat, lng);
      if (didResult.isDID) {
        obstacles.push({
          type: 'did',
          lat,
          lng,
          t,
          name: didResult.area,
          centroid: didResult.centroid,
        });
      }
    }

    // 空港チェック
    if (avoidAirport) {
      for (const airport of AIRPORT_ZONES) {
        const dist = getDistanceMeters(lat, lng, airport.lat, airport.lng);
        if (dist < airport.radius + margin) {
          obstacles.push({
            type: 'airport',
            lat: airport.lat,
            lng: airport.lng,
            radius: airport.radius,
            t,
            name: airport.name,
          });
        }
      }
    }

    // 禁止区域チェック
    for (const zone of NO_FLY_ZONES) {
      const dist = getDistanceMeters(lat, lng, zone.lat, zone.lng);
      if (dist < zone.radius + margin) {
        obstacles.push({
          type: 'prohibited',
          lat: zone.lat,
          lng: zone.lng,
          radius: zone.radius,
          t,
          name: zone.name,
        });
      }
    }
  }

  // 障害物がなければ直線ルート
  if (obstacles.length === 0) {
    return {
      ...generateDirectRoute(start, end),
      type: 'direct',
      avoided: [],
    };
  }

  // 迂回ポイントを計算（シンプルな横方向オフセット）
  const waypoints = [
    { lat: start.lat, lng: start.lng, type: 'start', name: start.name || '出発地' },
  ];

  // 障害物ごとに迂回ポイントを追加
  const uniqueObstacles = obstacles.reduce((acc, obs) => {
    if (!acc.find(o => o.name === obs.name)) {
      acc.push(obs);
    }
    return acc;
  }, []);

  for (const obs of uniqueObstacles) {
    // 直線に対して垂直方向にオフセット
    const dx = end.lng - start.lng;
    const dy = end.lat - start.lat;
    const len = Math.sqrt(dx * dx + dy * dy);
    const perpX = -dy / len;
    const perpY = dx / len;

    // オフセット距離（障害物のサイズに応じて）
    const offsetDist = obs.radius
      ? (obs.radius + margin) / 111000 // メートルを度に変換（概算）
      : 0.01; // DIDの場合は固定オフセット

    // 迂回ポイント（障害物の手前と奥）
    const midLat = start.lat + (end.lat - start.lat) * obs.t;
    const midLng = start.lng + (end.lng - start.lng) * obs.t;

    waypoints.push({
      lat: midLat + perpY * offsetDist,
      lng: midLng + perpX * offsetDist,
      type: 'waypoint',
      name: `${obs.name}回避`,
    });
  }

  waypoints.push(
    { lat: end.lat, lng: end.lng, type: 'end', name: end.name || '目的地' }
  );

  // 総距離を計算
  let totalDistance = 0;
  for (let i = 1; i < waypoints.length; i++) {
    totalDistance += getDistanceMeters(
      waypoints[i - 1].lat, waypoints[i - 1].lng,
      waypoints[i].lat, waypoints[i].lng
    );
  }

  return {
    waypoints,
    distance: totalDistance,
    type: 'avoidance',
    avoided: uniqueObstacles.map(o => o.name),
  };
};

// ===== ルート比較・評価 =====

/**
 * ルートを評価してスコアリング
 */
const evaluateRoute = async (route, useCase, options = {}) => {
  const { altitude = 50 } = options;

  // 基本情報
  const distance = route.distance;
  const avgSpeed = 40; // km/h（一般的なドローン巡航速度）
  const flightTime = (distance / 1000) / avgSpeed * 60; // 分

  // バッテリー消費推定（距離 + 高度 + 積載重量）
  let batteryUsage = (distance / 1000) * 3; // 1kmあたり3%
  batteryUsage += altitude * 0.05; // 高度100mで5%追加
  if (useCase.weight === 'heavy') batteryUsage *= 1.5;
  if (useCase.weight === 'cargo') batteryUsage *= 1.3;
  batteryUsage = Math.min(100, Math.round(batteryUsage));

  // DID/制限区域チェック
  const issues = [];
  const permits = [];

  for (const wp of route.waypoints) {
    if (wp.type === 'waypoint') continue; // 迂回ポイントはスキップ

    const didResult = await checkDIDArea(wp.lat, wp.lng);
    if (didResult.isDID && !issues.find(i => i.type === 'did')) {
      issues.push({
        type: 'did',
        severity: 'warning',
        description: `DID通過: ${didResult.area}`,
      });
      permits.push('DIPS通報（特定飛行）');
    }

    for (const airport of AIRPORT_ZONES) {
      const dist = getDistanceMeters(wp.lat, wp.lng, airport.lat, airport.lng);
      if (dist < airport.radius && !issues.find(i => i.name === airport.name)) {
        issues.push({
          type: 'airport',
          severity: 'error',
          name: airport.name,
          description: `空港制限区域: ${airport.name}`,
        });
        permits.push('空港事務所調整');
      }
    }
  }

  // 申請カテゴリ判定
  let category = 'カテゴリーⅡ（目視内）';
  if (distance > 500) {
    category = 'カテゴリーⅢ（目視外・補助者あり）';
    permits.push('目視外飛行許可');
  }
  if (distance > 2000 || issues.some(i => i.type === 'did')) {
    category = 'カテゴリーⅢ（目視外・補助者なし）';
  }

  // スコア計算（100点満点）
  let score = 100;
  score -= issues.filter(i => i.severity === 'error').length * 20;
  score -= issues.filter(i => i.severity === 'warning').length * 10;
  score -= Math.max(0, flightTime - useCase.maxFlightTime) * 2;
  score -= Math.max(0, batteryUsage - 70) * 0.5;
  score = Math.max(0, Math.round(score));

  // 推奨度
  let recommendation = 'neutral';
  if (score >= 80 && issues.length === 0) {
    recommendation = 'recommended';
  } else if (score < 50 || issues.some(i => i.severity === 'error')) {
    recommendation = 'not_recommended';
  }

  return {
    ...route,
    evaluation: {
      score,
      recommendation,
      flightTime: Math.round(flightTime),
      batteryUsage,
      category,
      issues,
      permits: [...new Set(permits)],
      pros: [],
      cons: [],
    },
  };
};

// ===== メイン関数 =====

/**
 * 複数のルート候補を生成して比較
 *
 * @param {Object} start - 出発地点 { lat, lng, name }
 * @param {Object} end - 目的地点 { lat, lng, name }
 * @param {Object} useCase - ユースケース
 * @param {Object} options - オプション
 * @returns {Promise<Object>} ルート候補と比較結果
 */
export const generateRouteOptions = async (start, end, useCase, options = {}) => {
  const { altitude = useCase.recommendedAltitude || 50 } = options;

  // 1. 直線ルート（最短）
  const directRoute = generateDirectRoute(start, end);
  const directEval = await evaluateRoute(directRoute, useCase, { altitude });
  directEval.name = '最短ルート';
  directEval.description = '出発地から目的地への直線経路';

  // 2. DID回避ルート
  const avoidanceRoute = await generateAvoidanceRoute(start, end, {
    avoidDID: true,
    avoidAirport: true,
    margin: 300,
  });
  const avoidanceEval = await evaluateRoute(avoidanceRoute, useCase, { altitude });
  avoidanceEval.name = 'DID回避ルート';
  avoidanceEval.description = avoidanceRoute.avoided.length > 0
    ? `${avoidanceRoute.avoided.join('、')}を回避`
    : '回避不要（直線経路で安全）';

  // Pros/Cons を設定
  directEval.evaluation.pros = [
    '最短距離・最短時間',
    'バッテリー効率が良い',
    '電波状況が安定',
  ];
  directEval.evaluation.cons = directEval.evaluation.issues.length > 0
    ? ['申請手続きが必要', 'DID/制限区域を通過']
    : [];

  avoidanceEval.evaluation.pros = avoidanceRoute.avoided.length > 0
    ? ['申請手続きが簡素化', '法的リスクが低い']
    : ['直線経路で問題なし'];
  avoidanceEval.evaluation.cons = avoidanceRoute.distance > directRoute.distance * 1.1
    ? ['距離が長い', 'バッテリー消費が多い', '飛行時間が長い']
    : [];

  // ルートをスコア順にソート
  const routes = [directEval, avoidanceEval].sort(
    (a, b) => b.evaluation.score - a.evaluation.score
  );

  // 推奨ルートを決定
  const recommended = routes.find(r => r.evaluation.recommendation === 'recommended')
    || routes[0];

  return {
    routes,
    recommended,
    useCase,
    start,
    end,
    generatedAt: new Date().toISOString(),
    summary: {
      directDistance: Math.round(directRoute.distance),
      avoidanceDistance: Math.round(avoidanceRoute.distance),
      distanceDiff: Math.round(avoidanceRoute.distance - directRoute.distance),
      distanceDiffPercent: Math.round(
        ((avoidanceRoute.distance - directRoute.distance) / directRoute.distance) * 100
      ),
    },
  };
};

/**
 * ユースケースIDからユースケースを取得
 */
export const getUseCaseById = (id) => {
  return USE_CASES.find(uc => uc.id === id) || USE_CASES.find(uc => uc.id === 'other');
};

export default {
  USE_CASES,
  generateRouteOptions,
  getUseCaseById,
};
