/**
 * 最適化目標の定義
 *
 * RouteOptimizer で使用可能な複数の最適化目標。
 * 各目標には異なる重み付けが設定されており、
 * TSP アルゴリズムがこれらの重みに基づいて
 * 最適なルートを計算します。
 */

export const OPTIMIZATION_OBJECTIVES = [
  {
    id: 'balanced',
    name: 'バランス型',
    icon: 'Target',
    description: '距離・時間・安全性・バッテリーを総合的に最適化',
    weights: {
      distance: 0.4,  // 距離を40%考慮
      time: 0.3,      // 時間を30%考慮
      battery: 0.3,   // バッテリーを30%考慮
      risk: 0.5       // リスクを50%考慮（安全性重視）
    },
    isDefault: true,
    priority: 'balanced'
  },
  {
    id: 'shortest_distance',
    name: '距離最短',
    icon: 'Route',
    description: '総飛行距離を最小化（従来の動作）',
    weights: {
      distance: 1.0,  // 距離を最優先
      time: 0.2,
      battery: 0.3,
      risk: 0.3       // リスクは低優先度
    },
    priority: 'efficiency'
  },
  {
    id: 'fastest_time',
    name: '時間最短',
    icon: 'Clock',
    description: '総飛行時間を最小化',
    weights: {
      distance: 0.5,
      time: 1.0,      // 時間を最優先
      battery: 0.4,
      risk: 0.3
    },
    priority: 'speed'
  },
  {
    id: 'safest_route',
    name: '最安全',
    icon: 'ShieldCheck',
    description: 'DID・空港・禁止区域を最大限回避',
    weights: {
      distance: 0.2,
      time: 0.2,
      battery: 0.2,
      risk: 1.0       // リスク回避を最優先
    },
    priority: 'safety'
  },
  {
    id: 'battery_efficient',
    name: 'バッテリー効率',
    icon: 'Battery',
    description: 'バッテリー消費を最小化',
    weights: {
      distance: 0.5,
      time: 0.4,
      battery: 1.0,   // バッテリー効率を最優先
      risk: 0.3
    },
    priority: 'coverage'
  }
];

/**
 * 目標IDから目標オブジェクトを取得
 * @param {string} objectiveId - 目標ID
 * @returns {Object} 目標オブジェクト
 */
export const getOptimizationObjective = (objectiveId) => {
  return OPTIMIZATION_OBJECTIVES.find(o => o.id === objectiveId)
    || OPTIMIZATION_OBJECTIVES.find(o => o.isDefault);
};

/**
 * すべての目標IDを取得
 * @returns {Array<string>} 目標ID配列
 */
export const getObjectiveIds = () => {
  return OPTIMIZATION_OBJECTIVES.map(o => o.id);
};

/**
 * デフォルト目標を取得
 * @returns {Object} デフォルト目標オブジェクト
 */
export const getDefaultObjective = () => {
  return OPTIMIZATION_OBJECTIVES.find(o => o.isDefault);
};
