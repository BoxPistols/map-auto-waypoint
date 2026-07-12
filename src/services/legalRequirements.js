/**
 * ドローン飛行に関する法的要件チェックサービス (後方互換のファサード)
 *
 * 実装は src/services/legal/ 配下に法令カテゴリ別ファイルとして分割済み。
 * 既存の `import { ... } from './legalRequirements'` を維持するため re-export する。
 */

export {
  checkAviationLaw,
  checkSmallUASProhibitionLaw,
  checkLandManagerRules,
  checkAllLegalRequirements,
  generateExternalLinks,
  generateRequiredProcedures,
} from './legal';

export { default } from './legal';
