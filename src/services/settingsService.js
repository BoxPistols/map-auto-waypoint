/**
 * アプリケーション設定サービス
 * ユーザー設定をlocalStorageに保存・読み込み
 */

const SETTINGS_KEY = 'drone_waypoint_settings';

// デフォルト設定
const DEFAULT_SETTINGS = {
  // DID回避モード: DID内のWPに対して回避位置をサジェストするか
  // デフォルトfalse: ユーザーが明示的に有効化する必要あり
  didAvoidanceMode: false,
  // DID警告のみモード: 回避位置を提案せず警告のみ表示（許可申請前提）
  // デフォルトfalse: 両方OFFでDIDは無視される
  didWarningOnlyMode: false,
  // DID回避距離（メートル）: DID境界からどれだけ離れた位置を推奨するか
  didAvoidanceDistance: 100,
  // 空港回避マージン（メートル）
  airportAvoidanceMargin: 300,
  // 禁止区域回避マージン（メートル）
  prohibitedAvoidanceMargin: 300,
  // Waypoint番号体系: 'global'(全体連番) | 'perPolygon'(ポリゴンごと1から)
  waypointNumberingMode: 'global',
};

/**
 * 全設定を取得
 * @returns {Object} 設定オブジェクト
 */
export const getSettings = () => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.warn('[SettingsService] Failed to load settings:', e);
  }
  return { ...DEFAULT_SETTINGS };
};

/**
 * 設定を保存
 * @param {Object} settings - 保存する設定
 */
export const saveSettings = (settings) => {
  try {
    const current = getSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    // storage イベントを発火して他のコンポーネントに通知
    window.dispatchEvent(new Event('storage'));
    return updated;
  } catch (e) {
    console.warn('[SettingsService] Failed to save settings:', e);
    return null;
  }
};

/**
 * 特定の設定値を取得
 * @param {string} key - 設定キー
 * @returns {unknown} 設定値
 */
export const getSetting = (key) => {
  const settings = getSettings();
  return settings[key];
};

/**
 * 特定の設定値を保存
 * @param {string} key - 設定キー
 * @param {unknown} value - 設定値
 */
export const setSetting = (key, value) => {
  return saveSettings({ [key]: value });
};

/**
 * DID回避モードが有効か確認
 * @returns {boolean}
 */
export const isDIDAvoidanceModeEnabled = () => {
  return getSetting('didAvoidanceMode') === true;
};

/**
 * DID回避モードを設定
 * @param {boolean} enabled
 */
export const setDIDAvoidanceMode = (enabled) => {
  return setSetting('didAvoidanceMode', enabled);
};

/**
 * Waypoint番号体系を取得
 * @returns {'global' | 'perPolygon'}
 */
export const getWaypointNumberingMode = () => {
  return getSetting('waypointNumberingMode') || 'global';
};

/**
 * Waypoint番号体系を設定
 * @param {'global' | 'perPolygon'} mode
 */
export const setWaypointNumberingMode = (mode) => {
  return setSetting('waypointNumberingMode', mode);
};

/**
 * 設定をリセット
 */
export const resetSettings = () => {
  localStorage.removeItem(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS };
};

/**
 * Waypoint番号体系モードを取得
 * @returns {'global' | 'perPolygon'} 番号体系モード
 */
export const getWaypointNumberingMode = () => {
  return getSetting('waypointNumberingMode') || 'global';
};
