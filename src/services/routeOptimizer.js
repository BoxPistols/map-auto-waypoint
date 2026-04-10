/**
 * ルート最適化サービス
 * TSPアルゴリズムとバッテリー制約を考慮した最適巡回ルート計算
 */

import { getDroneSpecs, getRouteSettings } from './droneSpecsService';
import { getDistanceMeters, checkAirspaceRestrictions } from '../lib';
import { checkDIDArea } from './flightAnalyzer';

/**
 * 2点間の距離を計算（メートル）
 * @param {Object} point1 - { lat, lng }
 * @param {Object} point2 - { lat, lng }
 * @returns {number} 距離（メートル）
 */
const getDistance = (point1, point2) => {
  return getDistanceMeters(point1.lat, point1.lng, point2.lat, point2.lng);
};

/**
 * 拠点クラスタリング（同一エリア内のWaypointをグループ化）
 * 距離が閾値以上離れたWaypoint群は別クラスタとして分離する。
 * これにより、例えば北海道と大阪のような遠距離拠点を一直線でつなぐ
 * 異常なルートを防止する。
 *
 * @param {Array} waypoints - ウェイポイント配列
 * @param {number} thresholdMeters - クラスタ分離の閾値（メートル、デフォルト20km）
 * @returns {Array<Array>} クラスタごとのウェイポイント配列
 */
export const clusterWaypointsByProximity = (waypoints, thresholdMeters = 20000) => {
  if (!waypoints || waypoints.length === 0) return []
  if (waypoints.length === 1) return [waypoints]

  // Union-Find でクラスタリング
  const n = waypoints.length
  const parent = Array(n).fill(0).map((_, i) => i)
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]]
      x = parent[x]
    }
    return x
  }
  const union = (a, b) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent[ra] = rb
  }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (getDistance(waypoints[i], waypoints[j]) <= thresholdMeters) {
        union(i, j)
      }
    }
  }

  // クラスタごとにグルーピング
  const clusters = new Map()
  for (let i = 0; i < n; i++) {
    const root = find(i)
    if (!clusters.has(root)) clusters.set(root, [])
    clusters.get(root).push(waypoints[i])
  }

  return Array.from(clusters.values())
}

/**
 * 距離行列を構築
 * @param {Array} waypoints - ウェイポイント配列
 * @returns {Array<Array<number>>} 距離行列
 */
export const buildDistanceMatrix = (waypoints) => {
  const n = waypoints.length;
  const matrix = Array(n).fill(null).map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dist = getDistance(waypoints[i], waypoints[j]);
      matrix[i][j] = dist;
      matrix[j][i] = dist;
    }
  }

  return matrix;
};

/**
 * 最適な出発点を見つける
 * 全WPを分析し、総ルート距離が最小となる出発点を提案
 * @param {Array} waypoints - ウェイポイント配列
 * @returns {Object} 最適出発点情報
 */
export const findOptimalStartPoint = (waypoints) => {
  if (waypoints.length === 0) {
    return null;
  }

  if (waypoints.length === 1) {
    return {
      waypointId: waypoints[0].id,
      index: 0,
      lat: waypoints[0].lat,
      lng: waypoints[0].lng,
      reason: '唯一のウェイポイント',
    };
  }

  const distanceMatrix = buildDistanceMatrix(waypoints);
  let bestStartIndex = 0;
  let minTotalDistance = Infinity;

  // 各WPを出発点として総距離を計算し、最小を選択
  for (let startIdx = 0; startIdx < waypoints.length; startIdx++) {
    const route = nearestNeighborTSP(waypoints, startIdx, distanceMatrix);
    const totalDist = calculateRouteDistance(route, distanceMatrix);

    if (totalDist < minTotalDistance) {
      minTotalDistance = totalDist;
      bestStartIndex = startIdx;
    }
  }

  const bestWp = waypoints[bestStartIndex];
  return {
    waypointId: bestWp.id,
    index: bestStartIndex,
    lat: bestWp.lat,
    lng: bestWp.lng,
    reason: '総ルート距離が最小',
    estimatedTotalDistance: minTotalDistance,
  };
};

/**
 * ルートの総距離を計算
 * @param {Array<number>} routeIndices - ルート順序（インデックス配列）
 * @param {Array<Array<number>>} distanceMatrix - 距離行列
 * @returns {number} 総距離（メートル）
 */
const calculateRouteDistance = (routeIndices, distanceMatrix) => {
  let total = 0;
  for (let i = 0; i < routeIndices.length - 1; i++) {
    total += distanceMatrix[routeIndices[i]][routeIndices[i + 1]];
  }
  return total;
};

/**
 * 最近傍法によるTSP（巡回セールスマン問題）解法
 * O(n²) の貪欲アルゴリズム
 * @param {Array} waypoints - ウェイポイント配列
 * @param {number} startIndex - 開始インデックス
 * @param {Array<Array<number>>} [distanceMatrix] - 事前計算済み距離行列（省略時は内部で計算）
 * @returns {Array<number>} 訪問順序（インデックス配列）
 */
export const nearestNeighborTSP = (waypoints, startIndex = 0, distanceMatrix = null) => {
  const n = waypoints.length;
  if (n <= 1) return [0];

  const matrix = distanceMatrix || buildDistanceMatrix(waypoints);
  const visited = new Set();
  const route = [];

  let current = startIndex;
  visited.add(current);
  route.push(current);

  while (visited.size < n) {
    let nearestDist = Infinity;
    let nearestIdx = -1;

    for (let i = 0; i < n; i++) {
      if (!visited.has(i) && matrix[current][i] < nearestDist) {
        nearestDist = matrix[current][i];
        nearestIdx = i;
      }
    }

    if (nearestIdx !== -1) {
      visited.add(nearestIdx);
      route.push(nearestIdx);
      current = nearestIdx;
    }
  }

  return route;
};

/**
 * 2-opt改善アルゴリズム
 * 既存ルートのエッジを入れ替えて改善
 * @param {Array<number>} route - 現在のルート（インデックス配列）
 * @param {Array<Array<number>>} distanceMatrix - 距離行列
 * @returns {Array<number>} 改善後のルート
 */
export const twoOptImprove = (route, distanceMatrix) => {
  const n = route.length;
  if (n < 4) return [...route];

  let improved = true;
  let currentRoute = [...route];

  while (improved) {
    improved = false;

    for (let i = 0; i < n - 2; i++) {
      for (let j = i + 2; j < n; j++) {
        // 現在のエッジ: (i, i+1) と (j, j+1 or 0)
        const d1 = distanceMatrix[currentRoute[i]][currentRoute[i + 1]];
        const d2 = j + 1 < n
          ? distanceMatrix[currentRoute[j]][currentRoute[j + 1]]
          : 0;

        // 入れ替え後のエッジ: (i, j) と (i+1, j+1 or 0)
        const d3 = distanceMatrix[currentRoute[i]][currentRoute[j]];
        const d4 = j + 1 < n
          ? distanceMatrix[currentRoute[i + 1]][currentRoute[j + 1]]
          : 0;

        // 改善がある場合、セグメントを逆順にする
        if (d1 + d2 > d3 + d4) {
          // i+1 から j までを逆順にする
          const reversed = currentRoute.slice(i + 1, j + 1).reverse();
          currentRoute = [
            ...currentRoute.slice(0, i + 1),
            ...reversed,
            ...currentRoute.slice(j + 1),
          ];
          improved = true;
        }
      }
    }
  }

  return currentRoute;
};

/**
 * バッテリー制約によるルート分割
 * @param {Array} orderedWaypoints - 順序付きウェイポイント配列
 * @param {Object} droneSpec - ドローンスペック
 * @param {Object} homePoint - ホームポイント { lat, lng }
 * @returns {Array} フライト配列
 */
export const splitRouteByBattery = (orderedWaypoints, droneSpec, homePoint) => {
  const maxFlightDistance = droneSpec.maxRange;
  const flights = [];
  let currentFlight = {
    waypoints: [],
    totalDistance: 0,
  };
  let lastPoint = homePoint;
  let accumulatedDistance = 0;

  for (let i = 0; i < orderedWaypoints.length; i++) {
    const wp = orderedWaypoints[i];
    const distToWp = getDistance(lastPoint, wp);
    const distToHome = getDistance(wp, homePoint);

    // このWPを訪問して帰還できるか？
    const totalIfVisit = accumulatedDistance + distToWp + distToHome;

    if (totalIfVisit > maxFlightDistance && currentFlight.waypoints.length > 0) {
      // 現在のフライトを保存
      currentFlight.returnDistance = getDistance(lastPoint, homePoint);
      currentFlight.totalDistance = accumulatedDistance + currentFlight.returnDistance;
      flights.push(currentFlight);

      // 新しいフライトを開始
      currentFlight = {
        waypoints: [],
        totalDistance: 0,
      };
      lastPoint = homePoint;
      accumulatedDistance = 0;
    }

    // WPをフライトに追加
    const segmentDistance = getDistance(lastPoint, wp);
    currentFlight.waypoints.push({
      ...wp,
      segmentDistance,
    });
    accumulatedDistance += segmentDistance;
    lastPoint = wp;
  }

  // 残りのフライトを追加
  if (currentFlight.waypoints.length > 0) {
    currentFlight.returnDistance = getDistance(lastPoint, homePoint);
    currentFlight.totalDistance = accumulatedDistance + currentFlight.returnDistance;
    flights.push(currentFlight);
  }

  return flights;
};

/**
 * フライトの推定時間を計算
 * @param {Object} flight - フライト情報
 * @param {Object} droneSpec - ドローンスペック
 * @returns {number} 推定時間（分）
 */
const calculateFlightTime = (flight, droneSpec) => {
  const totalDistance = flight.totalDistance;
  const speedMps = droneSpec.cruiseSpeed;
  const timeSeconds = totalDistance / speedMps;
  return timeSeconds / 60;
};

/**
 * バッテリー使用率を計算
 * @param {Object} flight - フライト情報
 * @param {Object} droneSpec - ドローンスペック
 * @returns {number} バッテリー使用率（%）
 */
const calculateBatteryUsage = (flight, droneSpec) => {
  const flightTime = calculateFlightTime(flight, droneSpec);
  const maxTime = droneSpec.maxFlightTime;
  return Math.min(100, (flightTime / maxTime) * 100);
};

/**
 * ルートの規制チェック
 * @param {Array} waypoints - ウェイポイント配列
 * @returns {Promise<Array>} 規制情報配列
 */
export const checkRouteRestrictions = async (waypoints) => {
  const restrictions = [];

  for (const wp of waypoints) {
    // 空港・禁止区域チェック
    const airspaceRestrictions = checkAirspaceRestrictions(wp.lat, wp.lng);
    for (const restriction of airspaceRestrictions) {
      restrictions.push({
        waypointId: wp.id,
        waypointIndex: wp.index,
        type: restriction.type,
        name: restriction.name,
        distance: restriction.distance,
        severity: restriction.severity,
        description: `${restriction.name}から${Math.round(restriction.distance)}m`,
      });
    }

    // DIDチェック
    try {
      const didResult = await checkDIDArea(wp.lat, wp.lng);
      if (didResult.isDID) {
        restrictions.push({
          waypointId: wp.id,
          waypointIndex: wp.index,
          type: 'did',
          name: didResult.area || 'DID（人口集中地区）',
          severity: 'medium',
          description: 'DID区域内（飛行許可が必要）',
        });
      }
    } catch (error) {
      console.warn('DID check failed for waypoint:', wp.id, error);
    }
  }

  return restrictions;
};

/**
 * メイン最適化関数
 * @param {Array} waypoints - ウェイポイント配列
 * @param {Object} options - オプション
 * @returns {Promise<Object>} 最適化結果
 */
export const optimizeRoute = async (waypoints, options = {}) => {
  if (!waypoints || waypoints.length === 0) {
    return {
      success: false,
      error: 'ウェイポイントがありません',
    };
  }

  const settings = getRouteSettings();
  const {
    droneId = settings.selectedDroneId,
    homePoint = null,
    algorithm = settings.optimizationAlgorithm,
    checkRegulations = settings.checkRegulationsEnabled,
    autoSplit = settings.autoSplitEnabled,
  } = options;

  const droneSpec = getDroneSpecs(droneId);
  if (!droneSpec) {
    return {
      success: false,
      error: '無効なドローン機種',
    };
  }

  // 0. 拠点クラスタリング（同一エリア内のWaypointをグループ化）
  // 遠距離拠点を一直線でつなぐ異常なルートを防止するため、
  // 20km以上離れたWaypoint群は別クラスタとして分離する。
  const CLUSTER_THRESHOLD_METERS = 20000
  const clusters = clusterWaypointsByProximity(waypoints, CLUSTER_THRESHOLD_METERS)
  const isMultiCluster = clusters.length > 1

  // 1. 最適出発点を計算（全Waypoint基準、後方互換性のため）
  const optimalStart = findOptimalStartPoint(waypoints);
  const effectiveHomePoint = homePoint || {
    lat: optimalStart.lat,
    lng: optimalStart.lng,
  };

  // 2-5. 各クラスタごとに最適化（TSP + 順序付け）
  let globalOrder = 0
  const clusterResults = clusters.map((clusterWaypoints) => {
    const clusterMatrix = buildDistanceMatrix(clusterWaypoints)
    const clusterStart = findOptimalStartPoint(clusterWaypoints)
    let clusterIndices = nearestNeighborTSP(clusterWaypoints, clusterStart.index, clusterMatrix)

    if (algorithm === '2-opt') {
      clusterIndices = twoOptImprove(clusterIndices, clusterMatrix)
    }

    const ordered = clusterIndices.map((idx) => ({
      ...clusterWaypoints[idx],
      optimizedOrder: ++globalOrder,
    }))

    return {
      waypoints: ordered,
      distanceMatrix: clusterMatrix,
      indices: clusterIndices,
      startPoint: clusterStart,
    }
  })

  // 全クラスタのorderedWaypointsをフラット化
  const orderedWaypoints = clusterResults.flatMap((c) => c.waypoints)

  // クラスタ単位でoriginal/optimized距離を集計（improvement計算用）
  // 全体距離行列で計算するとクラスタ間ジャンプが含まれてしまうため、
  // 各クラスタ内で個別に計算して合算する
  let originalDistanceSum = 0
  let optimizedDistanceSum = 0
  for (const cluster of clusterResults) {
    const baseIndices = cluster.waypoints.map((_, i) => i)
    // 元順序: クラスタ内Waypointの元配列順序（クラスタリング前の順を保持）
    originalDistanceSum += calculateRouteDistance(baseIndices, cluster.distanceMatrix)
    optimizedDistanceSum += calculateRouteDistance(cluster.indices, cluster.distanceMatrix)
  }

  // 6. バッテリー制約でルート分割
  // 複数クラスタの場合、各クラスタを独立したフライトとして扱う
  let flights = []
  for (const cluster of clusterResults) {
    // 各クラスタ内のHome Pointは、クラスタ内の最適出発点を使用
    const clusterHomePoint = isMultiCluster
      ? { lat: cluster.startPoint.lat, lng: cluster.startPoint.lng }
      : effectiveHomePoint

    let clusterFlights
    if (autoSplit) {
      clusterFlights = splitRouteByBattery(cluster.waypoints, droneSpec, clusterHomePoint)
    } else {
      let totalDist = 0
      const wps = cluster.waypoints.map((wp, idx) => {
        const prev = idx === 0 ? clusterHomePoint : cluster.waypoints[idx - 1]
        const segDist = getDistance(prev, wp)
        totalDist += segDist
        return { ...wp, segmentDistance: segDist }
      })
      const returnDist = getDistance(
        cluster.waypoints[cluster.waypoints.length - 1],
        clusterHomePoint
      )
      clusterFlights = [{
        waypoints: wps,
        totalDistance: totalDist + returnDist,
        returnDistance: returnDist,
        clusterHomePoint,
      }]
    }
    flights.push(...clusterFlights)
  }

  // routeIndices: orderedWaypoints の元waypoints配列内インデックス
  // O(n) で構築（findIndex の O(n²) を回避）
  const idToIndex = new Map(waypoints.map((wp, i) => [wp.id, i]))
  const routeIndices = orderedWaypoints.map((wp) => idToIndex.get(wp.id) ?? -1)

  // 7. 各フライトに追加情報を付与
  const processedFlights = flights.map((flight, idx) => ({
    flightNumber: idx + 1,
    waypoints: flight.waypoints,
    totalDistance: flight.totalDistance,
    returnDistance: flight.returnDistance,
    estimatedTime: calculateFlightTime(flight, droneSpec),
    batteryUsage: calculateBatteryUsage(flight, droneSpec),
    restrictions: [],
  }));

  // 8. 規制チェック（オプション）
  let restrictions = [];
  if (checkRegulations) {
    restrictions = await checkRouteRestrictions(orderedWaypoints);

    // 各フライトに規制情報を振り分け
    for (const flight of processedFlights) {
      flight.restrictions = restrictions.filter(r =>
        flight.waypoints.some(wp => wp.id === r.waypointId)
      );
    }
  }

  // 9. サマリー計算
  const totalDistance = processedFlights.reduce((sum, f) => sum + f.totalDistance, 0);
  const totalTime = processedFlights.reduce((sum, f) => sum + f.estimatedTime, 0);

  // 改善率を計算（クラスタ内の合算で算出 — 複数クラスタでも正確な値）
  const improvement = originalDistanceSum > 0
    ? Math.round((1 - optimizedDistanceSum / originalDistanceSum) * 100)
    : 0;

  return {
    success: true,
    optimalStartPoint: optimalStart,
    homePoint: effectiveHomePoint,
    flights: processedFlights,
    totalFlights: processedFlights.length,
    totalDistance,
    totalTime,
    restrictions,
    droneSpec: {
      id: droneSpec.id,
      model: droneSpec.model,
      maxFlightTime: droneSpec.maxFlightTime,
      cruiseSpeed: droneSpec.cruiseSpeed,
      maxRange: droneSpec.maxRange,
    },
    summary: {
      improvement,
      batteryChanges: processedFlights.length - 1,
      warnings: restrictions.filter(r => r.severity === 'high' || r.severity === 'critical').length,
      algorithm,
      clusterCount: clusters.length,
      isMultiCluster,
    },
    orderedWaypoints,
  };
};

/**
 * フォーマット済みの距離を取得
 * @param {number} meters - 距離（メートル）
 * @returns {string} フォーマット済み文字列
 */
export const formatDistance = (meters) => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)}km`;
  }
  return `${Math.round(meters)}m`;
};

/**
 * フォーマット済みの時間を取得
 * @param {number} minutes - 時間（分）
 * @returns {string} フォーマット済み文字列
 */
export const formatTime = (minutes) => {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}時間${mins}分`;
  }
  return `${Math.round(minutes)}分`;
};
