/**
 * プラットフォーム検出ユーティリティ
 *
 * OSに応じたキー表記（Mac: ⌘ / Windows/Linux: Ctrl）を
 * 一元管理するため、UI上のキー名はハードコードせずこのモジュール経由で取得する。
 */

/**
 * 実行環境が macOS かどうかを判定する
 * - userAgentData (新しいAPI) を優先
 * - フォールバックとして navigator.platform / userAgent を使用
 *
 * @returns {boolean}
 */
export const isMac = () => {
  if (typeof navigator === 'undefined') return false

  // 新しい User-Agent Client Hints API
  if (navigator.userAgentData?.platform) {
    return navigator.userAgentData.platform.toLowerCase().includes('mac')
  }

  // Legacy: navigator.platform（非推奨だがまだ広く使える）
  if (navigator.platform) {
    return /mac/i.test(navigator.platform)
  }

  // 最終フォールバック: userAgent
  return /Macintosh|Mac OS X/i.test(navigator.userAgent || '')
}

/**
 * モディファイアキーの表示名
 * Mac: ⌘ (Command) / その他: Ctrl
 */
export const MOD_KEY_SYMBOL = isMac() ? '⌘' : 'Ctrl'

/**
 * モディファイアキーのラベル（音声読み上げ・aria-label用）
 * Mac: Command / その他: Control
 */
export const MOD_KEY_LABEL = isMac() ? 'Command' : 'Control'

/**
 * Shift キー表記
 */
export const SHIFT_KEY_SYMBOL = isMac() ? '⇧' : 'Shift'

/**
 * キーの組み合わせを表示用文字列にフォーマット
 *
 * @example
 *   formatShortcut(['mod', 'K']) // '⌘K' (Mac) or 'Ctrl+K' (Win)
 *   formatShortcut(['mod', 'shift', 'Z']) // '⌘⇧Z' (Mac) or 'Ctrl+Shift+Z' (Win)
 *
 * @param {Array<'mod'|'shift'|'alt'|string>} keys - キーの配列
 * @returns {string}
 */
export const formatShortcut = (keys) => {
  const mac = isMac()
  const parts = keys.map((k) => {
    if (k === 'mod') return MOD_KEY_SYMBOL
    if (k === 'shift') return SHIFT_KEY_SYMBOL
    if (k === 'alt') return mac ? '⌥' : 'Alt'
    return k
  })
  return mac ? parts.join('') : parts.join('+')
}

/**
 * イベントが Mod+<key> にマッチするかを判定
 * Mac: metaKey / その他: ctrlKey
 *
 * @param {KeyboardEvent} e
 * @param {string} key - キー名（大文字小文字無視）
 * @returns {boolean}
 */
export const isModKey = (e, key) => {
  const modPressed = isMac() ? e.metaKey : e.ctrlKey
  return modPressed && e.key.toLowerCase() === key.toLowerCase()
}
