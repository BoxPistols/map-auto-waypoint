/**
 * リスク判定サービス (後方互換のファサード)
 *
 * 実装は src/services/risk/ 配下に機能別ファイルとして分割済み。
 * 既存の `import { ... } from './riskService'` を維持するため re-export する。
 */

export * from './risk';
