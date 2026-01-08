/**
 * ドローン機種スペック管理サービス
 * ルート最適化に必要なドローン性能データを管理
 */

// ドローン機種データベース（ルート最適化用に拡張）
const DRONE_SPECS = {
  'matrice-300-rtk': {
    id: 'matrice-300-rtk',
    model: 'DJI Matrice 300 RTK',
    manufacturer: 'DJI',
    category: 'enterprise',
    // 飛行性能
    maxFlightTime: 55,        // 分
    cruiseSpeed: 15,          // m/s（巡航速度）
    maxSpeed: 23,             // m/s
    // バッテリー・航続距離
    safetyMargin: 0.2,        // 20%残して帰還
    get effectiveFlightTime() { return this.maxFlightTime * (1 - this.safetyMargin); },
    get maxRange() { return this.effectiveFlightTime * 60 * this.cruiseSpeed; }, // meters
    // その他スペック
    maxPayload: 2700,         // g
    windResistance: 15,       // m/s
    rtk: true,
    thermalCamera: true,
    // 表示用
    description: '長時間飛行・高精度RTK対応のフラッグシップ機',
    icon: 'Plane',
  },
  'mavic-3-enterprise': {
    id: 'mavic-3-enterprise',
    model: 'DJI Mavic 3 Enterprise',
    manufacturer: 'DJI',
    category: 'enterprise',
    maxFlightTime: 45,
    cruiseSpeed: 15,
    maxSpeed: 21,
    safetyMargin: 0.2,
    get effectiveFlightTime() { return this.maxFlightTime * (1 - this.safetyMargin); },
    get maxRange() { return this.effectiveFlightTime * 60 * this.cruiseSpeed; },
    maxPayload: 0,
    windResistance: 12,
    rtk: true,
    thermalCamera: true,
    description: 'コンパクトで持ち運び容易、バランス型',
    icon: 'Navigation',
  },
  'phantom-4-rtk': {
    id: 'phantom-4-rtk',
    model: 'DJI Phantom 4 RTK',
    manufacturer: 'DJI',
    category: 'survey',
    maxFlightTime: 30,
    cruiseSpeed: 12,
    maxSpeed: 16,
    safetyMargin: 0.2,
    get effectiveFlightTime() { return this.maxFlightTime * (1 - this.safetyMargin); },
    get maxRange() { return this.effectiveFlightTime * 60 * this.cruiseSpeed; },
    maxPayload: 0,
    windResistance: 10,
    rtk: true,
    thermalCamera: false,
    description: '測量・マッピング特化の高精度機',
    icon: 'MapPin',
  },
  'matrice-30t': {
    id: 'matrice-30t',
    model: 'DJI Matrice 30T',
    manufacturer: 'DJI',
    category: 'enterprise',
    maxFlightTime: 41,
    cruiseSpeed: 15,
    maxSpeed: 23,
    safetyMargin: 0.2,
    get effectiveFlightTime() { return this.maxFlightTime * (1 - this.safetyMargin); },
    get maxRange() { return this.effectiveFlightTime * 60 * this.cruiseSpeed; },
    maxPayload: 0,
    windResistance: 15,
    rtk: true,
    thermalCamera: true,
    description: '全天候対応・熱画像内蔵の堅牢機',
    icon: 'Flame',
  },
  'mavic-3t': {
    id: 'mavic-3t',
    model: 'DJI Mavic 3T',
    manufacturer: 'DJI',
    category: 'thermal',
    maxFlightTime: 45,
    cruiseSpeed: 15,
    maxSpeed: 21,
    safetyMargin: 0.2,
    get effectiveFlightTime() { return this.maxFlightTime * (1 - this.safetyMargin); },
    get maxRange() { return this.effectiveFlightTime * 60 * this.cruiseSpeed; },
    maxPayload: 0,
    windResistance: 12,
    rtk: false,
    thermalCamera: true,
    description: '熱画像特化・コストパフォーマンス良好',
    icon: 'Thermometer',
  },
};

// デフォルトのルート最適化設定
const DEFAULT_ROUTE_SETTINGS = {
  selectedDroneId: 'mavic-3-enterprise',
  safetyMargin: 0.2,              // 20%残して帰還
  autoSplitEnabled: true,         // バッテリー自動分割
  checkRegulationsEnabled: true,  // 規制チェック
  optimizationAlgorithm: 'nearest-neighbor', // 'nearest-neighbor' or '2-opt'
  defaultHomePoint: null,         // { lat, lng } or null for auto
  objective: 'balanced',          // NEW: 最適化目標
};

const STORAGE_KEY = 'drone_route_optimizer_settings';

/**
 * 特定のドローンスペックを取得
 * @param {string} droneId - ドローンID
 * @returns {Object|null} ドローンスペック
 */
export const getDroneSpecs = (droneId) => {
  const spec = DRONE_SPECS[droneId];
  if (!spec) return null;

  // getter値を計算してオブジェクトとして返す
  return {
    ...spec,
    effectiveFlightTime: spec.effectiveFlightTime,
    maxRange: spec.maxRange,
  };
};

/**
 * 全ドローン機種のリストを取得
 * @returns {Array} ドローンスペックの配列
 */
export const getAllDrones = () => {
  return Object.values(DRONE_SPECS).map(spec => ({
    ...spec,
    effectiveFlightTime: spec.effectiveFlightTime,
    maxRange: spec.maxRange,
  }));
};

/**
 * ルート最適化設定を取得
 * @returns {Object} ルート設定
 */
export const getRouteSettings = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_ROUTE_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.warn('Failed to load route settings:', error);
  }
  return { ...DEFAULT_ROUTE_SETTINGS };
};

/**
 * ルート最適化設定を保存
 * @param {Object} settings - 保存する設定
 */
export const saveRouteSettings = (settings) => {
  try {
    const current = getRouteSettings();
    const newSettings = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    window.dispatchEvent(new Event('storage'));
  } catch (error) {
    console.warn('Failed to save route settings:', error);
  }
};

/**
 * 選択中のドローンIDを取得
 * @returns {string} ドローンID
 */
export const getSelectedDroneId = () => {
  return getRouteSettings().selectedDroneId;
};

/**
 * 選択中のドローンIDを保存
 * @param {string} droneId - ドローンID
 */
export const setSelectedDroneId = (droneId) => {
  if (DRONE_SPECS[droneId]) {
    saveRouteSettings({ selectedDroneId: droneId });
  }
};

/**
 * ドローンの有効航続距離を計算（条件考慮）
 * @param {string} droneId - ドローンID
 * @param {Object} conditions - 飛行条件
 * @returns {number} 有効航続距離（meters）
 */
export const calculateEffectiveRange = (droneId, conditions = {}) => {
  const spec = getDroneSpecs(droneId);
  if (!spec) return 0;

  const { windSpeed = 0, payload = 0, customSafetyMargin } = conditions;

  let effectiveTime = spec.maxFlightTime;

  // 風速による減少（風速1m/sあたり2%減少）
  if (windSpeed > 0) {
    effectiveTime *= Math.max(0.5, 1 - (windSpeed * 0.02));
  }

  // ペイロードによる減少（最大ペイロードの50%で10%減少）
  if (payload > 0 && spec.maxPayload > 0) {
    const payloadRatio = payload / spec.maxPayload;
    effectiveTime *= Math.max(0.7, 1 - (payloadRatio * 0.2));
  }

  // 安全マージン適用
  const margin = customSafetyMargin ?? spec.safetyMargin;
  effectiveTime *= (1 - margin);

  return effectiveTime * 60 * spec.cruiseSpeed;
};

/**
 * フォーマット済みのスペック情報を取得（UI表示用）
 * @param {string} droneId - ドローンID
 * @returns {Object} フォーマット済みスペック
 */
export const getFormattedSpecs = (droneId) => {
  const spec = getDroneSpecs(droneId);
  if (!spec) return null;

  const rangeKm = (spec.maxRange / 1000).toFixed(1);

  return {
    model: spec.model,
    icon: spec.icon,
    description: spec.description,
    flightTime: `${spec.maxFlightTime}分`,
    effectiveTime: `${spec.effectiveFlightTime.toFixed(0)}分`,
    cruiseSpeed: `${spec.cruiseSpeed}m/s`,
    maxRange: `${rangeKm}km`,
    windResistance: `${spec.windResistance}m/s`,
    rtk: spec.rtk ? '対応' : '非対応',
    thermal: spec.thermalCamera ? '搭載' : 'なし',
  };
};

/**
 * 設定をデフォルトにリセット
 */
export const resetRouteSettings = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('storage'));
  } catch (error) {
    console.warn('Failed to reset route settings:', error);
  }
};

export { DRONE_SPECS, DEFAULT_ROUTE_SETTINGS };
