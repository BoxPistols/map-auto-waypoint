/**
 * テーマ管理サービス
 * ダークモード/ライトモードの切り替えをlocalStorageで管理
 */

const THEME_KEY = 'app_theme';

export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark'
};

/**
 * 現在のテーマを取得
 * @returns {string} 'light' | 'dark'
 */
export const getTheme = () => {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved && Object.values(THEMES).includes(saved)) {
    return saved;
  }
  // システム設定をチェック
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return THEMES.DARK;
  }
  return THEMES.LIGHT;
};

/**
 * テーマを設定
 * @param {string} theme - 'light' | 'dark'
 */
export const setTheme = (theme) => {
  if (!Object.values(THEMES).includes(theme)) {
    console.warn(`Invalid theme: ${theme}`);
    return;
  }
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
};

/**
 * テーマを切り替え
 * @returns {string} 新しいテーマ
 */
export const toggleTheme = () => {
  const current = getTheme();
  const next = current === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
  setTheme(next);
  return next;
};

/**
 * テーマをDOMに適用
 * @param {string} theme
 */
export const applyTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme);
};

/**
 * 初期化 - アプリ起動時に呼び出す
 */
export const initTheme = () => {
  const theme = getTheme();
  applyTheme(theme);
  return theme;
};
